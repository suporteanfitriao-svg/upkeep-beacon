-- Add default check-in and check-out times to properties
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS default_check_in_time TIME DEFAULT '14:00:00',
ADD COLUMN IF NOT EXISTS default_check_out_time TIME DEFAULT '11:00:00';

-- Create property_ical_sources table for multiple iCal URLs per property
CREATE TABLE public.property_ical_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  ical_url TEXT NOT NULL,
  custom_name TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  reservations_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_ical_sources ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users with roles can read property_ical_sources"
ON public.property_ical_sources
FOR SELECT
USING (has_any_role(auth.uid()));

CREATE POLICY "Managers and admins can insert property_ical_sources"
ON public.property_ical_sources
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers and admins can update property_ical_sources"
ON public.property_ical_sources
FOR UPDATE
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete property_ical_sources"
ON public.property_ical_sources
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_property_ical_sources_updated_at
BEFORE UPDATE ON public.property_ical_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_property_ical_sources_property_id ON public.property_ical_sources(property_id);