-- ============================================================
-- ENHANCED ROW LEVEL SECURITY FOR MULTI-TENANT ISOLATION
-- ============================================================

-- R-GLOBAL-20: Create tenant context functions if not exist
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid AS $$
  SELECT COALESCE(
    current_setting('app.tenant_id', true)::uuid,
    auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid AS $$
  SELECT COALESCE(
    current_setting('app.user_id', true)::uuid,
    auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- R-GLOBAL-21: Function to check if user is admin or superadmin
CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role IN ('admin', 'superadmin')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- R-GLOBAL-22: Function to validate schedule state transition
CREATE OR REPLACE FUNCTION public.validate_schedule_state_change()
RETURNS TRIGGER AS $$
DECLARE
  allowed_transitions jsonb := '{
    "waiting": ["released", "cancelled"],
    "released": ["cleaning", "waiting"],
    "cleaning": ["completed", "released"],
    "completed": [],
    "cancelled": []
  }'::jsonb;
  allowed_states text[];
  user_role text;
BEGIN
  -- Skip if status not changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get allowed transitions
  allowed_states := ARRAY(
    SELECT jsonb_array_elements_text(allowed_transitions -> OLD.status)
  );

  -- Check if transition is allowed
  IF NOT (NEW.status = ANY(allowed_states)) THEN
    RAISE EXCEPTION 'Invalid state transition from % to %', OLD.status, NEW.status;
  END IF;

  -- Check if reverting (only admin can do this)
  IF (OLD.status = 'cleaning' AND NEW.status = 'released') OR
     (OLD.status = 'released' AND NEW.status = 'waiting') THEN
    
    SELECT role INTO user_role
    FROM public.user_roles
    WHERE user_id = auth.uid();
    
    IF user_role NOT IN ('admin', 'superadmin') THEN
      RAISE EXCEPTION 'Only admin can revert schedule status';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS validate_schedule_state_change_trigger ON schedules;
CREATE TRIGGER validate_schedule_state_change_trigger
  BEFORE UPDATE OF status ON schedules
  FOR EACH ROW
  EXECUTE FUNCTION validate_schedule_state_change();

-- R-GLOBAL-23: Create rate limiting table for edge functions
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(key)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

-- RLS on rate_limits (only internal access)
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access rate limits
CREATE POLICY "Service role only" ON rate_limits
  FOR ALL USING (false);

-- R-GLOBAL-24: Function to check and update rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_max_requests integer,
  p_window_seconds integer
)
RETURNS boolean AS $$
DECLARE
  v_record record;
  v_now timestamp with time zone := now();
  v_window_start timestamp with time zone := v_now - (p_window_seconds || ' seconds')::interval;
BEGIN
  -- Get or create rate limit record
  SELECT * INTO v_record
  FROM rate_limits
  WHERE key = p_key
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Create new record
    INSERT INTO rate_limits (key, count, window_start)
    VALUES (p_key, 1, v_now);
    RETURN true;
  END IF;

  -- Check if window expired
  IF v_record.window_start < v_window_start THEN
    -- Reset window
    UPDATE rate_limits
    SET count = 1, window_start = v_now
    WHERE key = p_key;
    RETURN true;
  END IF;

  -- Check limit
  IF v_record.count >= p_max_requests THEN
    RETURN false;
  END IF;

  -- Increment count
  UPDATE rate_limits
  SET count = count + 1
  WHERE key = p_key;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- R-GLOBAL-25: Cleanup old rate limit records (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- R-GLOBAL-26: Create webhook idempotency table
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  provider text NOT NULL,
  payload jsonb,
  processed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for idempotency checks
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed_at);

-- RLS on webhook_events
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Only admins can read webhook events
CREATE POLICY "Admins can read webhook events" ON webhook_events
  FOR SELECT USING (is_admin_or_superadmin());

-- Service role can insert
CREATE POLICY "Service can insert webhook events" ON webhook_events
  FOR INSERT WITH CHECK (true);

-- R-GLOBAL-27: Function to check webhook idempotency
CREATE OR REPLACE FUNCTION public.check_webhook_idempotency(
  p_event_id text,
  p_event_type text,
  p_provider text,
  p_payload jsonb DEFAULT '{}'
)
RETURNS boolean AS $$
DECLARE
  v_exists boolean;
BEGIN
  -- Check if already processed
  SELECT EXISTS(
    SELECT 1 FROM webhook_events WHERE event_id = p_event_id
  ) INTO v_exists;

  IF v_exists THEN
    RETURN false; -- Already processed
  END IF;

  -- Insert new event
  INSERT INTO webhook_events (event_id, event_type, provider, payload)
  VALUES (p_event_id, p_event_type, p_provider, p_payload);

  RETURN true; -- New event, process it
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- R-GLOBAL-28: Cleanup old webhook events (keep 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_webhook_events()
RETURNS void AS $$
BEGIN
  DELETE FROM webhook_events
  WHERE processed_at < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- R-GLOBAL-29: Create encrypted secrets table for integrations
CREATE TABLE IF NOT EXISTS public.encrypted_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  encrypted_value text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- RLS on encrypted_secrets
ALTER TABLE encrypted_secrets ENABLE ROW LEVEL SECURITY;

-- Users can only access their own secrets
CREATE POLICY "Users can read own secrets" ON encrypted_secrets
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own secrets" ON encrypted_secrets
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own secrets" ON encrypted_secrets
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own secrets" ON encrypted_secrets
  FOR DELETE USING (user_id = auth.uid());

-- R-GLOBAL-30: Add lock version to schedules for optimistic locking
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schedules' AND column_name = 'lock_version'
  ) THEN
    ALTER TABLE schedules ADD COLUMN lock_version integer NOT NULL DEFAULT 1;
  END IF;
END $$;

-- R-GLOBAL-31: Function to update with optimistic lock
CREATE OR REPLACE FUNCTION public.update_schedule_with_lock(
  p_schedule_id uuid,
  p_updates jsonb,
  p_current_version integer
)
RETURNS jsonb AS $$
DECLARE
  v_result record;
BEGIN
  -- Try to update with version check
  UPDATE schedules
  SET 
    status = COALESCE((p_updates->>'status'), status),
    check_in_time = COALESCE((p_updates->>'check_in_time')::timestamptz, check_in_time),
    check_out_time = COALESCE((p_updates->>'check_out_time')::timestamptz, check_out_time),
    notes = COALESCE((p_updates->>'notes'), notes),
    cleaner_observations = COALESCE((p_updates->>'cleaner_observations'), cleaner_observations),
    checklist_state = COALESCE((p_updates->>'checklist_state')::jsonb, checklist_state),
    category_photos = COALESCE((p_updates->>'category_photos')::jsonb, category_photos),
    lock_version = lock_version + 1,
    updated_at = now()
  WHERE id = p_schedule_id
    AND lock_version = p_current_version
  RETURNING * INTO v_result;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Conflict - resource was modified by another user'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'data', to_jsonb(v_result)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;