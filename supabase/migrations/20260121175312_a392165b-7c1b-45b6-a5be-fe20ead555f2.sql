-- Add photos column to maintenance_issues for multiple photo support
ALTER TABLE public.maintenance_issues
ADD COLUMN photos jsonb DEFAULT '[]'::jsonb;

-- Migrate existing photo_url data to new photos array format
UPDATE public.maintenance_issues 
SET photos = jsonb_build_array(
  jsonb_build_object(
    'url', photo_url,
    'timestamp', created_at,
    'uploaded_by', reported_by_name
  )
)
WHERE photo_url IS NOT NULL AND photo_url != '';

COMMENT ON COLUMN public.maintenance_issues.photos IS 'Array of photo objects with url, timestamp, and uploaded_by fields';