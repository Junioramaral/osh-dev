-- Rollback da migration 020e
-- (supabase/migrations/20260725120000_bridge_tenants_teams_queues.sql)
--
-- NÃO mover este arquivo para supabase/migrations/: o Supabase CLI roda
-- todo .sql dessa pasta em ordem sequencial no próximo `db push`/`db reset`,
-- então um arquivo "down" ali seria aplicado automaticamente logo após o
-- "up". Rodar manualmente (psql ou SQL editor do Supabase) só se precisar
-- reverter.
--
-- Remove FK e coluna de cada tabela, ordem inversa da criação (queues
-- antes de teams). Diferente da 017, esta migration não criou nenhuma
-- linha nova em tenants — só adicionou coluna a tabelas existentes —
-- então não há nada a desfazer na tabela tenants em si.

-- ===================== queues =====================

-- 1. Remove a FK antes de poder dropar a coluna
ALTER TABLE public.queues DROP CONSTRAINT IF EXISTS queues_tenant_id_fkey;

-- 2. Remove a coluna (o índice idx_queues_tenant_id cai junto, é dependente dela)
ALTER TABLE public.queues DROP COLUMN IF EXISTS tenant_id;

-- ===================== teams =====================

-- 1. Remove a FK antes de poder dropar a coluna
ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_tenant_id_fkey;

-- 2. Remove a coluna (o índice idx_teams_tenant_id cai junto, é dependente dela)
ALTER TABLE public.teams DROP COLUMN IF EXISTS tenant_id;
