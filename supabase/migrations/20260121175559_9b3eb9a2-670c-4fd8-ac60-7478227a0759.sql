-- Create storage bucket for issue photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('issue-photos', 'issue-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload issue photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'issue-photos');

-- Allow public read access to issue photos
CREATE POLICY "Issue photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'issue-photos');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Authenticated users can delete issue photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'issue-photos');