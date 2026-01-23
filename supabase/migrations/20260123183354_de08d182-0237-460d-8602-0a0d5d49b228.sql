-- Add missing columns to onboarding_settings for complete property rules
ALTER TABLE public.onboarding_settings 
ADD COLUMN IF NOT EXISTS auto_release_before_checkout_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_release_before_checkout_minutes integer DEFAULT 60,
ADD COLUMN IF NOT EXISTS require_checklist boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS require_photo_for_inspections boolean NOT NULL DEFAULT false;