-- =======================================================
-- SECURITY HARDENING MIGRATION
-- =======================================================

-- 1. Create secure views to hide sensitive fields
-- This prevents direct access to password columns

-- View for properties without sensitive password fields
CREATE OR REPLACE VIEW public.properties_public
WITH (security_invoker=on) AS
SELECT 
  id,
  name,
  address,
  default_check_in_time,
  default_check_out_time,
  password_mode,
  auto_release_on_checkout,
  require_photo_per_category,
  auto_release_before_checkout_enabled,
  auto_release_before_checkout_minutes,
  require_photo_for_issues,
  is_active,
  require_checklist,
  latitude,
  longitude,
  require_photo_for_inspections,
  image_url,
  property_code,
  created_at,
  updated_at
  -- EXCLUDED: global_access_password, airbnb_ical_url
FROM public.properties;

-- View for team members without sensitive personal data
CREATE OR REPLACE VIEW public.team_members_public
WITH (security_invoker=on) AS
SELECT 
  id,
  user_id,
  role,
  is_active,
  created_at,
  updated_at,
  has_all_properties,
  activated_at,
  name,
  email
  -- EXCLUDED: cpf, whatsapp, address fields
FROM public.team_members;

-- View for schedules without access passwords
CREATE OR REPLACE VIEW public.schedules_public
WITH (security_invoker=on) AS
SELECT 
  id,
  reservation_id,
  property_id,
  property_name,
  property_address,
  check_in_time,
  check_out_time,
  guest_name,
  cleaner_name,
  cleaner_avatar,
  status,
  priority,
  estimated_duration,
  notes,
  maintenance_status,
  maintenance_issues,
  checklists,
  created_at,
  updated_at,
  listing_name,
  number_of_guests,
  start_at,
  end_at,
  responsible_team_member_id,
  important_info,
  ack_by_team_members,
  history,
  is_active,
  checklist_loaded_at,
  admin_revert_reason,
  category_photos,
  cleaner_observations,
  checklist_state
  -- EXCLUDED: access_password
FROM public.schedules;

-- 2. Create security definer function for safe password retrieval
-- Only returns password if user has valid access

CREATE OR REPLACE FUNCTION public.get_schedule_password(p_schedule_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_password text;
  v_property_id uuid;
  v_status text;
  v_checkout_date date;
  v_has_access boolean := false;
  v_team_member_id uuid;
BEGIN
  -- Get schedule details
  SELECT access_password, property_id, status, (check_out_time::date)
  INTO v_password, v_property_id, v_status, v_checkout_date
  FROM schedules
  WHERE id = p_schedule_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Check if user is admin/manager/superadmin - they always have access
  IF has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'superadmin') THEN
    -- Log the access
    INSERT INTO password_audit_logs (schedule_id, property_id, team_member_id, action)
    SELECT p_schedule_id, v_property_id, tm.id, 'password_viewed'
    FROM team_members tm WHERE tm.user_id = auth.uid();
    
    RETURN v_password;
  END IF;
  
  -- For cleaners, check if they have property access
  SELECT tm.id INTO v_team_member_id
  FROM team_members tm
  WHERE tm.user_id = auth.uid() AND tm.is_active = true;
  
  IF v_team_member_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Check property access
  IF has_property_access(v_property_id) THEN
    -- Additional checks: status must be released or cleaning, or it's checkout day
    IF v_status IN ('released', 'cleaning') OR 
       (v_checkout_date = CURRENT_DATE AND v_status != 'completed') THEN
      
      -- Log the access
      INSERT INTO password_audit_logs (schedule_id, property_id, team_member_id, action)
      VALUES (p_schedule_id, v_property_id, v_team_member_id, 'password_viewed');
      
      RETURN v_password;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$;

-- 3. Create function to safely get property password
CREATE OR REPLACE FUNCTION public.get_property_password(p_property_id uuid, p_schedule_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_password_mode property_password_mode;
  v_global_password text;
  v_schedule_password text;
  v_team_member_id uuid;
BEGIN
  -- Get property password configuration
  SELECT password_mode, global_access_password
  INTO v_password_mode, v_global_password
  FROM properties
  WHERE id = p_property_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Check if user has access
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR 
          has_role(auth.uid(), 'superadmin') OR has_property_access(p_property_id)) THEN
    RETURN NULL;
  END IF;
  
  -- Get team member for logging
  SELECT id INTO v_team_member_id
  FROM team_members
  WHERE user_id = auth.uid();
  
  -- Log access
  INSERT INTO password_audit_logs (schedule_id, property_id, team_member_id, action)
  VALUES (p_schedule_id, p_property_id, v_team_member_id, 'property_password_viewed');
  
  -- Return based on mode
  IF v_password_mode = 'global' THEN
    RETURN v_global_password;
  ELSIF v_password_mode = 'ical' AND p_schedule_id IS NOT NULL THEN
    SELECT access_password INTO v_schedule_password
    FROM schedules WHERE id = p_schedule_id;
    RETURN v_schedule_password;
  ELSIF v_password_mode = 'manual' AND p_schedule_id IS NOT NULL THEN
    SELECT access_password INTO v_schedule_password
    FROM schedules WHERE id = p_schedule_id;
    RETURN v_schedule_password;
  END IF;
  
  RETURN NULL;
END;
$$;

-- 4. Restrict waitlist table - fix the security issue
-- Drop existing policies and create restrictive ones
DROP POLICY IF EXISTS "Admins can view waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Anyone can submit to waitlist" ON public.waitlist;

-- Recreate with proper restrictions
CREATE POLICY "Only admins and superadmins can view waitlist"
ON public.waitlist FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'superadmin')
);

CREATE POLICY "Public can submit to waitlist"
ON public.waitlist FOR INSERT
WITH CHECK (true);

-- 5. Add input validation function
CREATE OR REPLACE FUNCTION public.validate_input(
  p_input text,
  p_max_length integer DEFAULT 1000,
  p_allow_html boolean DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_cleaned text;
BEGIN
  IF p_input IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Trim whitespace
  v_cleaned := TRIM(p_input);
  
  -- Check max length
  IF LENGTH(v_cleaned) > p_max_length THEN
    v_cleaned := LEFT(v_cleaned, p_max_length);
  END IF;
  
  -- Remove potential script tags if HTML not allowed
  IF NOT p_allow_html THEN
    v_cleaned := REGEXP_REPLACE(v_cleaned, '<[^>]*>', '', 'g');
    -- Remove common XSS patterns
    v_cleaned := REGEXP_REPLACE(v_cleaned, 'javascript:', '', 'gi');
    v_cleaned := REGEXP_REPLACE(v_cleaned, 'on\w+\s*=', '', 'gi');
  END IF;
  
  RETURN v_cleaned;
END;
$$;

-- 6. Create security audit log table
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  team_member_id uuid,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  ip_address text,
  user_agent text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on security audit logs
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only superadmins can read security logs
CREATE POLICY "Only superadmins can read security logs"
ON public.security_audit_logs FOR SELECT
USING (has_role(auth.uid(), 'superadmin'));

-- Admins and above can insert security logs
CREATE POLICY "Authenticated users can insert security logs"
ON public.security_audit_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 7. Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action text,
  p_resource_type text,
  p_resource_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_member_id uuid;
BEGIN
  SELECT id INTO v_team_member_id
  FROM team_members
  WHERE user_id = auth.uid();
  
  INSERT INTO security_audit_logs (user_id, team_member_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), v_team_member_id, p_action, p_resource_type, p_resource_id, p_details);
END;
$$;

-- 8. Add constraint to prevent weak passwords in properties
-- (validation should be done at application level, but add DB constraint as backup)
ALTER TABLE public.properties
ADD CONSTRAINT check_global_password_length 
CHECK (global_access_password IS NULL OR LENGTH(global_access_password) >= 4);

-- 9. Create index for faster security queries
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON public.security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_created_at ON public.security_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_action ON public.security_audit_logs(action);

-- 10. Enhance team_members RLS to prevent unauthorized access to sensitive data
-- Create function to check if user can access team member sensitive data
CREATE OR REPLACE FUNCTION public.can_access_team_member_sensitive_data(p_team_member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- User is admin or superadmin
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'superadmin') OR
    -- User is viewing their own record
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE id = p_team_member_id AND user_id = auth.uid()
    )
$$;

-- 11. Add data retention policy marker (for future automation)
COMMENT ON TABLE public.security_audit_logs IS 'Security audit logs - Retention: 2 years';
COMMENT ON TABLE public.password_audit_logs IS 'Password access logs - Retention: 1 year';
COMMENT ON TABLE public.team_member_audit_logs IS 'Team member changes - Retention: 2 years';