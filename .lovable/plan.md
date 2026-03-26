

# Replicar SLA do LexisFlow para todos os clientes e definir como padrão

## O que será feito

1. **Atualizar todos os clientes existentes** com os valores de SLA do LexisFlow via query de UPDATE
2. **Alterar os defaults** no `ClientDialog.tsx` e nos defaults da tabela `clients` no banco para que novos tenants já venham com esses valores
3. **Incluir SLA padrão na criação de tenants** em `TenantAdmin.tsx`

## Valores de SLA do LexisFlow (que serão o novo padrão)

| Prioridade | Segmento | First Response | Resolution |
|------------|----------|---------------|------------|
| P1 | DB/APP | 15 min | 240 min (4h) |
| P2 | DB/APP | 30 min | 480 min (8h) |
| P3 | DB/APP | 240 min (4h) | 2880 min (48h) |
| P4 | DB/APP | 1400 min (~23h) | 4320 min (72h) |

## Etapas

### 1. UPDATE em todos os clientes (migration SQL)
Criar migration para atualizar todos os clientes existentes e alterar os column defaults:

```sql
-- Atualizar todos os clientes com os valores do LexisFlow
UPDATE clients SET
  sla_db_p1_first_response = 15, sla_db_p1_resolution = 240,
  sla_db_p2_first_response = 30, sla_db_p2_resolution = 480,
  sla_db_p3_first_response = 240, sla_db_p3_resolution = 2880,
  sla_db_p4_first_response = 1400, sla_db_p4_resolution = 4320,
  sla_app_p1_first_response = 15, sla_app_p1_resolution = 240,
  sla_app_p2_first_response = 30, sla_app_p2_resolution = 480,
  sla_app_p3_first_response = 240, sla_app_p3_resolution = 2880,
  sla_app_p4_first_response = 1400, sla_app_p4_resolution = 4320;

-- Alterar defaults das colunas para novos tenants
ALTER TABLE clients
  ALTER COLUMN sla_db_p3_first_response SET DEFAULT 240,
  ALTER COLUMN sla_db_p3_resolution SET DEFAULT 2880,
  ALTER COLUMN sla_db_p4_first_response SET DEFAULT 1400,
  ALTER COLUMN sla_db_p4_resolution SET DEFAULT 4320,
  ALTER COLUMN sla_app_p3_first_response SET DEFAULT 240,
  ALTER COLUMN sla_app_p3_resolution SET DEFAULT 2880,
  ALTER COLUMN sla_app_p4_first_response SET DEFAULT 1400,
  ALTER COLUMN sla_app_p4_resolution SET DEFAULT 4320;
```

### 2. `src/components/clients/ClientDialog.tsx`
Atualizar os defaults do Zod schema e do `defaultValues` do formulário:
- P3 first_response: 60 → **240**
- P3 resolution: 960 → **2880**
- P4 first_response: 120 → **1400**
- P4 resolution: 1920 → **4320**
(P1 e P2 já estão com os mesmos valores)

### 3. `src/pages/TenantAdmin.tsx`
Na função `handleCreateTenant`, incluir os campos de SLA no insert para que novos tenants já sejam criados com os valores padrão explícitos.

## Arquivos alterados
- Nova migration SQL (UPDATE + ALTER DEFAULT)
- `src/components/clients/ClientDialog.tsx` — defaults do schema
- `src/pages/TenantAdmin.tsx` — incluir SLA no insert

