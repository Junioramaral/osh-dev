-- Migration 020e do plano de refatoração multi-tenant.
-- Ponte de tenant_id para teams e queues, mesmo padrão da migration 017
-- (bridge tenants/clients). Hoje só existe o tenant Otimizzo, então todo
-- team/queue existente pertence a ele; quando um tenant novo for
-- vendido, os times/filas dele serão criados já com o tenant_id certo,
-- não migrados depois.
--
-- Sem nenhuma policy de RLS nesta migration — escopo da 020f. Não toca
-- em user_queues nem em nenhuma outra tabela.
--
-- Rollback: supabase/migrations_rollback/20260725120000_bridge_tenants_teams_queues_down.sql

-- ===================== teams =====================

-- 1. Coluna nova, ainda sem NOT NULL/FK (tabela já tem linhas)
ALTER TABLE public.teams ADD COLUMN tenant_id uuid;

-- 2. Backfill: toda linha de teams aponta pro tenant Otimizzo
UPDATE public.teams
SET tenant_id = (SELECT id FROM public.tenants WHERE is_platform_owner = true);

-- 3. Só agora, com backfill completo, exigir o valor
ALTER TABLE public.teams ALTER COLUMN tenant_id SET NOT NULL;

-- 4. FK com RESTRICT de propósito: apagar um tenant não pode apagar
-- silenciosamente todos os teams dele
ALTER TABLE public.teams
  ADD CONSTRAINT teams_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;

-- 5. Índice: toda policy RLS futura vai filtrar por tenant_id
CREATE INDEX idx_teams_tenant_id ON public.teams(tenant_id);

-- ===================== queues =====================

-- 1. Coluna nova, ainda sem NOT NULL/FK (tabela já tem linhas)
ALTER TABLE public.queues ADD COLUMN tenant_id uuid;

-- 2. Backfill: toda linha de queues aponta pro tenant Otimizzo
UPDATE public.queues
SET tenant_id = (SELECT id FROM public.tenants WHERE is_platform_owner = true);

-- 3. Só agora, com backfill completo, exigir o valor
ALTER TABLE public.queues ALTER COLUMN tenant_id SET NOT NULL;

-- 4. FK com RESTRICT de propósito: apagar um tenant não pode apagar
-- silenciosamente todas as queues dele
ALTER TABLE public.queues
  ADD CONSTRAINT queues_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;

-- 5. Índice: toda policy RLS futura vai filtrar por tenant_id
CREATE INDEX idx_queues_tenant_id ON public.queues(tenant_id);
