
-- Function: business_minutes_between
CREATE OR REPLACE FUNCTION public.business_minutes_between(_start timestamptz, _end timestamptz)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bh_start time;
  _bh_end time;
  _bdays integer[];
  _bdays_jsonb jsonb;
  _config_start text;
  _config_end text;
  _cursor timestamptz;
  _cursor_date date;
  _cursor_dow integer;
  _day_start timestamptz;
  _day_end timestamptz;
  _effective_start timestamptz;
  _effective_end timestamptz;
  _total integer := 0;
BEGIN
  IF _start IS NULL OR _end IS NULL OR _end <= _start THEN
    RETURN 0;
  END IF;

  SELECT REPLACE(value::text, '"', '') INTO _config_start FROM system_configs WHERE key = 'business_hours_start';
  SELECT REPLACE(value::text, '"', '') INTO _config_end FROM system_configs WHERE key = 'business_hours_end';
  SELECT value INTO _bdays_jsonb FROM system_configs WHERE key = 'business_days';

  IF _bdays_jsonb IS NOT NULL AND jsonb_typeof(_bdays_jsonb) = 'array' THEN
    _bdays := ARRAY(SELECT jsonb_array_elements_text(_bdays_jsonb)::integer);
  ELSE
    _bdays := ARRAY[1,2,3,4,5];
  END IF;

  _bh_start := COALESCE(_config_start, '09:00')::time;
  _bh_end := COALESCE(_config_end, '18:00')::time;

  _cursor := _start;

  WHILE _cursor < _end LOOP
    _cursor_date := (_cursor AT TIME ZONE 'America/Sao_Paulo')::date;
    _cursor_dow := EXTRACT(ISODOW FROM _cursor AT TIME ZONE 'America/Sao_Paulo');

    IF NOT (_cursor_dow = ANY(_bdays))
       OR EXISTS (SELECT 1 FROM public.sla_holidays WHERE holiday_date = _cursor_date) THEN
      _cursor := ((_cursor_date + interval '1 day') + _bh_start) AT TIME ZONE 'America/Sao_Paulo';
      CONTINUE;
    END IF;

    _day_start := (_cursor_date + _bh_start) AT TIME ZONE 'America/Sao_Paulo';
    _day_end   := (_cursor_date + _bh_end)   AT TIME ZONE 'America/Sao_Paulo';

    _effective_start := GREATEST(_cursor, _day_start);
    _effective_end   := LEAST(_end, _day_end);

    IF _effective_end > _effective_start THEN
      _total := _total + (EXTRACT(EPOCH FROM (_effective_end - _effective_start))::integer / 60);
    END IF;

    _cursor := ((_cursor_date + interval '1 day') + _bh_start) AT TIME ZONE 'America/Sao_Paulo';
  END LOOP;

  RETURN _total;
END;
$$;

-- Update handle_sla_pause to use business minutes for P3/P4
CREATE OR REPLACE FUNCTION public.handle_sla_pause()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pause_statuses text[];
  _was_paused boolean;
  _is_paused boolean;
  _pause_minutes integer;
  _config jsonb;
  _use_business_hours boolean;
BEGIN
  IF NEW.record_type = 'rfc' THEN
    RETURN NEW;
  END IF;

  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT value INTO _config FROM public.system_configs WHERE key = 'sla_pause_statuses';
  IF _config IS NOT NULL AND jsonb_typeof(_config) = 'array' THEN
    _pause_statuses := ARRAY(SELECT jsonb_array_elements_text(_config));
  ELSE
    _pause_statuses := ARRAY['aguardando_cliente', 'aguardando_aprovacao'];
  END IF;

  _was_paused := OLD.status::text = ANY(_pause_statuses);
  _is_paused := NEW.status::text = ANY(_pause_statuses);

  IF NOT _was_paused AND _is_paused THEN
    NEW.sla_paused_at := now();
    INSERT INTO public.ticket_sla_pauses (ticket_id, paused_at, status_during_pause, paused_by)
    VALUES (NEW.id, now(), NEW.status::text, auth.uid());
  END IF;

  IF _was_paused AND NOT _is_paused AND OLD.sla_paused_at IS NOT NULL THEN
    _use_business_hours := NEW.priority IN ('P3', 'P4');

    IF _use_business_hours THEN
      _pause_minutes := public.business_minutes_between(OLD.sla_paused_at, now());
    ELSE
      _pause_minutes := GREATEST(0, EXTRACT(EPOCH FROM (now() - OLD.sla_paused_at))::integer / 60);
    END IF;

    NEW.sla_paused_total_minutes := COALESCE(OLD.sla_paused_total_minutes, 0) + _pause_minutes;
    NEW.sla_paused_at := NULL;

    IF _use_business_hours THEN
      IF NEW.sla_first_response_deadline IS NOT NULL AND NEW.first_response_at IS NULL THEN
        NEW.sla_first_response_deadline := public.add_business_minutes(NEW.sla_first_response_deadline, _pause_minutes);
      END IF;
      IF NEW.sla_resolution_deadline IS NOT NULL AND NEW.resolved_at IS NULL THEN
        NEW.sla_resolution_deadline := public.add_business_minutes(NEW.sla_resolution_deadline, _pause_minutes);
      END IF;
    ELSE
      IF NEW.sla_first_response_deadline IS NOT NULL AND NEW.first_response_at IS NULL THEN
        NEW.sla_first_response_deadline := NEW.sla_first_response_deadline + (_pause_minutes || ' minutes')::interval;
      END IF;
      IF NEW.sla_resolution_deadline IS NOT NULL AND NEW.resolved_at IS NULL THEN
        NEW.sla_resolution_deadline := NEW.sla_resolution_deadline + (_pause_minutes || ' minutes')::interval;
      END IF;
    END IF;

    UPDATE public.ticket_sla_pauses
       SET resumed_at = now(),
           resumed_by = auth.uid(),
           pause_minutes = _pause_minutes
     WHERE ticket_id = NEW.id AND resumed_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;
