
-- Renumerar FAQs existentes começando em 1001
UPDATE public.faq_articles SET faq_number = 'FAQ001001' WHERE faq_number = 'FAQ000001';
UPDATE public.faq_articles SET faq_number = 'FAQ001002' WHERE faq_number = 'FAQ000002';
UPDATE public.faq_articles SET faq_number = 'FAQ001003' WHERE faq_number = 'FAQ000003';
UPDATE public.faq_articles SET faq_number = 'FAQ001004' WHERE faq_number = 'FAQ000004';

-- Atualizar função para gerar próximos números a partir do maior existente (mínimo 1001)
CREATE OR REPLACE FUNCTION public.generate_faq_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_num INTEGER;
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(faq_number, '\D', '', 'g'), '')::INTEGER), 1000)
    INTO max_num
  FROM public.faq_articles;

  next_num := GREATEST(max_num + 1, 1001);

  NEW.faq_number := 'FAQ' || LPAD(next_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$;
