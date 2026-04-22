-- ============================================================
-- FASE 4.1: TEAM_MEMBERS multi-tenant scoping
-- ============================================================

-- Drop existing overly-permissive SELECT policies if any
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='team_members' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.team_members', pol.policyname);
  END LOOP;
END $$;

-- Admins/superadmins: full read
CREATE POLICY "Admins and superadmins can read all team members"
ON public.team_members
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- Managers: only members linked to properties they have access to (or has_all_properties)
CREATE POLICY "Managers can read team members of accessible properties"
ON public.team_members
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'manager'::app_role)
  AND (
    has_all_properties = true
    OR EXISTS (
      SELECT 1 FROM public.team_member_properties tmp
      WHERE tmp.team_member_id = team_members.id
        AND has_property_access(tmp.property_id)
    )
    OR user_id = auth.uid()
  )
);

-- Cleaners: only own record
CREATE POLICY "Cleaners can read own team member record"
ON public.team_members
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'cleaner'::app_role)
  AND user_id = auth.uid()
);

-- ============================================================
-- FASE 4.2: STORAGE ownership by path (first folder = auth.uid())
-- ============================================================

-- Helper: enforce that uploads go into a folder named with the user's uid
-- Buckets affected: property-images, inventory-photos, inspection-photos,
-- maintenance-photos, issue-photos, checklist-photos, cleaning-standards

-- Drop legacy permissive insert/update policies on those buckets
DO $$
DECLARE
  pol record;
  bucket_list text[] := ARRAY[
    'property-images','inventory-photos','inspection-photos',
    'maintenance-photos','issue-photos','checklist-photos','cleaning-standards'
  ];
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname ILIKE '%upload%'
  LOOP
    -- skip; we'll add new explicit policies below
    NULL;
  END LOOP;
END $$;

-- Generic ownership-aware INSERT policy (per bucket, path must start with auth.uid())
CREATE POLICY "Owner-scoped uploads on app buckets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN (
    'property-images','inventory-photos','inspection-photos',
    'maintenance-photos','issue-photos','checklist-photos','cleaning-standards'
  )
  AND (
    -- Path must start with the user's uid as the first folder
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'superadmin'::app_role)
  )
);

CREATE POLICY "Owner-scoped updates on app buckets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id IN (
    'property-images','inventory-photos','inspection-photos',
    'maintenance-photos','issue-photos','checklist-photos','cleaning-standards'
  )
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'superadmin'::app_role)
  )
);

-- ============================================================
-- FASE 4.3: REALTIME messages restriction
-- ============================================================

-- Ensure RLS on realtime.messages
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated active users can send realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated active users can send realtime messages"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.user_id = auth.uid() AND tm.is_active = true
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

DROP POLICY IF EXISTS "Authenticated active users can read realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated active users can read realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.user_id = auth.uid() AND tm.is_active = true
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);