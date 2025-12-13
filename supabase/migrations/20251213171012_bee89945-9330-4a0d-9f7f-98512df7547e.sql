-- Fix 1: Reservations table - filter by property assignment for cleaners
DROP POLICY IF EXISTS "Authenticated users with roles can read reservations" ON public.reservations;

-- Admins and Managers can see all reservations
CREATE POLICY "Admins and managers can read all reservations"
ON public.reservations
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Cleaners can only see reservations for their assigned properties
CREATE POLICY "Cleaners can read assigned property reservations"
ON public.reservations
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
        AND tmp.property_id = reservations.property_id
      )
    )
  )
);

-- Fix 2: Add missing SELECT policies to team_member_properties
CREATE POLICY "Managers can view team member properties"
ON public.team_member_properties
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Users can view own property assignments"
ON public.team_member_properties
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.id = team_member_properties.team_member_id
    AND team_members.user_id = auth.uid()
  )
);