## Objetivo

Tornar a lista de tickets vinculados mais visível para o analista, sem depender de abrir a aba "Detalhes". O card já existe (`TicketLinkedTicketsCard`) e só aparece quando há vínculos — vamos exibi-lo também na aba "Anexos" e na barra lateral.

## Onde aparecer

1. **Aba "Anexos"** (`TicketAttachments`) — adicionar o card `TicketLinkedTicketsCard` acima/ao lado da lista de anexos. Como o card já retorna `null` sem vínculos, ele só aparece quando relevante.
2. **Sidebar do ticket** (`TicketSidebar`) — adicionar uma versão compacta do card no final da sidebar, visível em todas as abas (Detalhes, SLA, Timeline, Comentários, Anexos, Relatório). Assim o analista enxerga os vínculos esteja onde estiver.
3. **Manter** o card na aba Detalhes (já existe), pois é o lugar natural para o contexto completo.

## Como ficará

```text
+----------------------- Aba Anexos -----------------------+   +---- Sidebar ----+
| [Tickets Vinculados (N)]   (só aparece se houver)        |   | SLA / Status    |
|   #00101013  em_atendimento  Título do ticket            |   | Analista        |
|   #00101010  resolvido       Outro ticket                |   | Tempo           |
|                                                          |   | ...             |
| [Anexos]                                                 |   | [Vinculados (N)]|
|   arquivo1.pdf                                           |   |  #00101013      |
+----------------------------------------------------------+   +-----------------+
```

## Detalhes técnicos

- **`src/components/tickets/TicketAttachments.tsx`**: importar `TicketLinkedTicketsCard` e renderizá-lo antes do bloco de anexos, dentro de um `<div className="space-y-6">`. Passar `ticketId={ticket.id}`.
- **`src/components/tickets/TicketSidebar.tsx`**: importar `TicketLinkedTicketsCard` e renderizar ao final do `aside` (após o último card existente). Como o componente já retorna `null` quando `links.length === 0`, nada muda visualmente para tickets sem vínculo.
- **Sem mudanças** em hooks, banco, RLS ou no `TicketLinkedTicketsCard` em si — ele já tem a query, dedup e o early-return.
- **Sem mudanças** na aba "Detalhes" — o card continua lá.

## Atualização de memória

Atualizar `mem/features/ticket-resolution-linking.md` registrando que o card de vínculos é exibido em três lugares: aba Detalhes, aba Anexos e sidebar (sempre condicional à existência de vínculos).
