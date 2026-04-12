
-- Allow managers to insert team_member_properties
CREATE POLICY "Managers can insert team member properties"
ON public.team_member_properties
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- Allow managers to delete team_member_properties
CREATE POLICY "Managers can delete team member properties"
ON public.team_member_properties
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));
