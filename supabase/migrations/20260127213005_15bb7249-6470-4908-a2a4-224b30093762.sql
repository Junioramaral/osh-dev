-- Renomear coluna author_name para sender_name
ALTER TABLE public.ticket_comments 
RENAME COLUMN author_name TO sender_name;

-- Atualizar comentário da coluna
COMMENT ON COLUMN public.ticket_comments.sender_name IS 'Nome do remetente do comentário';