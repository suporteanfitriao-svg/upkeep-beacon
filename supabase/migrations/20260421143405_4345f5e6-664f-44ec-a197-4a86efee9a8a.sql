
-- Reverter buckets para público (evita quebrar exibição de fotos)
UPDATE storage.buckets 
SET public = true 
WHERE id IN ('maintenance-photos', 'checklist-photos', 'property-images', 'inventory-photos', 'inspection-photos', 'issue-photos');

-- Remover policies criadas (ficam por desnecessárias agora)
DROP POLICY IF EXISTS "Authenticated users can view photo buckets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to photo buckets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins and managers can delete photos" ON storage.objects;

-- Manter políticas básicas para upload/update/delete autenticado
CREATE POLICY "Authenticated upload to photo buckets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('maintenance-photos', 'checklist-photos', 'property-images', 'inventory-photos', 'inspection-photos', 'issue-photos')
);

CREATE POLICY "Authenticated update photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id IN ('maintenance-photos', 'checklist-photos', 'property-images', 'inventory-photos', 'inspection-photos', 'issue-photos')
);

CREATE POLICY "Admin manager delete photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id IN ('maintenance-photos', 'checklist-photos', 'property-images', 'inventory-photos', 'inspection-photos', 'issue-photos')
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
);
