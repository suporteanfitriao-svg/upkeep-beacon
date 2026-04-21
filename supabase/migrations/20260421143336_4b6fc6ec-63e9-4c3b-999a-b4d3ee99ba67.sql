
-- Tornar buckets privados
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('maintenance-photos', 'checklist-photos', 'property-images', 'inventory-photos', 'inspection-photos', 'issue-photos');

-- Remover policies públicas antigas (se existirem)
DROP POLICY IF EXISTS "Public read access for photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;

-- SELECT: apenas usuários autenticados nos buckets restritos
CREATE POLICY "Authenticated users can view photo buckets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id IN ('maintenance-photos', 'checklist-photos', 'property-images', 'inventory-photos', 'inspection-photos', 'issue-photos')
);

-- INSERT: usuários autenticados podem fazer upload
CREATE POLICY "Authenticated users can upload to photo buckets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('maintenance-photos', 'checklist-photos', 'property-images', 'inventory-photos', 'inspection-photos', 'issue-photos')
);

-- UPDATE: usuários autenticados podem atualizar seus uploads
CREATE POLICY "Authenticated users can update photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id IN ('maintenance-photos', 'checklist-photos', 'property-images', 'inventory-photos', 'inspection-photos', 'issue-photos')
);

-- DELETE: admins/managers podem deletar
CREATE POLICY "Admins and managers can delete photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id IN ('maintenance-photos', 'checklist-photos', 'property-images', 'inventory-photos', 'inspection-photos', 'issue-photos')
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
);
