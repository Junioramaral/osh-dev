CREATE OR REPLACE FUNCTION public.check_time_log_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _conflict RECORD;
BEGIN
  IF NEW.work_date IS NULL OR NEW.start_time IS NULL OR NEW.end_time IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT tl.id, tl.start_time, tl.end_time, t.ticket_number
  INTO _conflict
  FROM public.ticket_time_logs tl
  LEFT JOIN public.tickets t ON t.id = tl.ticket_id
  WHERE tl.analyst_id = NEW.analyst_id
    AND tl.work_date = NEW.work_date
    AND tl.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND tl.start_time IS NOT NULL
    AND tl.end_time IS NOT NULL
    AND tl.start_time < NEW.end_time
    AND tl.end_time > NEW.start_time
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'TIME_LOG_OVERLAP: Já existe um lançamento neste dia entre % e % (Ticket #%)',
      to_char(_conflict.start_time, 'HH24:MI'),
      to_char(_conflict.end_time, 'HH24:MI'),
      COALESCE(_conflict.ticket_number, '?');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_time_log_overlap ON public.ticket_time_logs;
CREATE TRIGGER trg_check_time_log_overlap
BEFORE INSERT OR UPDATE ON public.ticket_time_logs
FOR EACH ROW EXECUTE FUNCTION public.check_time_log_overlap();