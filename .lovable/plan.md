

# Plano: Corrigir Relatório de Horas para Usar Tempo de Vida dos Tickets

## Problema Identificado

O relatório atual busca dados da tabela `ticket_time_logs`, que está **vazia** (0 registros). O usuário precisa que as horas sejam calculadas a partir do **Tempo de Vida** dos tickets, ou seja, a diferença entre a data de criação (`created_at`) e a data de resolução (`resolved_at`).

## Solucao Proposta

Modificar o hook `useClientHoursData.ts` para:
1. Buscar dados diretamente da tabela `tickets` (não mais de `ticket_time_logs`)
2. Calcular as horas automaticamente como: `(resolved_at - created_at)` em horas
3. Para tickets não resolvidos, usar a data atual como referência

---

## Alteracoes Detalhadas

### Arquivo: `src/hooks/useClientHoursData.ts`

**Mudanca principal:**
- **De:** Query na tabela `ticket_time_logs`
- **Para:** Query direta na tabela `tickets`

**Nova lógica de cálculo:**
```typescript
// Calcular horas de vida do ticket
const calculateTicketHours = (createdAt: string, resolvedAt: string | null): number => {
  const start = new Date(createdAt);
  const end = resolvedAt ? new Date(resolvedAt) : new Date();
  const diffMs = end.getTime() - start.getTime();
  return diffMs / (1000 * 60 * 60); // Converter para horas
};
```

**Nova query:**
```typescript
supabase
  .from("tickets")
  .select(`
    id,
    created_at,
    resolved_at,
    client_id,
    analyst_id,
    queue_id,
    team_id,
    ticket_type,
    segment,
    status,
    clients(name),
    queues(name),
    teams(name),
    profiles!tickets_analyst_id_fkey(full_name)
  `)
  .gte("created_at", startDate)
  .lte("created_at", endDate + "T23:59:59")
```

---

## Campos a Agregar

Para cada ticket, as horas serão calculadas e agregadas por:

| Dimensao | Fonte | Agrupamento |
|----------|-------|-------------|
| Por Cliente | `tickets.client_id` -> `clients.name` | Soma das horas de todos os tickets do cliente |
| Por Analista | `tickets.analyst_id` -> `profiles.full_name` | Soma das horas dos tickets atribuídos ao analista |
| Por Fila | `tickets.queue_id` -> `queues.name` | Soma das horas dos tickets na fila |
| Por Time | `tickets.team_id` -> `teams.name` | Soma das horas dos tickets do time |
| Por Tipo | `tickets.ticket_type` | Soma das horas por tipo (Incidente, Problema, etc.) |

---

## Exemplo de Cálculo

```text
Ticket #00000001:
  - Criado: 2025-11-26 13:32:34
  - Resolvido: 2025-12-16 17:46:39
  - Tempo de Vida: ~484 horas (20.2 dias)
  - Cliente: Cliente X
  - Analista: João
  - Fila: Suporte N1
  - Time: Time DB
  - Tipo: Incidente

Este ticket contribui com 484h para:
  - Total do Cliente X
  - Total do Analista João
  - Total da Fila Suporte N1
  - Total do Time DB
  - Total de Incidentes
```

---

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/hooks/useClientHoursData.ts` | Reescrever para buscar tickets diretamente e calcular horas de vida |
| `src/components/reports/ClientHoursReport.tsx` | Ajustar labels (de "Registros" para "Tickets") |

---

## Detalhes da Implementacao

### 1. Nova funcao de calculo de horas

```typescript
const calculateTicketHours = (createdAt: string, resolvedAt: string | null): number => {
  const start = new Date(createdAt);
  const end = resolvedAt ? new Date(resolvedAt) : new Date();
  const diffMs = end.getTime() - start.getTime();
  // Retornar horas com 1 casa decimal
  return Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
};
```

### 2. Filtros de periodo

O filtro de período será aplicado à data de criação do ticket (`created_at`), mantendo a mesma lógica:
- Mês Atual: tickets criados no mês atual
- Mês Anterior: tickets criados no mês anterior
- Últimos 3 meses: tickets criados nos últimos 3 meses
- Últimos 6 meses: tickets criados nos últimos 6 meses

### 3. Tratamento de tickets sem analista

Para tickets sem analista atribuído (`analyst_id = null`), será criada uma categoria "Não Atribuído" nos gráficos.

---

## Resultado Esperado

Após a implementação, o relatório mostrará:

1. **Cards de Resumo:**
   - Total de Horas (soma do tempo de vida de todos os tickets)
   - Média de Horas por Ticket
   - Total de Tickets
   - Analistas Únicos

2. **Gráficos:**
   - Horas por Analista (com "Não Atribuído" quando aplicável)
   - Horas por Fila (com "Sem Fila" quando aplicável)
   - Horas por Time (com "Sem Time" quando aplicável)
   - Horas por Tipo de Ticket

3. **Tabela de Clientes:**
   - Nome do cliente
   - Total de horas consumidas
   - Quantidade de tickets
   - Média de horas por ticket
   - Principal analista

