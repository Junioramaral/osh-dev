# Skill: tenant-audit

## Objetivo
Auditar e validar a implementação da arquitetura multi-tenant do OSH,
garantindo que o código e o banco sigam fielmente o design oficial
(ver `docs/multitenant-design.md` ou o histórico de migrations 001-013).

## Arquitetura de referência (fonte da verdade)

```
SUPER ADMIN (otimizzo.com — dono da plataforma)
  └── TENANT (consultorias que compram o OSH — incluindo a própria otimizzo.com)
        └── CLIENT (clientes de cada consultoria)
              └── TICKETS / TIMES / FILAS / PROJETOS / SLA / etc.
```

### Entidades e onde vivem

| Conceito | Onde está | Escopo |
|---|---|---|
| Super Admin | tabela `platform_admins` (user_id + is_active) | Global, não pertence a nenhum tenant |
| `is_platform_owner` | coluna BOOLEAN na tabela `tenants` | Flag apenas no registro do tenant otimizzo — não confere privilégio de acesso, é só identificação |
| Tenant | tabela `tenants` | Consultoria (inclui a própria otimizzo como tenant) |
| Vínculo usuário↔tenant | tabela `tenant_users` (tenant_id, user_id, role: owner/admin/viewer) | Define a qual tenant o usuário pertence e seu papel |
| Client | tabela `clients` com `tenant_id` | Cliente de uma consultoria específica |

### ⚠️ Regra crítica #1 — Super Admin NÃO tem bypass de dados
O Super Admin (`platform_admins`) **não enxerga dados operacionais de
nenhum tenant** — nem tickets, nem clients, nem SLA, nem auditoria.
Ele só gerencia a tabela `tenants` (criar, suspender, reativar, mudar
plano) e a tabela `platform_admins` (adicionar/remover outros admins).

❌ **Anti-padrão que já foi corrigido nesta skill**: policies RLS com
`USING (tenant_id = get_current_tenant_id() OR is_platform_admin())`
em tabelas operacionais. **Isso está ERRADO** para este projeto — não
usar esse padrão em `clients`, `tickets`, `teams`, `queues`, `projects`,
tabelas de SLA, auditoria, FAQ, CSAT, RFC, etc.

✅ Nessas tabelas, a policy correta é **apenas**:
```sql
USING (tenant_id = get_current_tenant_id())
```
Sem `OR`, sem exceção para Super Admin.

O `OR is_platform_admin()` só é válido nas policies da própria tabela
`tenants` (para SELECT/INSERT/UPDATE) e `platform_admins`.

### ⚠️ Regra crítica #2 — otimizzo.com tem dupla identidade
A otimizzo.com é, ao mesmo tempo:
1. **Super Admin da plataforma** — via linha em `platform_admins`
   (`suporte@otimizzo.com`)
2. **Um tenant normal** — com `is_platform_owner = true` em `tenants`,
   e clients reais: ATPPOA, Adentro Tecnologia LTDA, sec4file, lexisflow

Essas duas identidades **não devem se misturar** no código. Quando o
usuário `suporte@otimizzo.com` está operando como tenant (vendo tickets
de ATPPOA, por exemplo), ele passa pelas mesmas regras de qualquer
outro tenant — `is_platform_owner` não deve virar atalho de permissão
em lugar nenhum fora da tela `/platform`.

## Quando usar esta skill
Invocar sempre que for:
- Revisar/criar policies RLS em qualquer tabela que tenha `tenant_id`
- Investigar bug de vazamento de dados entre tenants
- Mexer em `TenantContext`, `useTenant`, ou rotas `/platform/*` e `/app/admin/*`
- Auditar se uma nova tabela recebeu `tenant_id` e RLS corretamente
- Revisar as migrations 001 a 014 (setup inicial) antes de aplicar
- Revisar as partes 5 e 6 do frontend (contexto/hooks e painéis admin)

## Checklist de auditoria

### 1. Tabelas base (migrations 001-003)
- [ ] `tenants` tem `is_platform_owner` (não confundir com controle de acesso)
- [ ] `platform_admins` é referenciada por `user_id`, não por tenant
- [ ] `tenant_users` tem UNIQUE(tenant_id, user_id) e `role` (owner/admin/viewer)

### 2. Funções helper (migration 004)
- [ ] `get_current_tenant_id()` usa `SECURITY DEFINER` e filtra por
      `user_id = auth.uid() AND is_active = true`
- [ ] `is_platform_admin()` também `SECURITY DEFINER`, checa `platform_admins`
- [ ] Nenhuma outra função ou policy duplica essa lógica manualmente —
      sempre reusar as duas funções acima

### 3. tenant_id nas tabelas existentes (migrations 005-010)
- [ ] Toda tabela operacional (clients, teams, queues, projects, tickets,
      SLA, auditoria, FAQ, CSAT, RFC) tem `tenant_id UUID NOT NULL
      REFERENCES tenants(id)`
- [ ] `clients` também ganhou `is_active` e `max_analysts` conforme o
      design original
- [ ] Nenhuma tabela ficou de fora do grupo (checar todas as que citam
      `sla_*`, `action_type/old_value/new_value`, `article_id/faq_history`,
      `csat_rating/feedback_token`, `rfc_progress/frequency`)

### 4. Índices (migration 011)
- [ ] Todo `tenant_id` tem índice simples
- [ ] `tickets` tem os compostos: `(tenant_id, client_id)` e
      `(tenant_id, status)`
- [ ] `tenant_users` tem índice em `user_id` E em `tenant_id`

### 5. RLS (migration 012) — o mais crítico
- [ ] Tabelas operacionais: policies SELECT/INSERT/UPDATE/DELETE usando
      **somente** `tenant_id = get_current_tenant_id()`, sem bypass de
      Super Admin
- [ ] `tenants`: SELECT usa `is_platform_admin() OR id = get_current_tenant_id()`;
      INSERT e UPDATE usam **apenas** `is_platform_admin()`
- [ ] `platform_admins`: `FOR ALL USING (is_platform_admin())`, nenhuma
      outra tabela deveria ter acesso a essa tabela
- [ ] RLS está **habilitado** em todas (checar `ENABLE ROW LEVEL SECURITY`,
      não só a existência da policy)

### 6. Trigger de onboarding (migration 013)
- [ ] `handle_new_tenant_owner()` roda `AFTER INSERT ON tenants` e cria
      automaticamente o registro em `tenant_users` com `role = 'owner'`
      usando `auth.uid()` de quem criou o tenant
- [ ] Confirmar que isso não quebra o fluxo quando é o **Super Admin**
      criando um tenant para outra empresa (nesse caso `auth.uid()` é do
      Super Admin, não do dono real do tenant — validar se é isso mesmo
      que o negócio quer, ou se precisa de ajuste)

### 7. Seed inicial (migration 014)
- [ ] Idempotente — usa `ON CONFLICT DO NOTHING` onde aplicável
- [ ] Tenant otimizzo criado com `is_platform_owner = true`, plano
      `enterprise`, `max_clients = 100`, `max_users = 999`
- [ ] 4 clients reais (ATPPOA, Adentro Tecnologia LTDA, sec4file,
      lexisflow) vinculados ao `tenant_id` correto da otimizzo
- [ ] `suporte@otimizzo.com` aparece em **ambas** as tabelas:
      `platform_admins` E `tenant_users` (role owner, tenant otimizzo)

### 8. Frontend — TenantContext e hooks (parte 5)
- [ ] `TenantContextType` expõe: `tenantId`, `tenant`, `currentClientId`,
      `setCurrentClient`, `isSuperAdmin`, `isLoading`
- [ ] `isSuperAdmin` vem de checar `platform_admins`, nunca de comparar
      e-mail/domínio no frontend
- [ ] `currentClientId` persiste em `sessionStorage`
- [ ] Redirecionamentos: sem tenant → `/onboarding`; `tenant.is_active
      = false` → tela de conta suspensa
- [ ] **Toda query Supabase** que hoje filtra só por `client_id` também
      filtra por `tenant_id` — `tenantId` sempre vindo do contexto,
      nunca de input do usuário/URL
- [ ] Tela de seleção de client aparece só quando o tenant tem mais de
      1 client ativo

### 9. Frontend — Rotas e painéis (parte 5 e 6)
- [ ] `/app/*` — exige tenant ativo
- [ ] `/app/admin/*` — exige role `owner` ou `admin` no tenant atual
- [ ] `/platform/*` — exige `isSuperAdmin === true`; qualquer outro
      usuário é redirecionado para `/app`
- [ ] Painel `/platform/tenants/:id` **não exibe** dados internos
      (sem tickets, sem clients, sem chamados) — só metadados do tenant
- [ ] Ações de "remover" em `/app/admin/clients` e `/app/admin/users`
      são sempre soft-delete (`is_active = false`), nunca DELETE

## Processo de auditoria sugerido
1. Rodar este checklist migration por migration, na ordem 001→014
2. Depois auditar o frontend (parte 5 e 6) separadamente
3. Qualquer item que falhar → registrar em relatório markdown antes
   de corrigir (padrão `otimizzo-dba-playbook`)
4. Mudança em RLS ou schema de tenant → propor migração e **aguardar
   aprovação** (já bloqueado por padrão em `.claude/settings.json`)

## Anti-padrões a evitar
- `OR is_platform_admin()` em policies de tabelas operacionais (só vale
  em `tenants` e `platform_admins`)
- Comparar e-mail/domínio (`user.email === 'suporte@otimizzo.com'`) no
  frontend para decidir permissão — sempre usar `isSuperAdmin` do contexto
- Tratar `is_platform_owner` como se fosse permissão de acesso — é só
  identificação de qual tenant é o da própria otimizzo
- DELETE físico em `clients`, `tenant_users` ou `tenants` — sempre
  `is_active = false` / `suspended_at`
- Query Supabase filtrando só por `client_id` sem também filtrar por
  `tenant_id`
