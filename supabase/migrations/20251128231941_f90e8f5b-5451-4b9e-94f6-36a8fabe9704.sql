-- Adicionar suporte para comentários vindos de email
-- Criar enum para origem do comentário
DO $$ BEGIN
  CREATE TYPE comment_source AS ENUM ('portal', 'email');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Adicionar colunas para rastreamento de origem do comentário
ALTER TABLE public.ticket_comments 
ADD COLUMN IF NOT EXISTS source comment_source DEFAULT 'portal';

-- Permitir author_id nulo para emails de pessoas sem cadastro
ALTER TABLE public.ticket_comments 
ALTER COLUMN author_id DROP NOT NULL;

-- Adicionar dados do remetente para respostas de email
ALTER TABLE public.ticket_comments 
ADD COLUMN IF NOT EXISTS author_email TEXT,
ADD COLUMN IF NOT EXISTS author_name TEXT,
ADD COLUMN IF NOT EXISTS email_message_id TEXT;

-- Criar índice para busca rápida por message_id
CREATE INDEX IF NOT EXISTS idx_ticket_comments_email_message_id 
ON public.ticket_comments(email_message_id) 
WHERE email_message_id IS NOT NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.ticket_comments.source IS 'Origem do comentário: portal (criado no sistema) ou email (resposta de email do cliente)';
COMMENT ON COLUMN public.ticket_comments.author_email IS 'Email do remetente quando source=email';
COMMENT ON COLUMN public.ticket_comments.author_name IS 'Nome do remetente quando source=email';
COMMENT ON COLUMN public.ticket_comments.email_message_id IS 'ID da mensagem do Resend para rastreamento';