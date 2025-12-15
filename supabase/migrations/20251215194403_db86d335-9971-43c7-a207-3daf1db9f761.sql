-- Create ticket_subcategories table
CREATE TABLE public.ticket_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.ticket_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category_id, name)
);

-- Enable RLS
ALTER TABLE public.ticket_subcategories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "View active subcategories"
ON public.ticket_subcategories
FOR SELECT
USING ((is_active = true) OR is_super_admin(auth.uid()));

CREATE POLICY "Super admins manage subcategories"
ON public.ticket_subcategories
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Insert initial subcategories for DB categories
INSERT INTO public.ticket_subcategories (category_id, name, sort_order)
SELECT c.id, sub.name, sub.sort_order
FROM public.ticket_categories c
CROSS JOIN (VALUES
  ('Query lenta', 1),
  ('Deadlock', 2),
  ('Uso excessivo de CPU', 3),
  ('Bloqueios', 4),
  ('Lock wait timeout', 5),
  ('Full table scan', 6)
) AS sub(name, sort_order)
WHERE c.name = 'Erro de Performance' AND c.segment = 'DB';

INSERT INTO public.ticket_subcategories (category_id, name, sort_order)
SELECT c.id, sub.name, sub.sort_order
FROM public.ticket_categories c
CROSS JOIN (VALUES
  ('Falha no backup', 1),
  ('Backup incompleto', 2),
  ('Erro na restauração', 3),
  ('Agendamento', 4),
  ('Corrupção de backup', 5)
) AS sub(name, sort_order)
WHERE c.name = 'Backup/Restore' AND c.segment = 'DB';

INSERT INTO public.ticket_subcategories (category_id, name, sort_order)
SELECT c.id, sub.name, sub.sort_order
FROM public.ticket_categories c
CROSS JOIN (VALUES
  ('Lag de replicação', 1),
  ('Erro de sincronização', 2),
  ('Falha no slave', 3),
  ('Conflito de dados', 4)
) AS sub(name, sort_order)
WHERE c.name = 'Replicação' AND c.segment = 'DB';

INSERT INTO public.ticket_subcategories (category_id, name, sort_order)
SELECT c.id, sub.name, sub.sort_order
FROM public.ticket_categories c
CROSS JOIN (VALUES
  ('Sintaxe inválida', 1),
  ('Constraint violation', 2),
  ('Data truncation', 3),
  ('Tipo incompatível', 4)
) AS sub(name, sort_order)
WHERE c.name = 'Erro SQL' AND c.segment = 'DB';

INSERT INTO public.ticket_subcategories (category_id, name, sort_order)
SELECT c.id, sub.name, sub.sort_order
FROM public.ticket_categories c
CROSS JOIN (VALUES
  ('Índice ausente', 1),
  ('Configuração de memória', 2),
  ('Cache hit baixo', 3),
  ('Otimização de query', 4)
) AS sub(name, sort_order)
WHERE c.name = 'Tunning' AND c.segment = 'DB';

INSERT INTO public.ticket_subcategories (category_id, name, sort_order)
SELECT c.id, sub.name, sub.sort_order
FROM public.ticket_categories c
CROSS JOIN (VALUES
  ('Failover', 1),
  ('Cluster down', 2),
  ('Split brain', 3),
  ('Heartbeat falho', 4)
) AS sub(name, sort_order)
WHERE c.name = 'Alta Disponibilidade' AND c.segment = 'DB';

INSERT INTO public.ticket_subcategories (category_id, name, sort_order)
SELECT c.id, sub.name, sub.sort_order
FROM public.ticket_categories c
CROSS JOIN (VALUES
  ('Erro de migração', 1),
  ('Incompatibilidade de versão', 2),
  ('Dados perdidos', 3),
  ('Schema mismatch', 4)
) AS sub(name, sort_order)
WHERE c.name = 'Migração' AND c.segment = 'DB';

-- Insert initial subcategories for APP categories
INSERT INTO public.ticket_subcategories (category_id, name, sort_order)
SELECT c.id, sub.name, sub.sort_order
FROM public.ticket_categories c
CROSS JOIN (VALUES
  ('Tela não carrega', 1),
  ('Erro visual', 2),
  ('Botão não funciona', 3),
  ('Campo não aparece', 4),
  ('Layout quebrado', 5)
) AS sub(name, sort_order)
WHERE c.name = 'Erro de Interface' AND c.segment = 'APP';

INSERT INTO public.ticket_subcategories (category_id, name, sort_order)
SELECT c.id, sub.name, sub.sort_order
FROM public.ticket_categories c
CROSS JOIN (VALUES
  ('API não responde', 1),
  ('Erro de sincronização', 2),
  ('Timeout', 3),
  ('Dados incorretos', 4),
  ('Autenticação falhou', 5)
) AS sub(name, sort_order)
WHERE c.name = 'Integração' AND c.segment = 'APP';

INSERT INTO public.ticket_subcategories (category_id, name, sort_order)
SELECT c.id, sub.name, sub.sort_order
FROM public.ticket_categories c
CROSS JOIN (VALUES
  ('Relatório não gera', 1),
  ('Dados inconsistentes', 2),
  ('Timeout na geração', 3),
  ('Formato incorreto', 4)
) AS sub(name, sort_order)
WHERE c.name = 'Relatórios' AND c.segment = 'APP';

INSERT INTO public.ticket_subcategories (category_id, name, sort_order)
SELECT c.id, sub.name, sub.sort_order
FROM public.ticket_categories c
CROSS JOIN (VALUES
  ('Lentidão geral', 1),
  ('Tempo de carregamento', 2),
  ('Timeout', 3),
  ('Travamento', 4)
) AS sub(name, sort_order)
WHERE c.name = 'Performance' AND c.segment = 'APP';

INSERT INTO public.ticket_subcategories (category_id, name, sort_order)
SELECT c.id, sub.name, sub.sort_order
FROM public.ticket_categories c
CROSS JOIN (VALUES
  ('Não consegue logar', 1),
  ('Sessão expirada', 2),
  ('Permissão negada', 3),
  ('Token inválido', 4)
) AS sub(name, sort_order)
WHERE c.name = 'Login/Autenticação' AND c.segment = 'APP';

INSERT INTO public.ticket_subcategories (category_id, name, sort_order)
SELECT c.id, sub.name, sub.sort_order
FROM public.ticket_categories c
CROSS JOIN (VALUES
  ('Erro na importação', 1),
  ('Arquivo inválido', 2),
  ('Timeout', 3),
  ('Dados duplicados', 4)
) AS sub(name, sort_order)
WHERE c.name = 'Importação/Exportação' AND c.segment = 'APP';