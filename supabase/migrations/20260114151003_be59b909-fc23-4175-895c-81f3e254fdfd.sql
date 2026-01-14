-- Add property_code column for unique property identification
ALTER TABLE public.properties 
ADD COLUMN property_code TEXT UNIQUE;

-- Create function to generate unique property code
CREATE OR REPLACE FUNCTION public.generate_property_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate code in format PM-XXXXX (5 random digits)
    new_code := 'PM-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.properties WHERE property_code = new_code) INTO code_exists;
    
    -- If code doesn't exist, use it
    IF NOT code_exists THEN
      NEW.property_code := new_code;
      EXIT;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate code on insert
CREATE TRIGGER generate_property_code_trigger
BEFORE INSERT ON public.properties
FOR EACH ROW
WHEN (NEW.property_code IS NULL)
EXECUTE FUNCTION public.generate_property_code();

-- Generate codes for existing properties that don't have one
DO $$
DECLARE
  prop RECORD;
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  FOR prop IN SELECT id FROM public.properties WHERE property_code IS NULL LOOP
    LOOP
      new_code := 'PM-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
      SELECT EXISTS(SELECT 1 FROM public.properties WHERE property_code = new_code) INTO code_exists;
      IF NOT code_exists THEN
        UPDATE public.properties SET property_code = new_code WHERE id = prop.id;
        EXIT;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Create index for faster lookups by property_code
CREATE INDEX idx_properties_property_code ON public.properties(property_code);