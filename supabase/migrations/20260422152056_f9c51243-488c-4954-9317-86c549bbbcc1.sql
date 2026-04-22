UPDATE storage.buckets SET public = false WHERE id = 'inspection-photos';

DROP POLICY IF EXISTS "Authenticated users can read inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins and managers can delete inspection photos" ON storage.objects;

CREATE POLICY "Authenticated users can read inspection photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'inspection-photos');

CREATE POLICY "Authenticated users can upload inspection photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inspection-photos');

CREATE POLICY "Authenticated users can update inspection photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'inspection-photos');

CREATE POLICY "Admins and managers can delete inspection photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'inspection-photos'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
);