-- Add photo_url column to inventory_items table
ALTER TABLE public.inventory_items 
ADD COLUMN photo_url TEXT,
ADD COLUMN photo_taken_at TIMESTAMP WITH TIME ZONE;

-- Create storage bucket for inventory photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('inventory-photos', 'inventory-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for inventory photos bucket
CREATE POLICY "Authenticated users can upload inventory photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inventory-photos');

CREATE POLICY "Authenticated users can update inventory photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'inventory-photos');

CREATE POLICY "Authenticated users can delete inventory photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'inventory-photos');

CREATE POLICY "Anyone can view inventory photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'inventory-photos');