-- Drop the existing permissive update policy for schedules
DROP POLICY IF EXISTS "All roles can update schedules" ON public.schedules;

-- Create separate policies for different roles

-- Admins and Managers can update any schedule field
CREATE POLICY "Admins and managers can update all schedules"
ON public.schedules
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Cleaners can only update status to 'cleaning' or 'completed' on schedules for their assigned properties
CREATE POLICY "Cleaners can update schedule status on assigned properties"
ON public.schedules
FOR UPDATE
USING (
  has_role(auth.uid(), 'cleaner'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
    AND tm.is_active = true
    AND (
      tm.has_all_properties = true OR
      EXISTS (
        SELECT 1 FROM public.team_member_properties tmp
        WHERE tmp.team_member_id = tm.id
        AND tmp.property_id = schedules.property_id
      )
    )
  )
);

-- Drop the existing read policy for schedules
DROP POLICY IF EXISTS "Authenticated users with roles can read schedules" ON public.schedules;

-- Admins and Managers can see all schedules
CREATE POLICY "Admins and managers can read all schedules"
ON public.schedules
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Cleaners can only see schedules for their assigned properties
CREATE POLICY "Cleaners can read assigned property schedules"
ON public.schedules
FOR SELECT
USING (
  has_role(auth.uid(), 'cleaner'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
    AND tm.is_active = true
    AND (
      tm.has_all_properties = true OR
      EXISTS (
        SELECT 1 FROM public.team_member_properties tmp
        WHERE tmp.team_member_id = tm.id
        AND tmp.property_id = schedules.property_id
      )
    )
  )
);