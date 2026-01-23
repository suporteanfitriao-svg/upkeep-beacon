-- Update RLS policies to include superadmin role

-- Schedules policies
DROP POLICY IF EXISTS "Admins and managers can read all schedules" ON public.schedules;
CREATE POLICY "Admins managers and superadmins can read all schedules" 
ON public.schedules FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

DROP POLICY IF EXISTS "Admins and managers can update all schedules" ON public.schedules;
CREATE POLICY "Admins managers and superadmins can update all schedules" 
ON public.schedules FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

DROP POLICY IF EXISTS "Admins can delete schedules" ON public.schedules;
CREATE POLICY "Admins and superadmins can delete schedules" 
ON public.schedules FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

DROP POLICY IF EXISTS "Managers and admins can insert schedules" ON public.schedules;
CREATE POLICY "Managers admins and superadmins can insert schedules" 
ON public.schedules FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Properties policies
DROP POLICY IF EXISTS "Managers and admins can insert properties" ON public.properties;
CREATE POLICY "Managers admins and superadmins can insert properties" 
ON public.properties FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

DROP POLICY IF EXISTS "Managers and admins can update properties" ON public.properties;
CREATE POLICY "Managers admins and superadmins can update properties" 
ON public.properties FOR UPDATE 
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

DROP POLICY IF EXISTS "Admins can delete properties" ON public.properties;
CREATE POLICY "Admins and superadmins can delete properties" 
ON public.properties FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Inspections policies
DROP POLICY IF EXISTS "Admins and managers can view all inspections" ON public.inspections;
CREATE POLICY "Admins managers and superadmins can view all inspections" 
ON public.inspections FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

DROP POLICY IF EXISTS "Users can update inspections" ON public.inspections;
CREATE POLICY "Users can update inspections" 
ON public.inspections FOR UPDATE 
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role) 
  OR has_role(auth.uid(), 'superadmin'::app_role)
  OR assigned_to IN (SELECT id FROM team_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can delete inspections" ON public.inspections;
CREATE POLICY "Users can delete inspections" 
ON public.inspections FOR DELETE 
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Maintenance issues policies
DROP POLICY IF EXISTS "Admins and managers can read all maintenance issues" ON public.maintenance_issues;
CREATE POLICY "Admins managers and superadmins can read all maintenance issues" 
ON public.maintenance_issues FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

DROP POLICY IF EXISTS "Admins and managers can insert maintenance issues" ON public.maintenance_issues;
CREATE POLICY "Admins managers and superadmins can insert maintenance issues" 
ON public.maintenance_issues FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

DROP POLICY IF EXISTS "Admins and managers can update maintenance issues" ON public.maintenance_issues;
CREATE POLICY "Admins managers and superadmins can update maintenance issues" 
ON public.maintenance_issues FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

DROP POLICY IF EXISTS "Admins and managers can delete maintenance issues if not comple" ON public.maintenance_issues;
CREATE POLICY "Admins managers and superadmins can delete maintenance issues" 
ON public.maintenance_issues FOR DELETE 
USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)) 
  AND (schedule_id IS NULL OR NOT is_schedule_completed(schedule_id)));

-- Team members policies
DROP POLICY IF EXISTS "Admins can manage team members" ON public.team_members;
CREATE POLICY "Admins and superadmins can manage team members" 
ON public.team_members FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Team member properties policies
DROP POLICY IF EXISTS "Admins can manage team member properties" ON public.team_member_properties;
CREATE POLICY "Admins and superadmins can manage team member properties" 
ON public.team_member_properties FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- User roles policies
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins and superadmins can manage all roles" 
ON public.user_roles FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Profiles policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins and superadmins can view all profiles" 
ON public.profiles FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Reservations policies
DROP POLICY IF EXISTS "Admins and managers can read all reservations" ON public.reservations;
CREATE POLICY "Admins managers and superadmins can read all reservations" 
ON public.reservations FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

DROP POLICY IF EXISTS "Managers and admins can insert reservations" ON public.reservations;
CREATE POLICY "Managers admins and superadmins can insert reservations" 
ON public.reservations FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

DROP POLICY IF EXISTS "Managers and admins can update reservations" ON public.reservations;
CREATE POLICY "Managers admins and superadmins can update reservations" 
ON public.reservations FOR UPDATE 
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

DROP POLICY IF EXISTS "Admins can delete reservations" ON public.reservations;
CREATE POLICY "Admins and superadmins can delete reservations" 
ON public.reservations FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));