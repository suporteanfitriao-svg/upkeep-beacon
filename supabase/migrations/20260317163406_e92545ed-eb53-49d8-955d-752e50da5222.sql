-- Add max_guests and default_guests to properties for guest count management
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS max_guests integer DEFAULT 10;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS default_guests integer DEFAULT 1;