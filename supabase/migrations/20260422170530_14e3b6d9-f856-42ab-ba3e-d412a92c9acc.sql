UPDATE storage.buckets SET public = false WHERE id = 'cleaning-standards';

DROP POLICY IF EXISTS "Authenticated users can read cleaning standards" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload cleaning standards" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update cleaning standards" ON storage.objects;
DROP POLICY IF EXISTS "Admins and managers can delete cleaning standards" ON storage.objects;

CREATE POLICY "Authenticated users can read cleaning standards"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'cleaning-standards');

CREATE POLICY "Authenticated users can upload cleaning standards"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cleaning-standards');

CREATE POLICY "Authenticated users can update cleaning standards"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'cleaning-standards');

CREATE POLICY "Admins and managers can delete cleaning standards"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'cleaning-standards'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
);