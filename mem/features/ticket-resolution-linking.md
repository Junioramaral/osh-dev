---
name: Ticket Resolution Linking
description: Vincular tickets relacionados no diálogo "Motivo da Resolução" — tabela ticket_links, escopo abertos + resolvidos 30d, apenas referência
type: feature
---
Tabela `public.ticket_links` (ticket_id, linked_ticket_id, linked_by, linked_at) com UNIQUE(ticket_id, linked_ticket_id) e CHECK no-self.

No `TicketResolveDialog` (resolução individual via `TicketSidebar`), seção opcional "Vincular outros tickets do cliente":
- Lista tickets do mesmo `client_id`, excluindo o atual e RFCs
- Escopo: status != resolvido E != fechado, OU `resolved_at` nos últimos 30 dias
- Busca por número ou título; múltipla seleção via checkbox
- Persistência em `ticket_links` via `useTicketActions.resolveTicketWithReason` (upsert ignoreDuplicates)
- Registra entrada `ticket_history` com action_type `linked_tickets` listando os números

Efeito: **apenas referência**. Tickets vinculados NÃO mudam de status, NÃO recebem email, SLA inalterado.

Exibição em `TicketDetails` via `TicketLinkedTicketsCard`: mostra vínculos bidirecionais (forward + reverse) com link navegável.

RLS: SELECT para internos sempre; cliente vê apenas se ticket pertence ao seu tenant. INSERT/DELETE só usuários internos.

Bulk resolution (`BulkStatusReasonDialog`) NÃO suporta vínculo nesta iteração.