-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can insert auto release logs" ON public.auto_release_logs;

-- Create a more restrictive policy for edge function inserts
-- The edge function uses service role which bypasses RLS, so we need a policy for regular users
CREATE POLICY "System can insert auto release logs"
ON public.auto_release_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

-- Drop the overly permissive property config insert policy and recreate with proper check
DROP POLICY IF EXISTS "Admins and managers can insert property config audit logs" ON public.property_config_audit_logs;

CREATE POLICY "Admins and managers can insert their own property config audit logs"
ON public.property_config_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager')
  )
);