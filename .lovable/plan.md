Foco apenas no relatório "Horas por Cliente".

## 1. Resumo detalhado por Ticket × Status

Adicionar um novo bloco "Resumo Detalhado por Cliente, Ticket e Status" abaixo do "Resumo por Cliente". Para cada ticket do período, mostrar o tempo passado em cada status que ele teve.

**Layout da tabela:**

```text
Cliente | Ticket  | Título               | Status               | Horas
ATPPOA  | #00012  | Erro no login        | Novo                 | 2h
                                          Em Atendimento       | 5h
                                          Aguardando Cliente   | 12h
                                          Resolvido            | 1h
        | #00015  | ...                  | ...                 | ...
```

Cliente, Ticket e Título usam `rowSpan` para agrupar visualmente as linhas de status do mesmo ticket.

**Como calcular o tempo por status:**
- Buscar `ticket_history` para os tickets do período, filtrando `action_type IN ('created', 'status_changed')`, ordenado por `created_at`.
- Reconstruir a linha do tempo: cada evento marca início do `new_value` (status novo). O fim de um status é o `created_at` do próximo evento, ou `resolved_at`/`now()` para o último.
- Somar a duração em horas (1 casa decimal) por status para cada ticket.
- Tickets sem histórico (legado) caem em um único registro com o status atual e duração = `(resolved_at ?? now) - created_at`.

Labels dos status em PT-BR via `getStatusLabel` (já existente em `src/lib/ticketUtils.tsx`).

## 2. Correção: resumo some ao selecionar um cliente específico

Em `ClientHoursReport.tsx` linha 407, o bloco "Resumo por Cliente" só renderiza quando `selectedClient === "all"`:

```tsx
{selectedClient === "all" && data.byClient.length > 0 && (
```

Remover a condição `selectedClient === "all"`. O resumo (e o novo detalhado por status) passam a aparecer também quando um cliente único é filtrado — nesse caso mostrarão apenas a linha/grupo desse cliente.

## Arquivos afetados

- `src/hooks/useClientHoursData.ts` — adicionar query de `ticket_history` dos tickets do período e expor `byClientTickets: { client_id, client_name, ticket_id, ticket_number, ticket_title, status_breakdown: { status, hours }[] }[]`.
- `src/components/reports/ClientHoursReport.tsx` — remover gate de `selectedClient === "all"` e adicionar a nova tabela detalhada (com `rowSpan` por ticket).

Sem alterações de schema/migrations.
