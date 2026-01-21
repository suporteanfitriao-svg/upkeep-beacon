-- Add require_photo_for_inspections column to properties table
ALTER TABLE public.properties 
ADD COLUMN require_photo_for_inspections boolean NOT NULL DEFAULT false;

-- Add inspection_photos column to inspections table to store photos
ALTER TABLE public.inspections 
ADD COLUMN inspection_photos jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.properties.require_photo_for_inspections IS 'When enabled, requires at least one photo to complete an inspection';
COMMENT ON COLUMN public.inspections.inspection_photos IS 'Array of photo URLs uploaded during inspection';