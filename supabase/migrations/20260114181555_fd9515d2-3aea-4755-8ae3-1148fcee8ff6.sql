-- Fix overly permissive RLS policies for inspections

-- Drop the permissive UPDATE policy
DROP POLICY IF EXISTS "Users can update inspections" ON public.inspections;

-- Create more restrictive UPDATE policy (only admins/managers or assigned user)
CREATE POLICY "Users can update inspections"
ON public.inspections
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'manager')
  OR assigned_to IN (
    SELECT id FROM public.team_members WHERE user_id = auth.uid()
  )
);