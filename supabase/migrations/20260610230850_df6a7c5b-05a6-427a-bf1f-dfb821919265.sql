CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  next_num BIGINT;
  ticket_offset BIGINT := 101000;
  attempts INT := 0;
BEGIN
  LOOP
    SELECT GREATEST(
             COALESCE(MAX(ticket_number::BIGINT), ticket_offset),
             ticket_offset
           ) + 1
      INTO next_num
      FROM public.tickets
     WHERE ticket_number ~ '^[0-9]+$';

    NEW.ticket_number := LPAD(next_num::TEXT, 8, '0');

    IF NOT EXISTS (
      SELECT 1 FROM public.tickets WHERE ticket_number = NEW.ticket_number
    ) THEN
      RETURN NEW;
    END IF;

    attempts := attempts + 1;
    EXIT WHEN attempts >= 5;
  END LOOP;

  RAISE EXCEPTION 'Não foi possível gerar ticket_number único após % tentativas', attempts;
END;
$function$;