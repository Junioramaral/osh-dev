## Objetivo

Permitir, ao resolver um ticket, selecionar outros tickets do mesmo cliente para vincular ao ticket atual (apenas referência, sem alterar status dos vinculados).

## Backend

**Nova tabela `public.ticket_links`** (migração):
- `ticket_id` (uuid, FK tickets, on delete cascade) — ticket "origem" (o que está sendo resolvido)
- `linked_ticket_id` (uuid, FK tickets, on delete cascade) — ticket vinculado
- `linked_by` (uuid, FK profiles)
- `linked_at` (timestamptz default now())
- `id`, `created_at` padrão
- Constraint `UNIQUE (ticket_id, linked_ticket_id)` + CHECK impedindo self-link
- GRANTs para `authenticated` e `service_role` (sem anon)
- RLS:
  - SELECT: usuários internos (analyst/super_admin/viewer/otimizzo) OU cliente do tenant dono do `ticket_id`
  - INSERT/DELETE: apenas usuários internos (analistas, super_admin, otimizzo)
- Índices em `ticket_id` e `linked_ticket_id`

## Frontend

**`TicketResolveDialog.tsx`** — adicionar seção "Vincular outros tickets do cliente" acima do botão de confirmar:
- Campo de busca (Input) que filtra por número OU título
- Lista de tickets do mesmo `client_id` (excluindo o ticket atual), com escopo:
  - Status abertos (qualquer status exceto `resolvido`/`cancelado`) **OU**
  - Resolvidos nos últimos 30 dias (`resolved_at >= now() - 30 days`)
  - Excluir RFCs (`record_type != 'rfc'`)
- Cada linha: checkbox + `#numero` + título + badge de status + data
- Mostrar contador "X ticket(s) selecionado(s)"
- Scroll interno (max-height ~240px) para listas grandes
- Estado inicial: vazio (nenhum selecionado)

**`useTicketActions.ts`** — estender `resolveTicketWithReason`:
- Aceitar parâmetro opcional `linkedTicketIds: string[]`
- Após o UPDATE do ticket, inserir em `ticket_links` (ignorar conflitos com `onConflict`)
- Adicionar registro no `ticket_history` listando os números vinculados (visibilidade no histórico)
- Invalidar query `ticket-links`

**Novo hook `useClientLinkableTickets(clientId, currentTicketId)`** — busca os tickets candidatos com o escopo definido.

**Exibição do vínculo no ticket** — adicionar pequena seção "Tickets vinculados" em `TicketDetails.tsx` (lista somente leitura com links navegáveis), exibindo registros de `ticket_links` onde `ticket_id = currentId` (e também onde `linked_ticket_id = currentId`, para mostrar vínculos reversos).

## Onde NÃO mexer

- `BulkStatusReasonDialog` (resolução em massa) — fora do escopo nesta iteração.
- Status, SLA, emails e fluxo de auto-alocação atuais permanecem inalterados.
- Tickets vinculados **não** mudam de status nem recebem email.

## Memória

Atualizar `mem://index.md` com nova entrada `mem://features/ticket-resolution-linking` descrevendo: tabela, escopo (abertos + resolvidos 30d), efeito (apenas referência), exibição reversa.
