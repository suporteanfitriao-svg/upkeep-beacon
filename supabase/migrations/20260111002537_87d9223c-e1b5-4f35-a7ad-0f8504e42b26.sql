
-- 1.2: Add address fields to team_members
ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS address_cep text,
ADD COLUMN IF NOT EXISTS address_street text,
ADD COLUMN IF NOT EXISTS address_number text,
ADD COLUMN IF NOT EXISTS address_complement text,
ADD COLUMN IF NOT EXISTS address_district text,
ADD COLUMN IF NOT EXISTS address_city text,
ADD COLUMN IF NOT EXISTS address_state text;

-- 2.2 & 3.1: Add activated_at to track first activation
ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS activated_at timestamp with time zone;

-- Update activated_at for already active members
UPDATE public.team_members
SET activated_at = created_at
WHERE is_active = true AND activated_at IS NULL;

-- Add unique constraint on CPF (1.1)
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_cpf_unique 
ON public.team_members (cpf);

-- 2.1: Add password reset fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS reset_token_hash text,
ADD COLUMN IF NOT EXISTS reset_token_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS must_reset_password boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS activated_at timestamp with time zone;

-- Create audit log table for password resets and other actions
CREATE TABLE IF NOT EXISTS public.team_member_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_member_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  user_id uuid,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_member_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can read team member audit logs"
ON public.team_member_audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can insert audit logs
CREATE POLICY "Authenticated users can insert audit logs"
ON public.team_member_audit_logs
FOR INSERT
WITH CHECK (has_any_role(auth.uid()));
