-- Rollback da migration 021
-- (supabase/migrations/20260730120000_add_clients_deleted_at.sql)
--
-- NÃO mover este arquivo para supabase/migrations/: o Supabase CLI roda
-- todo .sql dessa pasta em ordem sequencial no próximo `db push`/`db reset`,
-- então um arquivo "down" ali seria aplicado automaticamente logo após o
-- "up". Rodar manualmente (psql ou SQL editor do Supabase) só se precisar
-- reverter.
--
-- Sem complicação: DROP COLUMN direto — não há dados reais
-- soft-deletados no DEV ainda (todos os 5 clients têm deleted_at NULL).
-- Se este rollback rodar depois que o app já estiver soft-deletando
-- clients de verdade, esses registros perdem o marcador de exclusão e
-- voltam a aparecer nas listagens — reverter com cautela nesse cenário.

ALTER TABLE public.clients DROP COLUMN IF EXISTS deleted_at;
