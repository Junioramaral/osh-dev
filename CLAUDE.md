# OSH — Helpdesk/Ticketing SaaS

## Stack
- React + TypeScript + Vite
- Supabase (Auth, Postgres, RLS, Storage)
- Deploy: Hostinger
- GitHub: Junioramaral/osh-dev

## Arquitetura multi-tenant (EM IMPLEMENTAÇÃO)

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
| `is_platform_owner` | coluna BOOLEAN na tabela `tenants` | Flag só de identificação do tenant otimizzo — **não** é controle de acesso |
| Tenant | tabela `tenants` | Consultoria (inclui a própria otimizzo como tenant) |
| Vínculo usuário↔tenant | tabela `tenant_users` (tenant_id, user_id, role: owner/admin/viewer) | Define a qual tenant o usuário pertence e seu papel |
| Client | tabela `clients` com `tenant_id` | Cliente de uma consultoria específica |

### ⚠️ Regra crítica #1 — Super Admin NÃO tem bypass de dados
O Super Admin (`suporte@otimizzo.com`, via `platform_admins`) **não
enxerga dados operacionais de nenhum tenant** — nem tickets, nem
clients, nem SLA, nem auditoria. Ele só gerencia:
- a tabela `tenants` (criar, suspender, reativar, mudar plano)
- a tabela `platform_admins` (adicionar/remover outros admins)

Nunca usar `OR is_platform_admin()` em policies RLS de tabelas
operacionais (clients, tickets, teams, queues, projects, SLA,
auditoria, FAQ, CSAT, RFC). Ver skill `rls-policy` e `tenant-audit`.

### ⚠️ Regra crítica #2 — otimizzo.com tem dupla identidade
A otimizzo.com é, ao mesmo tempo:
1. **Super Admin da plataforma** — via linha em `platform_admins`
2. **Um tenant normal** — `is_platform_owner = true` em `tenants`,
   com clients reais: ATPPOA, Adentro Tecnologia LTDA, sec4file, lexisflow

Essas identidades não se misturam no código. Quando `suporte@otimizzo.com`
opera como tenant (vendo tickets de ATPPOA, por exemplo), segue as
mesmas regras de qualquer outro tenant.

## Estrutura de pastas
- `/src/components` — componentes React
- `/src/contexts` — `TenantContext.tsx`
- `/src/hooks` — `useTenant.ts` e demais hooks
- `/src/pages` — páginas/rotas (`SelectClient.tsx`, `AccountSuspended.tsx`, etc.)
- `/src/lib` — cliente Supabase, helpers
- `/supabase/migrations` — migrações SQL numeradas sequencialmente

## Banco de dados

### Tabelas centrais do multi-tenant
- `tenants` — id, name, slug, plan, is_active, is_platform_owner,
  max_clients, max_users, logo_url, primary_color, custom_domain,
  suspended_at, suspended_reason
- `platform_admins` — user_id, email, name, is_active
- `tenant_users` — tenant_id, user_id, role (owner/admin/viewer), is_active

### Funções helper (usar sempre, nunca duplicar lógica)
```sql
get_current_tenant_id() -- retorna tenant_id do usuário logado
is_platform_admin()     -- true se usuário está em platform_admins
```

### RLS — regra geral
- Tabelas operacionais: `USING (tenant_id = get_current_tenant_id())`,
  sem exceção para Super Admin
- Tabela `tenants`: Super Admin tem acesso total (`is_platform_admin()`),
  tenant comum só vê a si mesmo
- Tabela `platform_admins`: acesso restrito só a `is_platform_admin()`
- RLS habilitado em **toda** tabela nova com dado de tenant, na mesma
  migration que a cria
- Não editar migrações já aplicadas — sempre criar uma nova

### Soft delete
Nunca usar `DELETE` em `clients`, `tenant_users` ou `tenants`.
Sempre `is_active = false` (ou `suspended_at` / `suspended_reason` no
caso de tenants).

## Domínio do produto (tickets)
- Tickets têm: prioridade, status, SLA, `tenant_id`, `client_id`
- Alertas de ticket de alta prioridade via Twilio (SMS/WhatsApp/call),
  respeitando horário comercial America/Sao_Paulo e cooldown anti-spam

## Frontend — Contexto multi-tenant
`TenantContext` expõe: `tenantId`, `tenant`, `currentClientId`,
`setCurrentClient`, `isSuperAdmin`, `isLoading`.

- `isSuperAdmin` vem de checar `platform_admins` — nunca comparar
  e-mail/domínio direto no frontend
- `currentClientId` persiste em `sessionStorage`
- Toda query Supabase que filtra por `client_id` também filtra por
  `tenant_id` — `tenantId` sempre vindo do contexto, nunca de
  input do usuário/URL

## Rotas e proteção
- `/app/*` — exige tenant ativo
- `/app/admin/*` — exige role `owner` ou `admin` no tenant atual
- `/platform/*` — exige `isSuperAdmin === true`; outros usuários são
  redirecionados para `/app`
- `/platform/tenants/:id` nunca exibe dados internos do tenant (sem
  tickets, sem clients) — só metadados

## Fluxo Git
- GitFlow-lite: `feature/xxx` → `dev` → `main`
- `dev` = ambiente OSH-DEV (Supabase CLI dump/restore)
- Nunca commitar `.env.local` ou chaves Supabase

## Convenções de código
- TypeScript estrito, sem `any` sem justificativa
- Componentes funcionais + hooks
- Nomes de arquivos: PascalCase para componentes, camelCase para hooks/utils

## Skills disponíveis (`.claude/skills/`)
- **tenant-audit** — auditoria completa da arquitetura multi-tenant
  (usar antes/depois de qualquer mudança em tenant_id, RLS ou TenantContext)
- **migration-review** — checklist de revisão antes de aplicar migration
- **rls-policy** — padrão e checklist para criar/revisar policies RLS
- **pr-checklist** — checklist antes de abrir/aprovar PR

Sempre que a tarefa envolver banco, RLS ou estrutura de tenant,
invocar a skill relevante explicitamente antes de aplicar a mudança.
