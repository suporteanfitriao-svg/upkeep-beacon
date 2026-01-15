-- Create a security definer function to check if a schedule is completed
CREATE OR REPLACE FUNCTION public.is_schedule_completed(p_schedule_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.schedules
    WHERE id = p_schedule_id
      AND status = 'completed'
  )
$$;

-- Drop the existing ALL policy for admins/managers
DROP POLICY IF EXISTS "Admins and managers can manage all maintenance issues" ON public.maintenance_issues;

-- Create separate policies for admins/managers with DELETE protection
-- SELECT policy
CREATE POLICY "Admins and managers can read all maintenance issues"
ON public.maintenance_issues
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
);

-- INSERT policy
CREATE POLICY "Admins and managers can insert maintenance issues"
ON public.maintenance_issues
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
);

-- UPDATE policy
CREATE POLICY "Admins and managers can update maintenance issues"
ON public.maintenance_issues
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
);

-- DELETE policy - only allow if schedule is NOT completed
CREATE POLICY "Admins and managers can delete maintenance issues if not completed"
ON public.maintenance_issues
FOR DELETE
TO authenticated
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  AND (schedule_id IS NULL OR NOT is_schedule_completed(schedule_id))
);