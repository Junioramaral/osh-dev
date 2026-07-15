-- Migration 021 do plano de refatoração multi-tenant.
-- Adiciona deleted_at a public.clients — passo 1 da troca de hard delete
-- por soft delete no fluxo de exclusão de tenant (TenantAdmin.tsx).
--
-- deleted_at é a ÚNICA fonte de verdade para "este client foi excluído
-- ou não" — deliberadamente separada de:
-- - status (ativo/inativo/suspenso): granularidade comercial, editada
--   via ClientForm.tsx, sem relação com exclusão
-- - is_active (boolean): flag técnica alternada por toggleTenantStatus
--   em TenantAdmin.tsx, também sem relação com exclusão
-- As duas colunas continuam existindo com seus significados atuais,
-- intocadas por esta migration.
--
-- Índice parcial (WHERE deleted_at IS NULL) otimiza a query mais comum:
-- listar só os clients não-excluídos.
--
-- Sem UPDATE/backfill: coluna nova fica NULL para os 5 clients
-- existentes (nenhum foi excluído até hoje).
--
-- Rollback: supabase/migrations_rollback/20260730120000_add_clients_deleted_at_down.sql

ALTER TABLE public.clients ADD COLUMN deleted_at timestamptz NULL;

CREATE INDEX idx_clients_deleted_at ON public.clients(deleted_at)
  WHERE deleted_at IS NULL;
