-- Renomear coluna author_email para sender_email
ALTER TABLE public.ticket_comments 
RENAME COLUMN author_email TO sender_email;

-- Atualizar comentário da coluna
COMMENT ON COLUMN public.ticket_comments.sender_email IS 'Email do remetente do comentário';