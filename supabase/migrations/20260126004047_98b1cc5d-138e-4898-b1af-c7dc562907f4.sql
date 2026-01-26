-- Adicionar coluna para rastrear desbloqueio por inatividade
ALTER TABLE public.tickets 
ADD COLUMN unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Criar índice para otimizar busca de tickets inativos
CREATE INDEX idx_tickets_inactive_check ON public.tickets (updated_at, analyst_id, status)
WHERE analyst_id IS NOT NULL AND status NOT IN ('resolvido', 'fechado');