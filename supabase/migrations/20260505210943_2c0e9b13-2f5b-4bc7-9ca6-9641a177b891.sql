CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  counter INTEGER;
  ticket_offset INTEGER := 101000;
BEGIN
  SELECT COUNT(*) + 1 + ticket_offset INTO counter FROM public.tickets;
  NEW.ticket_number := LPAD(counter::TEXT, 8, '0');
  RETURN NEW;
END;
$function$;