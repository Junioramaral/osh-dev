-- Rollback da migration 019
-- (supabase/migrations/20260720120000_migrate_user_roles_data.sql)
--
-- NÃO mover este arquivo para supabase/migrations/: o Supabase CLI roda
-- todo .sql dessa pasta em ordem sequencial no próximo `db push`/`db reset`,
-- então um arquivo "down" ali seria aplicado automaticamente logo após o
-- "up". Rodar manualmente (psql ou SQL editor do Supabase) só se precisar
-- reverter.
--
-- Seguro rodar a qualquer momento nesse ponto do refactor: platform_admins,
-- tenant_users e client_users só têm o que a migration 019 inseriu (nada
-- mais escreve nelas ainda), então um DELETE sem filtro é equivalente a
-- um TRUNCATE, mas escrito como DELETE FROM de propósito. user_roles não
-- é tocada — ela continua intocada, como na migration 019.
--
-- Ordem: client_users, tenant_users, platform_admins (inversa da
-- inserção).

DELETE FROM public.client_users;
DELETE FROM public.tenant_users;
DELETE FROM public.platform_admins;
