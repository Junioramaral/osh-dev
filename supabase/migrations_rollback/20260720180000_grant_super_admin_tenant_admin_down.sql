-- Rollback da migration 019b
-- (supabase/migrations/20260720180000_grant_super_admin_tenant_admin.sql)
--
-- NÃO mover este arquivo para supabase/migrations/: o Supabase CLI roda
-- todo .sql dessa pasta em ordem sequencial no próximo `db push`/`db reset`,
-- então um arquivo "down" ali seria aplicado automaticamente logo após o
-- "up". Rodar manualmente (psql ou SQL editor do Supabase) só se precisar
-- reverter.
--
-- DELETE cirúrgico, não genérico: remove só a linha de tenant_users cujo
-- user_id é (ainda) um platform_admin, com role = 'tenant_admin' e
-- tenant_id = tenant Otimizzo. Não apaga outras linhas de tenant_users
-- que possam existir por outro motivo no futuro (ex: alguém promovido a
-- tenant_admin da Otimizzo por um caminho diferente desta migration).

DELETE FROM public.tenant_users
WHERE role = 'tenant_admin'
  AND tenant_id = (SELECT id FROM public.tenants WHERE is_platform_owner = true)
  AND user_id IN (SELECT user_id FROM public.platform_admins);
