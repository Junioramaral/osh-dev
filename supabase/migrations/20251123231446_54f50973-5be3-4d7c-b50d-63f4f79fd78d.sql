-- Criar ENUM para tipo de alerta
CREATE TYPE public.sla_alert_type AS ENUM ('warning', 'overdue');

-- Criar tabela de notificações
CREATE TABLE public.sla_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  alert_type public.sla_alert_type NOT NULL,
  sla_type TEXT NOT NULL CHECK (sla_type IN ('first_response', 'resolution')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recipients TEXT[] NOT NULL,
  email_content JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_sla_notifications_ticket_id ON public.sla_notifications(ticket_id);
CREATE INDEX idx_sla_notifications_sent_at ON public.sla_notifications(sent_at);
CREATE INDEX idx_sla_notifications_alert_type ON public.sla_notifications(alert_type, sla_type);

-- RLS policies (apenas Otimizzo pode ver)
ALTER TABLE public.sla_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Otimizzo can view notifications"
ON public.sla_notifications
FOR SELECT
TO authenticated
USING (is_otimizzo_user(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "System can insert notifications"
ON public.sla_notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Comentários para documentação
COMMENT ON TABLE public.sla_notifications IS 'Registro de notificações de SLA enviadas para evitar spam';
COMMENT ON COLUMN public.sla_notifications.alert_type IS 'Tipo de alerta: warning (>75%) ou overdue (vencido)';
COMMENT ON COLUMN public.sla_notifications.sla_type IS 'Tipo de SLA: first_response ou resolution';