-- Add optional rules columns to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS auto_release_on_checkout boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS require_photo_per_category boolean NOT NULL DEFAULT false;

-- Create property config audit log table
CREATE TABLE IF NOT EXISTS public.property_config_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  team_member_id uuid REFERENCES public.team_members(id),
  role text NOT NULL,
  config_key text NOT NULL,
  previous_value text,
  new_value text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create auto-release audit log table
CREATE TABLE IF NOT EXISTS public.auto_release_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  action text NOT NULL DEFAULT 'liberacao_automatica_checkout',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.property_config_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_release_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for property_config_audit_logs (only admin/manager can view)
CREATE POLICY "Admins and managers can view property config audit logs"
ON public.property_config_audit_logs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admins and managers can insert property config audit logs"
ON public.property_config_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

-- RLS policies for auto_release_logs (only admin/manager can view)
CREATE POLICY "Admins and managers can view auto release logs"
ON public.auto_release_logs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

-- Service role can insert auto release logs (for edge function)
CREATE POLICY "Service role can insert auto release logs"
ON public.auto_release_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add index for performance on auto-release queries
CREATE INDEX IF NOT EXISTS idx_schedules_auto_release 
ON public.schedules(status, is_active, check_out_time, property_id) 
WHERE status = 'waiting' AND is_active = true;