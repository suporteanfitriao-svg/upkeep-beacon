-- Adicionar campo item_label na tabela maintenance_issues
ALTER TABLE public.maintenance_issues
ADD COLUMN IF NOT EXISTS item_label TEXT;

-- Criar bucket para fotos de manutenção (público para visualização)
INSERT INTO storage.buckets (id, name, public)
VALUES ('maintenance-photos', 'maintenance-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: Usuários autenticados com role podem fazer upload
CREATE POLICY "Authenticated users can upload maintenance photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'maintenance-photos' 
  AND has_any_role(auth.uid())
);

-- RLS policy: Qualquer um pode visualizar as fotos (bucket público)
CREATE POLICY "Anyone can view maintenance photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'maintenance-photos');

-- RLS policy: Admin e manager podem deletar fotos
CREATE POLICY "Admins and managers can delete maintenance photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'maintenance-photos'
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);