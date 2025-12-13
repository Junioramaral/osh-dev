-- Adicionar coluna para vincular FAQ ao ticket
ALTER TABLE public.tickets 
ADD COLUMN faq_article_id UUID REFERENCES public.faq_articles(id) ON DELETE SET NULL;

-- Criar índice para performance
CREATE INDEX idx_tickets_faq_article_id ON public.tickets(faq_article_id);