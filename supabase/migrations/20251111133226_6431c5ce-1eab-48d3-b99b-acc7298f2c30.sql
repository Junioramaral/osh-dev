-- Fix security warning: Add search_path to extract_domain_from_email function
CREATE OR REPLACE FUNCTION public.extract_domain_from_email(_email TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT LOWER(SPLIT_PART(_email, '@', 2))
$$;