UPDATE storage.buckets SET public = false WHERE id IN ('maintenance-photos', 'issue-photos');

DROP POLICY IF EXISTS "Authenticated users can read maintenance photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload maintenance photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update maintenance photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins and managers can delete maintenance photos" ON storage.objects;

CREATE POLICY "Authenticated users can read maintenance photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'maintenance-photos');

CREATE POLICY "Authenticated users can upload maintenance photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'maintenance-photos');

CREATE POLICY "Authenticated users can update maintenance photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'maintenance-photos');

CREATE POLICY "Admins and managers can delete maintenance photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'maintenance-photos'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
);

DROP POLICY IF EXISTS "Authenticated users can read issue photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload issue photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update issue photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins and managers can delete issue photos" ON storage.objects;

CREATE POLICY "Authenticated users can read issue photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'issue-photos');

CREATE POLICY "Authenticated users can upload issue photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'issue-photos');

CREATE POLICY "Authenticated users can update issue photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'issue-photos');

CREATE POLICY "Admins and managers can delete issue photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'issue-photos'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
);