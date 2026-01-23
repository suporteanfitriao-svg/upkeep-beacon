-- Add onboarding_completed flag to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Create trigger to auto-apply onboarding settings to new properties
CREATE OR REPLACE FUNCTION public.apply_onboarding_settings_to_property()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_settings RECORD;
  v_user_id uuid;
BEGIN
  -- Get the user_id from the session
  v_user_id := auth.uid();
  
  -- If no user in session, skip
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get onboarding settings for this user
  SELECT * INTO v_settings
  FROM onboarding_settings
  WHERE user_id = v_user_id
  LIMIT 1;
  
  -- If settings exist, apply them to the new property
  IF v_settings IS NOT NULL THEN
    NEW.default_check_in_time := COALESCE(v_settings.default_check_in_time, NEW.default_check_in_time);
    NEW.default_check_out_time := COALESCE(v_settings.default_check_out_time, NEW.default_check_out_time);
    NEW.auto_release_on_checkout := COALESCE(v_settings.auto_release_schedules, NEW.auto_release_on_checkout);
    NEW.auto_release_before_checkout_enabled := COALESCE(v_settings.auto_release_before_checkout_enabled, NEW.auto_release_before_checkout_enabled);
    NEW.auto_release_before_checkout_minutes := COALESCE(v_settings.auto_release_before_checkout_minutes, NEW.auto_release_before_checkout_minutes);
    NEW.require_checklist := COALESCE(v_settings.require_checklist, NEW.require_checklist);
    NEW.require_photo_per_category := COALESCE(v_settings.require_photo_per_category, NEW.require_photo_per_category);
    NEW.require_photo_for_issues := COALESCE(v_settings.require_photo_for_issues, NEW.require_photo_for_issues);
    NEW.require_photo_for_inspections := COALESCE(v_settings.require_photo_for_inspections, NEW.require_photo_for_inspections);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger
DROP TRIGGER IF EXISTS apply_onboarding_settings_trigger ON public.properties;
CREATE TRIGGER apply_onboarding_settings_trigger
  BEFORE INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_onboarding_settings_to_property();