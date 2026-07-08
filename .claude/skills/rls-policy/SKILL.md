# Skill: rls-policy

## Objetivo
Padronizar a criação e revisão de políticas RLS (Row Level Security)
no Supabase do OSH, garantindo isolamento correto entre tenants.

## Quando usar esta skill
- Ao criar RLS para uma tabela nova
- Ao revisar RLS existente por suspeita de vazamento de dados
- Sempre em conjunto com a skill `tenant-audit` quando envolver tenant_id

## Regra geral do projeto (ver tenant-audit para detalhes)
- Tabelas **operacionais** (clients, tickets, teams, queues, projects,
  SLA, auditoria, FAQ, CSAT, RFC): isolamento **estrito** por tenant,
  sem bypass de Super Admin:
  ```sql
  ALTER TABLE nome_tabela ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "tenant_isolation_select" ON nome_tabela
    FOR SELECT USING (tenant_id = get_current_tenant_id());

  CREATE POLICY "tenant_isolation_insert" ON nome_tabela
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

  CREATE POLICY "tenant_isolation_update" ON nome_tabela
    FOR UPDATE USING (tenant_id = get_current_tenant_id());

  CREATE POLICY "tenant_isolation_delete" ON nome_tabela
    FOR DELETE USING (tenant_id = get_current_tenant_id());
  ```

- Tabela `tenants`: Super Admin tem acesso total, tenant vê só a si mesmo:
  ```sql
  CREATE POLICY "select_own_or_superadmin" ON tenants
    FOR SELECT USING (is_platform_admin() OR id = get_current_tenant_id());

  CREATE POLICY "superadmin_insert" ON tenants
    FOR INSERT WITH CHECK (is_platform_admin());

  CREATE POLICY "superadmin_update" ON tenants
    FOR UPDATE USING (is_platform_admin());
  ```

- Tabela `platform_admins`: só Super Admin acessa:
  ```sql
  CREATE POLICY "only_platform_admins_access" ON platform_admins
    FOR ALL USING (is_platform_admin());
  ```

## Checklist antes de aprovar uma policy nova
- [ ] RLS está habilitado (`ENABLE ROW LEVEL SECURITY`), não só a policy criada
- [ ] Usa `get_current_tenant_id()` / `is_platform_admin()` — nunca lógica
      duplicada ou hardcoded (ex: comparar e-mail/domínio)
- [ ] Não existe `OR is_platform_admin()` em tabela operacional
- [ ] Existe policy separada para cada operação (SELECT/INSERT/UPDATE/DELETE)
      — evitar `FOR ALL` em tabelas operacionais, pois dificulta auditoria
      granular (exceção: `platform_admins`, que é intencionalmente simples)
- [ ] Testado com pelo menos 2 tenants diferentes logados, confirmando
      que um não vê dado do outro

## Como testar uma policy manualmente
No SQL editor do Supabase, simular um usuário específico:
```sql
SET request.jwt.claims = '{"sub": "UUID_DO_USUARIO"}';
SELECT * FROM tickets; -- deve retornar só do tenant desse usuário
```

## Anti-padrões
- Confiar só em filtro no frontend (`.eq('tenant_id', tenantId)`) sem
  RLS no banco — RLS é a camada de verdade, frontend é só UX
- Policy que usa `auth.uid()` diretamente em vez de passar pela função
  `get_current_tenant_id()` (duplica lógica, dificulta manutenção)
- Esquecer de habilitar RLS em tabela nova (fica aberta por padrão)
