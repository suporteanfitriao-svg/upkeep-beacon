
-- Add photos JSON column to inventory_items for multiple photos support
-- Format: [{ "url": "...", "taken_at": "...", "uploaded_by": "..." }]
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]'::jsonb;

-- Migrate existing single photo data to the new photos array
UPDATE public.inventory_items 
SET photos = jsonb_build_array(
  jsonb_build_object(
    'url', photo_url,
    'taken_at', photo_taken_at
  )
)
WHERE photo_url IS NOT NULL AND photo_url != '';
