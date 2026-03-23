-- Insert default business hours configs
INSERT INTO system_configs (key, value, description)
VALUES 
  ('business_hours_start', '"09:00"', 'Horário de início do expediente (HH:MM)'),
  ('business_hours_end', '"18:00"', 'Horário de fim do expediente (HH:MM)'),
  ('business_days', '[1,2,3,4,5]', 'Dias úteis da semana (1=seg, 7=dom)')
ON CONFLICT (key) DO NOTHING;

-- Function to add business minutes to a timestamp
CREATE OR REPLACE FUNCTION public.add_business_minutes(
  _start_time timestamptz,
  _minutes integer
)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _bh_start time;
  _bh_end time;
  _bdays integer[];
  _remaining integer;
  _current timestamptz;
  _current_time time;
  _current_dow integer;
  _day_minutes integer;
  _minutes_left_today integer;
  _config_start text;
  _config_end text;
BEGIN
  SELECT REPLACE(value::text, '"', '') INTO _config_start
  FROM system_configs WHERE key = 'business_hours_start';
  
  SELECT REPLACE(value::text, '"', '') INTO _config_end
  FROM system_configs WHERE key = 'business_hours_end';
  
  SELECT ARRAY(SELECT jsonb_array_elements_text(value)::integer)
  INTO _bdays
  FROM system_configs WHERE key = 'business_days';
  
  _bh_start := COALESCE(_config_start, '09:00')::time;
  _bh_end := COALESCE(_config_end, '18:00')::time;
  IF _bdays IS NULL THEN
    _bdays := ARRAY[1,2,3,4,5];
  END IF;
  
  _day_minutes := EXTRACT(EPOCH FROM (_bh_end - _bh_start))::integer / 60;
  _remaining := _minutes;
  _current := _start_time;
  
  WHILE _remaining > 0 LOOP
    _current_dow := EXTRACT(ISODOW FROM _current AT TIME ZONE 'America/Sao_Paulo');
    _current_time := (_current AT TIME ZONE 'America/Sao_Paulo')::time;
    
    IF NOT (_current_dow = ANY(_bdays)) THEN
      _current := ((_current AT TIME ZONE 'America/Sao_Paulo')::date + interval '1 day' + _bh_start) AT TIME ZONE 'America/Sao_Paulo';
      CONTINUE;
    END IF;
    
    IF _current_time < _bh_start THEN
      _current := ((_current AT TIME ZONE 'America/Sao_Paulo')::date + _bh_start) AT TIME ZONE 'America/Sao_Paulo';
      _current_time := _bh_start;
    END IF;
    
    IF _current_time >= _bh_end THEN
      _current := ((_current AT TIME ZONE 'America/Sao_Paulo')::date + interval '1 day' + _bh_start) AT TIME ZONE 'America/Sao_Paulo';
      CONTINUE;
    END IF;
    
    _minutes_left_today := EXTRACT(EPOCH FROM (_bh_end - _current_time))::integer / 60;
    
    IF _remaining <= _minutes_left_today THEN
      _current := _current + (_remaining || ' minutes')::interval;
      _remaining := 0;
    ELSE
      _remaining := _remaining - _minutes_left_today;
      _current := ((_current AT TIME ZONE 'America/Sao_Paulo')::date + interval '1 day' + _bh_start) AT TIME ZONE 'America/Sao_Paulo';
    END IF;
  END LOOP;
  
  RETURN _current;
END;
$$;

-- Update calculate_sla_deadlines to use business hours for P3/P4
CREATE OR REPLACE FUNCTION public.calculate_sla_deadlines()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  first_response_minutes INTEGER;
  resolution_minutes INTEGER;
  _use_business_hours BOOLEAN;
BEGIN
  IF NEW.record_type = 'rfc' THEN
    NEW.sla_first_response_deadline := NULL;
    NEW.sla_resolution_deadline := NULL;
    RETURN NEW;
  END IF;

  _use_business_hours := NEW.priority IN ('P3', 'P4');

  IF NEW.segment = 'DB' THEN
    CASE NEW.priority
      WHEN 'P1' THEN
        SELECT sla_db_p1_first_response, sla_db_p1_resolution INTO first_response_minutes, resolution_minutes FROM public.clients WHERE id = NEW.client_id;
      WHEN 'P2' THEN
        SELECT sla_db_p2_first_response, sla_db_p2_resolution INTO first_response_minutes, resolution_minutes FROM public.clients WHERE id = NEW.client_id;
      WHEN 'P3' THEN
        SELECT sla_db_p3_first_response, sla_db_p3_resolution INTO first_response_minutes, resolution_minutes FROM public.clients WHERE id = NEW.client_id;
      WHEN 'P4' THEN
        SELECT sla_db_p4_first_response, sla_db_p4_resolution INTO first_response_minutes, resolution_minutes FROM public.clients WHERE id = NEW.client_id;
    END CASE;
  ELSE
    CASE NEW.priority
      WHEN 'P1' THEN
        SELECT sla_app_p1_first_response, sla_app_p1_resolution INTO first_response_minutes, resolution_minutes FROM public.clients WHERE id = NEW.client_id;
      WHEN 'P2' THEN
        SELECT sla_app_p2_first_response, sla_app_p2_resolution INTO first_response_minutes, resolution_minutes FROM public.clients WHERE id = NEW.client_id;
      WHEN 'P3' THEN
        SELECT sla_app_p3_first_response, sla_app_p3_resolution INTO first_response_minutes, resolution_minutes FROM public.clients WHERE id = NEW.client_id;
      WHEN 'P4' THEN
        SELECT sla_app_p4_first_response, sla_app_p4_resolution INTO first_response_minutes, resolution_minutes FROM public.clients WHERE id = NEW.client_id;
    END CASE;
  END IF;
  
  IF _use_business_hours THEN
    NEW.sla_first_response_deadline := add_business_minutes(NEW.created_at, first_response_minutes);
    NEW.sla_resolution_deadline := add_business_minutes(NEW.created_at, resolution_minutes);
  ELSE
    NEW.sla_first_response_deadline := NEW.created_at + (first_response_minutes || ' minutes')::INTERVAL;
    NEW.sla_resolution_deadline := NEW.created_at + (resolution_minutes || ' minutes')::INTERVAL;
  END IF;
  
  RETURN NEW;
END;
$$;