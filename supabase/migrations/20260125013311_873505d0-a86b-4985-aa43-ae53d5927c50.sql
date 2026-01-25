-- Fix remaining security warnings

-- 1. Fix the validate_input function with proper search_path
DROP FUNCTION IF EXISTS public.validate_input(text, integer, boolean);

CREATE OR REPLACE FUNCTION public.validate_input(
  p_input text,
  p_max_length integer DEFAULT 1000,
  p_allow_html boolean DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_cleaned text;
BEGIN
  IF p_input IS NULL THEN
    RETURN NULL;
  END IF;
  
  v_cleaned := TRIM(p_input);
  
  IF LENGTH(v_cleaned) > p_max_length THEN
    v_cleaned := LEFT(v_cleaned, p_max_length);
  END IF;
  
  IF NOT p_allow_html THEN
    v_cleaned := REGEXP_REPLACE(v_cleaned, '<[^>]*>', '', 'g');
    v_cleaned := REGEXP_REPLACE(v_cleaned, 'javascript:', '', 'gi');
    v_cleaned := REGEXP_REPLACE(v_cleaned, 'on\w+\s*=', '', 'gi');
  END IF;
  
  RETURN v_cleaned;
END;
$$;

-- 2. Fix the waitlist INSERT policy to be more restrictive
-- Add rate limiting via a function check
DROP POLICY IF EXISTS "Public can submit to waitlist" ON public.waitlist;

CREATE OR REPLACE FUNCTION public.can_submit_to_waitlist(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Prevent duplicate submissions within 24 hours
  SELECT NOT EXISTS (
    SELECT 1 FROM public.waitlist 
    WHERE email = LOWER(TRIM(p_email))
    AND created_at > now() - interval '24 hours'
  )
$$;

CREATE POLICY "Public can submit to waitlist with validation"
ON public.waitlist FOR INSERT
WITH CHECK (
  -- Basic email validation
  email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND LENGTH(email) <= 255
  AND LENGTH(name) <= 100
  AND LENGTH(whatsapp) <= 20
  AND can_submit_to_waitlist(email)
);