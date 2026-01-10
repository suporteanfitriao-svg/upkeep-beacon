-- Add cleaner observations field to schedules (separate from admin notes)
ALTER TABLE public.schedules 
ADD COLUMN IF NOT EXISTS cleaner_observations text;

-- Add comment to clarify the difference between notes and cleaner_observations
COMMENT ON COLUMN public.schedules.notes IS 'Admin/manager notes - not visible to cleaners';
COMMENT ON COLUMN public.schedules.cleaner_observations IS 'Cleaner observations during cleaning - visible to admin/manager after completion';

-- Add global access password to properties (for GLOBAL password mode)
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS global_access_password text;

-- Add comment explaining password modes
COMMENT ON COLUMN public.properties.password_mode IS 'ical: password from reservation, manual: per-schedule password, global: fixed property password';
COMMENT ON COLUMN public.properties.global_access_password IS 'Fixed access password for the property (used when password_mode = manual/global)';