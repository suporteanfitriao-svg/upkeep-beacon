-- 1) Make property-images bucket private
UPDATE storage.buckets SET public = false WHERE id = 'property-images';

-- 2) Drop previous permissive policies if they exist (defensive)
DROP POLICY IF EXISTS "Public read property-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read property-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read property-images" ON storage.objects;
DROP POLICY IF EXISTS "Managers can upload property-images" ON storage.objects;
DROP POLICY IF EXISTS "Managers can update property-images" ON storage.objects;
DROP POLICY IF EXISTS "Managers can delete property-images" ON storage.objects;

-- 3) READ: any authenticated user with a role and access to the property folder
-- Folder convention: <property_id>/<file>
CREATE POLICY "Read property-images by access"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'property-images'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'superadmin'::app_role)
    OR (
      has_any_role(auth.uid())
      AND has_property_access(((storage.foldername(name))[1])::uuid)
    )
  )
);

-- 4) WRITE: only managers/admins/superadmins
CREATE POLICY "Managers can upload property-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-images'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'superadmin'::app_role)
  )
);

CREATE POLICY "Managers can update property-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'property-images'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'superadmin'::app_role)
  )
);

CREATE POLICY "Admins can delete property-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'property-images'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'superadmin'::app_role)
  )
);