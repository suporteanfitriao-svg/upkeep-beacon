-- Add column to require checklist completion for a property
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS require_checklist boolean NOT NULL DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.properties.require_checklist IS 'Whether this property requires checklist completion during cleaning tasks';