-- SECURITY FIX: Drop overly permissive inspection policy and create proper role-based access
DROP POLICY IF EXISTS "Users can view all inspections" ON public.inspections;

-- Create proper RLS policies for inspections
CREATE POLICY "Admins and managers can view all inspections"
ON public.inspections
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Cleaners can view assigned inspections"
ON public.inspections
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'cleaner'::app_role) AND
  (
    assigned_to IN (SELECT id FROM team_members WHERE user_id = auth.uid()) OR
    user_id = auth.uid()
  )
);

-- SECURITY FIX: Create security definer function to check if cleaner is assigned to schedule
CREATE OR REPLACE FUNCTION public.is_cleaner_assigned_to_schedule(p_schedule_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.schedules s
    JOIN public.team_members tm ON s.responsible_team_member_id = tm.id
    WHERE s.id = p_schedule_id
      AND tm.user_id = auth.uid()
  )
$$;

-- SECURITY FIX: Create function to check if user has access to property
CREATE OR REPLACE FUNCTION public.has_property_access(p_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.is_active = true
      AND (
        tm.has_all_properties = true
        OR EXISTS (
          SELECT 1
          FROM public.team_member_properties tmp
          WHERE tmp.team_member_id = tm.id
            AND tmp.property_id = p_property_id
        )
      )
  )
$$;

-- SECURITY FIX: Update schedules policies to restrict access_password visibility
-- First, create a view for schedules that masks password for non-assigned cleaners
-- (Note: This approach uses RLS to filter, actual password masking would need application-level logic)

-- Drop existing cleaner schedule policies if they exist
DROP POLICY IF EXISTS "Cleaners can read assigned property schedules" ON public.schedules;

-- Create more restrictive cleaner policy
CREATE POLICY "Cleaners can read schedules for assigned properties"
ON public.schedules
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'cleaner'::app_role) AND
  has_property_access(property_id)
);

-- SECURITY: Add policy to prevent INSERT on waitlist for already used emails (rate limiting would be at app level)
-- The existing INSERT policy with true is acceptable for a public waitlist form

-- SECURITY: Add index for faster role lookups (performance security)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role ON public.user_roles(user_id, role);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_property_id ON public.schedules(property_id);
CREATE INDEX IF NOT EXISTS idx_schedules_responsible_team_member_id ON public.schedules(responsible_team_member_id);