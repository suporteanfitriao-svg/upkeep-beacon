-- Add new columns to waitlist table
ALTER TABLE public.waitlist
ADD COLUMN city TEXT,
ADD COLUMN state TEXT,
ADD COLUMN property_type TEXT,
ADD COLUMN property_type_other TEXT,
ADD COLUMN property_link TEXT;