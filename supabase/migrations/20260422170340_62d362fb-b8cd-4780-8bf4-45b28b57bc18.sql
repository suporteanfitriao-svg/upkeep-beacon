UPDATE storage.buckets SET public = false WHERE id = 'checklist-photos';

DROP POLICY IF EXISTS "Authenticated users can read checklist photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload checklist photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update checklist photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins and managers can delete checklist photos" ON storage.objects;

CREATE POLICY "Authenticated users can read checklist photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'checklist-photos');

CREATE POLICY "Authenticated users can upload checklist photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'checklist-photos');

CREATE POLICY "Authenticated users can update checklist photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'checklist-photos');

CREATE POLICY "Admins and managers can delete checklist photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'checklist-photos'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
);