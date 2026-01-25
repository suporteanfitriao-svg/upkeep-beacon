-- Create a trigger function to sync property address to schedules
CREATE OR REPLACE FUNCTION public.sync_property_address_to_schedules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only update if address actually changed
  IF OLD.address IS DISTINCT FROM NEW.address THEN
    UPDATE public.schedules
    SET 
      property_address = NEW.address,
      updated_at = now()
    WHERE property_id = NEW.id
      AND status IN ('waiting', 'released'); -- Only update pending schedules
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_property_address_update ON public.properties;
CREATE TRIGGER on_property_address_update
  AFTER UPDATE OF address ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_property_address_to_schedules();