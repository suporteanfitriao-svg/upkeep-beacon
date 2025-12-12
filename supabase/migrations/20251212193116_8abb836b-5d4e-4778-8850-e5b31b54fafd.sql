-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'cleaner');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user has any role (for basic access)
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
  )
$$;

-- RLS policy for user_roles: users can only see their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can manage all roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Drop existing public policies on properties
DROP POLICY IF EXISTS "Allow public delete properties" ON public.properties;
DROP POLICY IF EXISTS "Allow public insert properties" ON public.properties;
DROP POLICY IF EXISTS "Allow public read properties" ON public.properties;
DROP POLICY IF EXISTS "Allow public update properties" ON public.properties;

-- Create secure policies for properties (managers and admins only)
CREATE POLICY "Authenticated users with roles can read properties"
ON public.properties
FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Managers and admins can insert properties"
ON public.properties
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers and admins can update properties"
ON public.properties
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete properties"
ON public.properties
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Drop existing public policies on reservations
DROP POLICY IF EXISTS "Allow public delete reservations" ON public.reservations;
DROP POLICY IF EXISTS "Allow public insert reservations" ON public.reservations;
DROP POLICY IF EXISTS "Allow public read reservations" ON public.reservations;
DROP POLICY IF EXISTS "Allow public update reservations" ON public.reservations;

-- Create secure policies for reservations
CREATE POLICY "Authenticated users with roles can read reservations"
ON public.reservations
FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Managers and admins can insert reservations"
ON public.reservations
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers and admins can update reservations"
ON public.reservations
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete reservations"
ON public.reservations
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Drop existing public policies on schedules
DROP POLICY IF EXISTS "Allow public delete schedules" ON public.schedules;
DROP POLICY IF EXISTS "Allow public insert schedules" ON public.schedules;
DROP POLICY IF EXISTS "Allow public read schedules" ON public.schedules;
DROP POLICY IF EXISTS "Allow public update schedules" ON public.schedules;

-- Create secure policies for schedules
CREATE POLICY "Authenticated users with roles can read schedules"
ON public.schedules
FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Managers and admins can insert schedules"
ON public.schedules
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "All roles can update schedules"
ON public.schedules
FOR UPDATE
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admins can delete schedules"
ON public.schedules
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));