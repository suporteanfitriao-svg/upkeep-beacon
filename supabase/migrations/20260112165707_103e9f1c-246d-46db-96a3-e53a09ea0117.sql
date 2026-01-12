-- Add columns for auto-release before checkout
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS auto_release_before_checkout_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_release_before_checkout_minutes INTEGER DEFAULT 60;

-- Add column for requiring photo on issues
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS require_photo_for_issues BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.properties.auto_release_before_checkout_enabled IS 'Enable automatic release X minutes before checkout';
COMMENT ON COLUMN public.properties.auto_release_before_checkout_minutes IS 'Minutes before checkout to auto-release (default 60)';
COMMENT ON COLUMN public.properties.require_photo_for_issues IS 'Require at least 1 photo when reporting maintenance issues';