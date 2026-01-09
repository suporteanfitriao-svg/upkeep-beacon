-- Create storage bucket for checklist category photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('checklist-photos', 'checklist-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for checklist photos bucket
CREATE POLICY "Authenticated users can upload checklist photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'checklist-photos');

CREATE POLICY "Authenticated users can view checklist photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'checklist-photos');

CREATE POLICY "Authenticated users can delete own checklist photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'checklist-photos');

-- Add category_photos column to schedules to track photos per category
ALTER TABLE public.schedules 
ADD COLUMN IF NOT EXISTS category_photos JSONB DEFAULT '{}'::jsonb;