-- Add new fields to reservations table for Airbnb listing data
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS listing_name text,
ADD COLUMN IF NOT EXISTS number_of_guests integer DEFAULT 1;

-- Add same fields to schedules for denormalized access
ALTER TABLE public.schedules
ADD COLUMN IF NOT EXISTS listing_name text,
ADD COLUMN IF NOT EXISTS number_of_guests integer DEFAULT 1;

-- Add comment for documentation
COMMENT ON COLUMN public.reservations.listing_name IS 'Name of the Airbnb listing/unit';
COMMENT ON COLUMN public.reservations.number_of_guests IS 'Number of guests for this reservation';
COMMENT ON COLUMN public.schedules.listing_name IS 'Name of the Airbnb listing/unit from reservation';
COMMENT ON COLUMN public.schedules.number_of_guests IS 'Number of guests from reservation';