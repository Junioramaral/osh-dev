-- Adicionar coluna queue_id na tabela tickets
ALTER TABLE public.tickets 
ADD COLUMN queue_id UUID REFERENCES public.queues(id);

-- Criar tabela de associação teams_queues (muitos para muitos)
CREATE TABLE public.teams_queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  queue_id UUID NOT NULL REFERENCES public.queues(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(team_id, queue_id)
);

-- Enable RLS
ALTER TABLE public.teams_queues ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "View teams_queues" ON public.teams_queues
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins manage teams_queues" ON public.teams_queues
  FOR ALL USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Criar index para performance
CREATE INDEX idx_tickets_queue_id ON public.tickets(queue_id);
CREATE INDEX idx_teams_queues_team_id ON public.teams_queues(team_id);
CREATE INDEX idx_teams_queues_queue_id ON public.teams_queues(queue_id);