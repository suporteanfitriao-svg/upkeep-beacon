-- Add geolocation fields to properties table
ALTER TABLE public.properties 
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8);

-- Add index for geolocation queries
CREATE INDEX idx_properties_geolocation ON public.properties (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.properties.latitude IS 'Property latitude coordinate for geolocation features';
COMMENT ON COLUMN public.properties.longitude IS 'Property longitude coordinate for geolocation features';