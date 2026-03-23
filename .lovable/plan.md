

# Corrigir isolamento de dados para role Viewer (Auditor)

## Problema

A role "viewer" (Auditor) possui políticas RLS que concedem acesso a **todos os dados de todos os tenants**. O usuário "Junior Amaral" do cliente Lexisflow (Auditor) consegue ver tickets do cliente Sec4File. Isso é uma **falha grave de isolamento de dados**.

## Causa raiz

A migração original criou todas as policies do viewer com `USING (is_viewer(auth.uid()))` sem filtrar por `tenant_id`/`client_id`. O viewer deveria ver apenas dados do seu próprio tenant.

## Solução

Criar uma migração SQL que **substitua** as políticas do viewer nas tabelas sensíveis, adicionando filtro por tenant (`get_user_tenant_id(auth.uid())`).

### Tabelas que precisam de restrição por tenant:

| Tabela | Filtro a adicionar |
|--------|-------------------|
| `tickets` | `client_id = get_user_tenant_id(auth.uid())` |
| `ticket_comments` | via subquery em tickets (já usa EXISTS) |
| `ticket_history` | via subquery em tickets (já usa EXISTS) |
| `ticket_time_logs` | via subquery em tickets |
| `machines` | `client_id = get_user_tenant_id(auth.uid())` |
| `database_instances` | `client_id = get_user_tenant_id(auth.uid())` |
| `application_instances` | `client_id = get_user_tenant_id(auth.uid())` |
| `client_contacts` | `client_id = get_user_tenant_id(auth.uid())` |
| `client_projects` | `client_id = get_user_tenant_id(auth.uid())` |
| `clients` | `id = get_user_tenant_id(auth.uid())` |
| `profiles` | próprio perfil + perfis do mesmo tenant |
| `faq_articles` | mesma regra de clients (client_specific + global) |

### Tabelas que podem manter acesso global (não sensíveis):

- `system_configs` — configurações globais do sistema
- `queues` — lista de filas (sem dados de cliente)
- `segments` — lista de segmentos
- `user_roles` — restringir ao próprio tenant também

### Migração SQL

Uma única migração que:
1. DROP de cada policy antiga do viewer
2. CREATE da nova policy com filtro por tenant

Exemplo para tickets:
```sql
DROP POLICY IF EXISTS "Viewers can view all tickets" ON public.tickets;
CREATE POLICY "Viewers can view tenant tickets"
  ON public.tickets FOR SELECT TO authenticated
  USING (is_viewer(auth.uid()) AND client_id = get_user_tenant_id(auth.uid()));
```

### Impacto
- Nenhuma mudança no frontend
- Viewers passam a ver apenas dados do próprio cliente
- Tabelas de configuração global continuam acessíveis

