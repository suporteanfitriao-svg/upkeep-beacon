-- Privatize inventory-photos bucket and add access policies
UPDATE storage.buckets SET public = false WHERE id = 'inventory-photos';

-- Allow authenticated users to read inventory photos
CREATE POLICY "Authenticated users can read inventory photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'inventory-photos');

-- Allow admins and managers to upload inventory photos
CREATE POLICY "Admins and managers can upload inventory photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inventory-photos'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
);

-- Allow admins and managers to delete inventory photos
CREATE POLICY "Admins and managers can delete inventory photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'inventory-photos'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
);

-- Allow admins and managers to update inventory photos
CREATE POLICY "Admins and managers can update inventory photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'inventory-photos'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
);