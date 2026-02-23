
-- 1. Add observacao and concluded_by to rfc_steps
ALTER TABLE public.rfc_steps ADD COLUMN observacao text;
ALTER TABLE public.rfc_steps ADD COLUMN concluded_by uuid;

-- 2. Add rfc_progress to tickets
ALTER TABLE public.tickets ADD COLUMN rfc_progress integer DEFAULT 0;

-- 3. Create trigger function to recalculate rfc_progress
CREATE OR REPLACE FUNCTION public.recalculate_rfc_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _ticket_id uuid;
  _total integer;
  _done integer;
  _progress integer;
BEGIN
  -- Determine the ticket_id
  IF TG_OP = 'DELETE' THEN
    _ticket_id := OLD.ticket_id;
  ELSE
    _ticket_id := NEW.ticket_id;
  END IF;

  -- Count total and done steps
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status_concluido = true)
  INTO _total, _done
  FROM public.rfc_steps
  WHERE ticket_id = _ticket_id;

  -- Calculate progress
  IF _total = 0 THEN
    _progress := 0;
  ELSE
    _progress := ROUND((_done::numeric / _total::numeric) * 100);
  END IF;

  -- Update the ticket
  UPDATE public.tickets
  SET rfc_progress = _progress, updated_at = now()
  WHERE id = _ticket_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- 4. Create trigger
CREATE TRIGGER trg_recalculate_rfc_progress
AFTER INSERT OR UPDATE OR DELETE ON public.rfc_steps
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_rfc_progress();
