-- Add is_active column to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_properties_is_active ON public.properties(is_active);