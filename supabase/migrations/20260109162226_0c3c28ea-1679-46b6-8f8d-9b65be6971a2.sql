-- Create enum for password mode
CREATE TYPE public.property_password_mode AS ENUM ('ical', 'manual');

-- Add password_mode to properties table
ALTER TABLE public.properties 
ADD COLUMN password_mode public.property_password_mode NOT NULL DEFAULT 'ical';

-- Add access_password to schedules table (for manual mode)
ALTER TABLE public.schedules 
ADD COLUMN access_password text;

-- Create password audit logs table (append-only)
CREATE TABLE public.password_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES public.schedules(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  team_member_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('viewed', 'created', 'updated')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on password_audit_logs
ALTER TABLE public.password_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can read password audit logs"
ON public.password_audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Any authenticated user with role can insert audit logs (via security definer function)
CREATE POLICY "Authenticated users can insert audit logs"
ON public.password_audit_logs
FOR INSERT
WITH CHECK (has_any_role(auth.uid()));

-- Create index for audit log queries
CREATE INDEX idx_password_audit_logs_schedule ON public.password_audit_logs(schedule_id);
CREATE INDEX idx_password_audit_logs_property ON public.password_audit_logs(property_id);
CREATE INDEX idx_password_audit_logs_created ON public.password_audit_logs(created_at DESC);

-- Create function to log password actions (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.log_password_action(
  p_schedule_id uuid,
  p_property_id uuid,
  p_team_member_id uuid,
  p_action text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO password_audit_logs (schedule_id, property_id, team_member_id, action)
  VALUES (p_schedule_id, p_property_id, p_team_member_id, p_action);
END;
$$;