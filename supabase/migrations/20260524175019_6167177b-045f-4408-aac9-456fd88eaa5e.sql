-- 1. Add SLA tracking columns to tickets
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS sla_first_response_deadline_original timestamptz,
  ADD COLUMN IF NOT EXISTS sla_resolution_deadline_original timestamptz,
  ADD COLUMN IF NOT EXISTS sla_paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS sla_paused_total_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sla_adjustment_reason text,
  ADD COLUMN IF NOT EXISTS sla_adjusted_by uuid,
  ADD COLUMN IF NOT EXISTS sla_adjusted_at timestamptz;

-- Backfill _original from current deadlines (one-time)
UPDATE public.tickets
   SET sla_first_response_deadline_original = sla_first_response_deadline
 WHERE sla_first_response_deadline_original IS NULL
   AND sla_first_response_deadline IS NOT NULL;
UPDATE public.tickets
   SET sla_resolution_deadline_original = sla_resolution_deadline
 WHERE sla_resolution_deadline_original IS NULL
   AND sla_resolution_deadline IS NOT NULL;

-- 2. Update calculate_sla_deadlines to also populate _original on insert
CREATE OR REPLACE FUNCTION public.calculate_sla_deadlines()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  first_response_minutes INTEGER;
  resolution_minutes INTEGER;
  _use_business_hours BOOLEAN;
BEGIN
  IF NEW.record_type = 'rfc' THEN
    NEW.sla_first_response_deadline := NULL;
    NEW.sla_resolution_deadline := NULL;
    NEW.sla_first_response_deadline_original := NULL;
    NEW.sla_resolution_deadline_original := NULL;
    RETURN NEW;
  END IF;

  _use_business_hours := NEW.priority IN ('P3', 'P4');

  IF NEW.segment = 'DB' THEN
    CASE NEW.priority
      WHEN 'P1' THEN SELECT sla_db_p1_first_response, sla_db_p1_resolution INTO first_response_minutes, resolution_minutes FROM public.clients WHERE id = NEW.client_id;
      WHEN 'P2' THEN SELECT sla_db_p2_first_response, sla_db_p2_resolution INTO first_response_minutes, resolution_minutes FROM public.clients WHERE id = NEW.client_id;
      WHEN 'P3' THEN SELECT sla_db_p3_first_response, sla_db_p3_resolution INTO first_response_minutes, resolution_minutes FROM public.clients WHERE id = NEW.client_id;
      WHEN 'P4' THEN SELECT sla_db_p4_first_response, sla_db_p4_resolution INTO first_response_minutes, resolution_minutes FROM public.clients WHERE id = NEW.client_id;
    END CASE;
  ELSE
    CASE NEW.priority
      WHEN 'P1' THEN SELECT sla_app_p1_first_response, sla_app_p1_resolution INTO first_response_minutes, resolution_minutes FROM public.clients WHERE id = NEW.client_id;
      WHEN 'P2' THEN SELECT sla_app_p2_first_response, sla_app_p2_resolution INTO first_response_minutes, resolution_minutes FROM public.clients WHERE id = NEW.client_id;
      WHEN 'P3' THEN SELECT sla_app_p3_first_response, sla_app_p3_resolution INTO first_response_minutes, resolution_minutes FROM public.clients WHERE id = NEW.client_id;
      WHEN 'P4' THEN SELECT sla_app_p4_first_response, sla_app_p4_resolution INTO first_response_minutes, resolution_minutes FROM public.clients WHERE id = NEW.client_id;
    END CASE;
  END IF;

  IF _use_business_hours THEN
    NEW.sla_first_response_deadline := add_business_minutes(NEW.created_at, first_response_minutes);
    NEW.sla_resolution_deadline := add_business_minutes(NEW.created_at, resolution_minutes);
  ELSE
    NEW.sla_first_response_deadline := NEW.created_at + (first_response_minutes || ' minutes')::INTERVAL;
    NEW.sla_resolution_deadline := NEW.created_at + (resolution_minutes || ' minutes')::INTERVAL;
  END IF;

  -- Snapshot originals
  NEW.sla_first_response_deadline_original := NEW.sla_first_response_deadline;
  NEW.sla_resolution_deadline_original := NEW.sla_resolution_deadline;

  RETURN NEW;
END;
$function$;

-- 3. SLA pause audit table
CREATE TABLE IF NOT EXISTS public.ticket_sla_pauses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  paused_at timestamptz NOT NULL,
  resumed_at timestamptz,
  status_during_pause text NOT NULL,
  paused_by uuid,
  resumed_by uuid,
  pause_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ticket_sla_pauses_ticket ON public.ticket_sla_pauses(ticket_id);

ALTER TABLE public.ticket_sla_pauses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View sla pauses via ticket" ON public.ticket_sla_pauses;
CREATE POLICY "View sla pauses via ticket"
  ON public.ticket_sla_pauses FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_sla_pauses.ticket_id));

DROP POLICY IF EXISTS "System insert sla pauses" ON public.ticket_sla_pauses;
CREATE POLICY "System insert sla pauses"
  ON public.ticket_sla_pauses FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Super admins manage sla pauses" ON public.ticket_sla_pauses;
CREATE POLICY "Super admins manage sla pauses"
  ON public.ticket_sla_pauses FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- 4. Pause/resume trigger
CREATE OR REPLACE FUNCTION public.handle_sla_pause()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _pause_statuses text[];
  _was_paused boolean;
  _is_paused boolean;
  _pause_minutes integer;
  _config jsonb;
BEGIN
  -- Skip RFCs entirely
  IF NEW.record_type = 'rfc' THEN
    RETURN NEW;
  END IF;

  -- Only act on status change
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

  -- Entering a pausing status
  IF NOT _was_paused AND _is_paused THEN
    NEW.sla_paused_at := now();
    INSERT INTO public.ticket_sla_pauses (ticket_id, paused_at, status_during_pause, paused_by)
    VALUES (NEW.id, now(), NEW.status::text, auth.uid());
  END IF;

  -- Leaving a pausing status
  IF _was_paused AND NOT _is_paused AND OLD.sla_paused_at IS NOT NULL THEN
    _pause_minutes := GREATEST(0, EXTRACT(EPOCH FROM (now() - OLD.sla_paused_at))::integer / 60);

    NEW.sla_paused_total_minutes := COALESCE(OLD.sla_paused_total_minutes, 0) + _pause_minutes;
    NEW.sla_paused_at := NULL;

    -- Push deadlines forward by the pause duration (only if not yet met)
    IF NEW.sla_first_response_deadline IS NOT NULL AND NEW.first_response_at IS NULL THEN
      NEW.sla_first_response_deadline := NEW.sla_first_response_deadline + (_pause_minutes || ' minutes')::interval;
    END IF;
    IF NEW.sla_resolution_deadline IS NOT NULL AND NEW.resolved_at IS NULL THEN
      NEW.sla_resolution_deadline := NEW.sla_resolution_deadline + (_pause_minutes || ' minutes')::interval;
    END IF;

    UPDATE public.ticket_sla_pauses
       SET resumed_at = now(),
           resumed_by = auth.uid(),
           pause_minutes = _pause_minutes
     WHERE ticket_id = NEW.id AND resumed_at IS NULL;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_handle_sla_pause ON public.tickets;
CREATE TRIGGER trg_handle_sla_pause
  BEFORE UPDATE OF status ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sla_pause();

-- 5. Default config for pause statuses
INSERT INTO public.system_configs (key, value, description)
VALUES (
  'sla_pause_statuses',
  '["aguardando_cliente","aguardando_aprovacao"]'::jsonb,
  'Statuses que pausam a contagem do SLA'
)
ON CONFLICT (key) DO NOTHING;