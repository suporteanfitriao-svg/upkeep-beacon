ALTER TABLE public.property_ical_sources
ADD COLUMN IF NOT EXISTS sync_start_date date;

COMMENT ON COLUMN public.property_ical_sources.sync_start_date IS 'Reservations with check_in before this date are ignored during sync. NULL means import all.';