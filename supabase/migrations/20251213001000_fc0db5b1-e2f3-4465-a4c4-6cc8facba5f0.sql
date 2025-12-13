-- Criar tabela de histórico de FAQ
CREATE TABLE public.faq_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.faq_articles(id) ON DELETE CASCADE,
  user_id UUID,
  action_type TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.faq_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Otimizzo can view faq history"
ON public.faq_history FOR SELECT
USING (is_otimizzo_user(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "System can insert faq history"
ON public.faq_history FOR INSERT
WITH CHECK (true);

-- Índice para performance
CREATE INDEX idx_faq_history_article_id ON public.faq_history(article_id);

-- Função para log automático de alterações
CREATE OR REPLACE FUNCTION public.log_faq_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Artigo criado
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.faq_history (article_id, user_id, action_type, new_value)
    VALUES (NEW.id, auth.uid(), 'created', NEW.title);
    RETURN NEW;
  END IF;
  
  -- Artigo atualizado
  IF TG_OP = 'UPDATE' THEN
    -- Título alterado
    IF OLD.title IS DISTINCT FROM NEW.title THEN
      INSERT INTO public.faq_history (article_id, user_id, action_type, field_name, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'field_changed', 'title', OLD.title, NEW.title);
    END IF;
    
    -- Status alterado
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.faq_history (article_id, user_id, action_type, field_name, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'status_changed', 'status', OLD.status, NEW.status);
    END IF;
    
    -- Visibilidade alterada
    IF OLD.visibility IS DISTINCT FROM NEW.visibility THEN
      INSERT INTO public.faq_history (article_id, user_id, action_type, field_name, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'visibility_changed', 'visibility', OLD.visibility::TEXT, NEW.visibility::TEXT);
    END IF;
    
    -- Segmento alterado
    IF OLD.segment IS DISTINCT FROM NEW.segment THEN
      INSERT INTO public.faq_history (article_id, user_id, action_type, field_name, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'field_changed', 'segment', OLD.segment::TEXT, NEW.segment::TEXT);
    END IF;
    
    -- Cliente alterado
    IF OLD.client_id IS DISTINCT FROM NEW.client_id THEN
      INSERT INTO public.faq_history (article_id, user_id, action_type, field_name, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'field_changed', 'client_id', OLD.client_id::TEXT, NEW.client_id::TEXT);
    END IF;
    
    -- Sintomas alterados
    IF OLD.symptoms IS DISTINCT FROM NEW.symptoms THEN
      INSERT INTO public.faq_history (article_id, user_id, action_type, field_name, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'content_changed', 'symptoms', NULL, 'Sintomas atualizados');
    END IF;
    
    -- Problema alterado
    IF OLD.problem IS DISTINCT FROM NEW.problem THEN
      INSERT INTO public.faq_history (article_id, user_id, action_type, field_name, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'content_changed', 'problem', NULL, 'Problema atualizado');
    END IF;
    
    -- Solução alterada
    IF OLD.solution IS DISTINCT FROM NEW.solution THEN
      INSERT INTO public.faq_history (article_id, user_id, action_type, field_name, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'content_changed', 'solution', NULL, 'Solução atualizada');
    END IF;
    
    -- Keywords alteradas
    IF OLD.keywords IS DISTINCT FROM NEW.keywords THEN
      INSERT INTO public.faq_history (article_id, user_id, action_type, field_name, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'field_changed', 'keywords', NULL, 'Palavras-chave atualizadas');
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Criar trigger
CREATE TRIGGER on_faq_article_changes
AFTER INSERT OR UPDATE ON public.faq_articles
FOR EACH ROW
EXECUTE FUNCTION public.log_faq_changes();