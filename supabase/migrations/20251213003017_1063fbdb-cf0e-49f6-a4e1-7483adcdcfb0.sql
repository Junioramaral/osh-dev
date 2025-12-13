-- Adicionar coluna para número sequencial
ALTER TABLE public.faq_articles 
ADD COLUMN faq_number TEXT UNIQUE;

-- Preencher registros existentes com subconsulta
WITH numbered_faqs AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM public.faq_articles
)
UPDATE public.faq_articles 
SET faq_number = 'FAQ' || LPAD(numbered_faqs.rn::TEXT, 6, '0')
FROM numbered_faqs
WHERE public.faq_articles.id = numbered_faqs.id;

-- Tornar coluna NOT NULL após preencher
ALTER TABLE public.faq_articles 
ALTER COLUMN faq_number SET NOT NULL;

-- Criar função para gerar número sequencial
CREATE OR REPLACE FUNCTION public.generate_faq_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  counter INTEGER;
BEGIN
  -- Pegar contador global
  SELECT COUNT(*) + 1 INTO counter FROM public.faq_articles;
  
  -- Gerar número com prefixo FAQ + 6 dígitos
  NEW.faq_number := 'FAQ' || LPAD(counter::TEXT, 6, '0');
  
  RETURN NEW;
END;
$$;

-- Criar trigger BEFORE INSERT
CREATE TRIGGER generate_faq_number_trigger
  BEFORE INSERT ON public.faq_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_faq_number();