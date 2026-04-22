
-- ============================================================
-- 1. SECURE append_schedule_history: prevent impersonation + cross-property writes
-- ============================================================
CREATE OR REPLACE FUNCTION public.append_schedule_history(
  p_schedule_id uuid,
  p_team_member_id uuid,
  p_action text,
  p_from_status text,
  p_to_status text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_member_name text;
  v_user_role text;
  v_new_event jsonb;
  v_property_id uuid;
  v_caller_team_member_id uuid;
BEGIN
  -- 1. Caller must be an active team member
  SELECT id INTO v_caller_team_member_id
  FROM team_members
  WHERE user_id = auth.uid() AND is_active = true;

  IF v_caller_team_member_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: no active team member for current user';
  END IF;

  -- 2. Prevent impersonation - allow admin/superadmin to log on behalf, otherwise must match
  IF v_caller_team_member_id <> p_team_member_id
     AND NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized: cannot append history as a different team member';
  END IF;

  -- 3. Look up schedule's property
  SELECT property_id INTO v_property_id
  FROM schedules
  WHERE id = p_schedule_id;

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'Schedule not found';
  END IF;

  -- 4. Caller must have access to the property
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'superadmin'::app_role)
    OR has_property_access(v_property_id)
  ) THEN
    RAISE EXCEPTION 'Unauthorized: no access to schedule property';
  END IF;

  -- Continue with original logic
  SELECT name INTO v_team_member_name
  FROM team_members
  WHERE id = p_team_member_id;

  SELECT ur.role::text INTO v_user_role
  FROM user_roles ur
  JOIN team_members tm ON tm.user_id = ur.user_id
  WHERE tm.id = p_team_member_id;

  v_new_event := jsonb_build_object(
    'timestamp', now(),
    'team_member_id', p_team_member_id,
    'team_member_name', v_team_member_name,
    'role', v_user_role,
    'action', p_action,
    'from_status', p_from_status,
    'to_status', p_to_status,
    'payload', p_payload
  );

  UPDATE schedules
  SET history = COALESCE(history, '[]'::jsonb) || v_new_event,
      updated_at = now()
  WHERE id = p_schedule_id;
END;
$$;

-- ============================================================
-- 2. STORAGE: Tighten SELECT on private photo buckets (owner folder OR admin/manager)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read checklist photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read cleaning standards" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read inventory photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read issue photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read maintenance photos" ON storage.objects;

CREATE POLICY "Scoped read on private app buckets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id IN (
    'inventory-photos','inspection-photos','maintenance-photos',
    'issue-photos','checklist-photos','cleaning-standards'
  )
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'superadmin'::app_role)
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- ============================================================
-- 3. STORAGE: Tighten broad INSERT policies for sensitive buckets
-- Drop any "Authenticated users can upload ..." style policies that don't check role.
-- ============================================================
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND cmd = 'INSERT'
      AND policyname ILIKE 'Authenticated users can upload%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Role-aware uploads for the sensitive buckets (kept narrow; existing owner-scoped policy already enforces folder ownership)
CREATE POLICY "Role-scoped uploads on sensitive buckets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('inspection-photos','issue-photos','checklist-photos','cleaning-standards','maintenance-photos','inventory-photos')
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'superadmin'::app_role)
    OR has_role(auth.uid(), 'cleaner'::app_role)
  )
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- 4. REALTIME: scope channel subscriptions by topic ownership
-- ============================================================
-- Drop existing broad realtime policies if present
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'realtime' AND tablename = 'messages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON realtime.messages', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Helper: allow admin/manager/superadmin everywhere; cleaners only on topics they have access to.
-- Convention: topics that target a property MUST be named like 'property:<uuid>:<channel>'.
-- Generic topics (no 'property:' prefix) are allowed for any active team member (low-risk metadata channels).
CREATE POLICY "Scoped realtime read"
ON realtime.messages FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'superadmin'::app_role)
  OR (
    -- Property-scoped topic: must have access
    realtime.topic() LIKE 'property:%'
    AND has_property_access(
      NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid
    )
  )
  OR (
    -- Generic non-property topics: allow any active team member
    realtime.topic() NOT LIKE 'property:%'
    AND EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid() AND tm.is_active = true
    )
  )
);

CREATE POLICY "Scoped realtime write"
ON realtime.messages FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'superadmin'::app_role)
  OR (
    realtime.topic() LIKE 'property:%'
    AND has_property_access(
      NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid
    )
  )
  OR (
    realtime.topic() NOT LIKE 'property:%'
    AND EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid() AND tm.is_active = true
    )
  )
);

-- ============================================================
-- 5. password_reset_tokens — explicit deny SELECT for normal roles
-- ============================================================
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No client read on password_reset_tokens" ON public.password_reset_tokens;
CREATE POLICY "No client read on password_reset_tokens"
ON public.password_reset_tokens FOR SELECT
TO authenticated, anon
USING (false);
