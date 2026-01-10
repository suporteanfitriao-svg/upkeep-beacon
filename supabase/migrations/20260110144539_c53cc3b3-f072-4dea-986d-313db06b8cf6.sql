-- Add 'global' value to the property_password_mode enum
ALTER TYPE public.property_password_mode ADD VALUE IF NOT EXISTS 'global';