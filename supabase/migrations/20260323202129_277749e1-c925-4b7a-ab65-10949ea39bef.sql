
-- 1. Create sla_holidays table
CREATE TABLE public.sla_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date date NOT NULL,
  name text NOT NULL,
  is_automatic boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(holiday_date)
);

-- 2. Enable RLS
ALTER TABLE public.sla_holidays ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies
CREATE POLICY "Authenticated users can view holidays"
  ON public.sla_holidays FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Super admins manage holidays"
  ON public.sla_holidays FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- 4. Update add_business_minutes to skip holidays
CREATE OR REPLACE FUNCTION public.add_business_minutes(_start_time timestamp with time zone, _minutes integer)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _bh_start time;
  _bh_end time;
  _bdays integer[];
  _remaining integer;
  _current timestamptz;
  _current_time time;
  _current_dow integer;
  _current_date date;
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
    _current_date := (_current AT TIME ZONE 'America/Sao_Paulo')::date;
    
    -- Skip non-business days
    IF NOT (_current_dow = ANY(_bdays)) THEN
      _current := (_current_date + interval '1 day' + _bh_start) AT TIME ZONE 'America/Sao_Paulo';
      CONTINUE;
    END IF;
    
    -- Skip holidays
    IF EXISTS (SELECT 1 FROM public.sla_holidays WHERE holiday_date = _current_date) THEN
      _current := (_current_date + interval '1 day' + _bh_start) AT TIME ZONE 'America/Sao_Paulo';
      CONTINUE;
    END IF;
    
    IF _current_time < _bh_start THEN
      _current := (_current_date + _bh_start) AT TIME ZONE 'America/Sao_Paulo';
      _current_time := _bh_start;
    END IF;
    
    IF _current_time >= _bh_end THEN
      _current := (_current_date + interval '1 day' + _bh_start) AT TIME ZONE 'America/Sao_Paulo';
      CONTINUE;
    END IF;
    
    _minutes_left_today := EXTRACT(EPOCH FROM (_bh_end - _current_time))::integer / 60;
    
    IF _remaining <= _minutes_left_today THEN
      _current := _current + (_remaining || ' minutes')::interval;
      _remaining := 0;
    ELSE
      _remaining := _remaining - _minutes_left_today;
      _current := (_current_date + interval '1 day' + _bh_start) AT TIME ZONE 'America/Sao_Paulo';
    END IF;
  END LOOP;
  
  RETURN _current;
END;
$function$;
