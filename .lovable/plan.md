

# Suporte a Feriados na Configuração de Horas Úteis do SLA

## API de Feriados

Sim, existe a **Nager.Date API** — gratuita, sem autenticação, com feriados de 100+ países incluindo Brasil:

```
GET https://date.nager.at/api/v3/PublicHolidays/2026/BR
```

Retorna lista com `date`, `localName`, `name`, `fixed` (fixo/móvel), etc.

## Arquitetura

1. **Nova tabela `sla_holidays`** para armazenar feriados configurados
2. **Botão "Importar Feriados"** na seção de Horário Comercial do System Settings que chama a API Nager.Date
3. **Gestão manual** — adicionar/remover feriados individuais
4. **Integração no cálculo SLA** — tanto no SQL (`add_business_minutes`) quanto no TypeScript (`calculateBusinessMinutes`)

## Mudanças

### 1. Migração SQL — tabela `sla_holidays`

```sql
CREATE TABLE public.sla_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date date NOT NULL,
  name text NOT NULL,
  is_automatic boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(holiday_date)
);
```

RLS: super_admin gerencia, authenticated pode ler.

Atualizar a função `add_business_minutes()` para pular dias que existam em `sla_holidays`.

### 2. Frontend — System Settings

Abaixo da seção "Dias úteis", adicionar seção **Feriados**:
- Tabela com feriados do ano selecionado (date, name, ações)
- Botão **"Importar Feriados [ano]"** que chama a Nager.Date API via edge function
- Botão **"Adicionar Feriado"** para entrada manual
- Possibilidade de remover feriados individuais
- Seletor de ano

### 3. Edge Function `fetch-holidays`

Chama `https://date.nager.at/api/v3/PublicHolidays/{year}/BR`, retorna lista formatada. O frontend faz upsert na tabela `sla_holidays`.

### 4. Atualizar `businessHours.ts` (TypeScript)

Na função `calculateBusinessMinutes`, receber lista de feriados como parâmetro opcional e pular esses dias no cálculo. Os componentes que usam essa função (`SLAMetricsCards`, `ticketUtils`) passarão os feriados carregados do banco.

### 5. Atualizar função SQL `add_business_minutes`

Adicionar check contra `sla_holidays` no loop de dias — se a data atual for feriado, pular para o próximo dia útil.

## Detalhes Técnicos

- **API**: Nager.Date — `date.nager.at/api/v3/PublicHolidays/{year}/BR` (gratuita, sem API key)
- **Tabela**: `sla_holidays` com constraint unique em `holiday_date`
- **SQL**: Modificar `add_business_minutes()` para incluir `NOT EXISTS (SELECT 1 FROM sla_holidays WHERE holiday_date = current_date)` no check de dia útil
- **TypeScript**: `calculateBusinessMinutes()` recebe `holidays: string[]` (array de datas ISO) e pula esses dias
- **Arquivos modificados**: `SystemSettings.tsx`, `businessHours.ts`, `ticketUtils.tsx`, `SLAMetricsCards.tsx`, nova edge function, nova migração

