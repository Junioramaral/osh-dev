-- Adicionar campo para armazenar quem resolveu o ticket
ALTER TABLE public.tickets 
ADD COLUMN resolved_by TEXT;

-- Comentário descritivo
COMMENT ON COLUMN public.tickets.resolved_by IS 'Nome do usuário que resolveu/encerrou o ticket';