
CREATE OR REPLACE FUNCTION public.calculate_sla_deadlines()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  first_response_minutes INTEGER;
  resolution_minutes INTEGER;
BEGIN
  -- RFCs don't have SLA
  IF NEW.record_type = 'rfc' THEN
    NEW.sla_first_response_deadline := NULL;
    NEW.sla_resolution_deadline := NULL;
    RETURN NEW;
  END IF;

  -- Get SLA from client based on segment and priority
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
  
  NEW.sla_first_response_deadline := NEW.created_at + (first_response_minutes || ' minutes')::INTERVAL;
  NEW.sla_resolution_deadline := NEW.created_at + (resolution_minutes || ' minutes')::INTERVAL;
  
  RETURN NEW;
END;
$function$;
