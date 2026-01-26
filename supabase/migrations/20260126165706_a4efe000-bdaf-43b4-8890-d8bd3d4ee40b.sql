
-- Drop existing SELECT policies on properties
DROP POLICY IF EXISTS "Authenticated users with roles can read properties" ON public.properties;

-- Create new property access policy: superadmin sees all, admin sees all, manager/cleaner see only linked
CREATE POLICY "Users can read properties based on access"
ON public.properties
FOR SELECT
USING (
  -- Superadmin sees all
  has_role(auth.uid(), 'superadmin'::app_role)
  OR
  -- Admin sees all (they are proprietários)
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Manager and cleaner see only linked properties
  has_property_access(id)
);

-- Drop existing manager SELECT policy on schedules
DROP POLICY IF EXISTS "Admins managers and superadmins can read all schedules" ON public.schedules;

-- Create new schedule read policy
CREATE POLICY "Users can read schedules based on access"
ON public.schedules
FOR SELECT
USING (
  -- Superadmin sees all
  has_role(auth.uid(), 'superadmin'::app_role)
  OR
  -- Admin sees all
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Manager sees only linked property schedules
  (has_role(auth.uid(), 'manager'::app_role) AND has_property_access(property_id))
  OR
  -- Cleaner sees only linked property schedules
  (has_role(auth.uid(), 'cleaner'::app_role) AND has_property_access(property_id))
);

-- Drop existing manager SELECT policy on reservations
DROP POLICY IF EXISTS "Admins managers and superadmins can read all reservations" ON public.reservations;

-- Create new reservation read policy
CREATE POLICY "Users can read reservations based on access"
ON public.reservations
FOR SELECT
USING (
  -- Superadmin sees all
  has_role(auth.uid(), 'superadmin'::app_role)
  OR
  -- Admin sees all
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Manager sees only linked property reservations
  (has_role(auth.uid(), 'manager'::app_role) AND has_property_access(property_id))
  OR
  -- Cleaner sees only linked property reservations
  (has_role(auth.uid(), 'cleaner'::app_role) AND has_property_access(property_id))
);

-- Drop existing cleaner SELECT policy on reservations (redundant now)
DROP POLICY IF EXISTS "Cleaners can read assigned property reservations" ON public.reservations;

-- Drop existing cleaner SELECT policy on schedules (redundant now)
DROP POLICY IF EXISTS "Cleaners can read schedules for assigned properties" ON public.schedules;

-- Update manager UPDATE policy on schedules to respect property access
DROP POLICY IF EXISTS "Admins managers and superadmins can update all schedules" ON public.schedules;

CREATE POLICY "Users can update schedules based on access"
ON public.schedules
FOR UPDATE
USING (
  -- Superadmin can update all
  has_role(auth.uid(), 'superadmin'::app_role)
  OR
  -- Admin can update all
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Manager can update only linked property schedules
  (has_role(auth.uid(), 'manager'::app_role) AND has_property_access(property_id))
);

-- Update manager UPDATE policy on properties to respect property access
DROP POLICY IF EXISTS "Managers admins and superadmins can update properties" ON public.properties;

CREATE POLICY "Users can update properties based on access"
ON public.properties
FOR UPDATE
USING (
  -- Superadmin can update all
  has_role(auth.uid(), 'superadmin'::app_role)
  OR
  -- Admin can update all
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Manager can update only linked properties
  (has_role(auth.uid(), 'manager'::app_role) AND has_property_access(id))
);

-- Update manager UPDATE policy on reservations to respect property access
DROP POLICY IF EXISTS "Managers admins and superadmins can update reservations" ON public.reservations;

CREATE POLICY "Users can update reservations based on access"
ON public.reservations
FOR UPDATE
USING (
  -- Superadmin can update all
  has_role(auth.uid(), 'superadmin'::app_role)
  OR
  -- Admin can update all
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Manager can update only linked property reservations
  (has_role(auth.uid(), 'manager'::app_role) AND has_property_access(property_id))
);
