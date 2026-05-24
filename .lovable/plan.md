## Objetivo

Exibir, na aba SLA do ticket, o histórico detalhado de pausas (quando pausou, quando retomou, status durante a pausa, duração e por quem) — usando os registros já gravados em `ticket_sla_pauses`.

## Mudanças

### 1. Hook novo: `src/hooks/useTicketSLAPauses.ts`
- Faz `select` em `ticket_sla_pauses` filtrando por `ticket_id`, ordenado por `paused_at` desc.
- Faz join leve via segunda query para buscar `full_name` dos `paused_by` / `resumed_by` em `profiles`.

### 2. `src/components/tickets/SLAHistoryTable.tsx`
- Chamar `useTicketSLAPauses(ticket.id)`.
- Após a tabela atual, adicionar nova seção "Histórico de Pausas do SLA" com tabela:
  - Colunas: Pausado em | Status | Retomado em | Duração | Pausado por | Retomado por
  - Linha em andamento (sem `resumed_at`) mostra badge "Em pausa" e calcula duração até `now()`.
  - Se não há pausas, esconde a seção.
- Formatar com `date-fns` + `ptBR` no padrão já usado (`dd/MM/yyyy HH:mm`).
- Status traduzido via `getStatusLabel` de `ticketUtils`.

## Fora de escopo

- Sem mudanças de banco (a tabela e o trigger já existem e gravam).
- Sem alteração em relatórios — o dado fica disponível para uso posterior.
