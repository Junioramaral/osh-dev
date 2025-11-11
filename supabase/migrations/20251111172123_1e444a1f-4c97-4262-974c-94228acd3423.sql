-- Create ticket_history table for audit trail
CREATE TABLE IF NOT EXISTS public.ticket_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view ticket history for accessible tickets"
ON public.ticket_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_history.ticket_id
  )
);

CREATE POLICY "System can insert ticket history"
ON public.ticket_history FOR INSERT
WITH CHECK (true);

-- Indexes
CREATE INDEX idx_ticket_history_ticket_id ON public.ticket_history(ticket_id);
CREATE INDEX idx_ticket_history_created_at ON public.ticket_history(created_at DESC);

-- Function to log ticket changes
CREATE OR REPLACE FUNCTION public.log_ticket_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.ticket_history (ticket_id, user_id, action_type, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status::TEXT, NEW.status::TEXT);
  END IF;
  
  -- Analyst assigned
  IF OLD.analyst_id IS DISTINCT FROM NEW.analyst_id THEN
    INSERT INTO public.ticket_history (ticket_id, user_id, action_type, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'assigned', OLD.analyst_id::TEXT, NEW.analyst_id::TEXT);
  END IF;
  
  -- Priority changed
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO public.ticket_history (ticket_id, user_id, action_type, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'priority_changed', OLD.priority::TEXT, NEW.priority::TEXT);
  END IF;
  
  -- First response
  IF OLD.first_response_at IS NULL AND NEW.first_response_at IS NOT NULL THEN
    INSERT INTO public.ticket_history (ticket_id, user_id, action_type, new_value)
    VALUES (NEW.id, auth.uid(), 'first_response', NEW.first_response_at::TEXT);
  END IF;
  
  -- Resolved
  IF OLD.resolved_at IS NULL AND NEW.resolved_at IS NOT NULL THEN
    INSERT INTO public.ticket_history (ticket_id, user_id, action_type, new_value)
    VALUES (NEW.id, auth.uid(), 'resolved', NEW.resolved_at::TEXT);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for updates
CREATE TRIGGER ticket_changes_trigger
AFTER UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.log_ticket_changes();

-- Function to log ticket creation
CREATE OR REPLACE FUNCTION public.log_ticket_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.ticket_history (ticket_id, user_id, action_type, new_value)
  VALUES (NEW.id, auth.uid(), 'created', NEW.status::TEXT);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for inserts
CREATE TRIGGER ticket_creation_trigger
AFTER INSERT ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.log_ticket_creation();