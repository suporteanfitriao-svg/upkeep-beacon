-- Add image_url column to properties table
ALTER TABLE public.properties ADD COLUMN image_url TEXT;

-- Create storage bucket for property images
INSERT INTO storage.buckets (id, name, public) VALUES ('property-images', 'property-images', true);

-- Allow authenticated users to upload property images
CREATE POLICY "Authenticated users can upload property images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'property-images' AND auth.role() = 'authenticated');

-- Allow public read access to property images
CREATE POLICY "Anyone can view property images"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-images');

-- Allow admins and managers to delete property images
CREATE POLICY "Admins and managers can delete property images"
ON storage.objects FOR DELETE
USING (bucket_id = 'property-images' AND (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
));