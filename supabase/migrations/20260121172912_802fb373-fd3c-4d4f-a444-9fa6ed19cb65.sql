-- Create storage bucket for inspection photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('inspection-photos', 'inspection-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload inspection photos
CREATE POLICY "Authenticated users can upload inspection photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inspection-photos');

-- Allow public read access for inspection photos
CREATE POLICY "Public read access for inspection photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'inspection-photos');

-- Allow users to delete their own inspection photos
CREATE POLICY "Authenticated users can delete inspection photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'inspection-photos');