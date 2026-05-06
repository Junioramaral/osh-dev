## Objetivo

Quando uma RFC está salva como **Rascunho** (status `novo`), permitir que usuários Otimizzo editem os "Passos do Plano de Implementação" e tenham um botão para converter o rascunho em RFC formal (status `aguardando_aprovacao`).

## Comportamento atual

- Ao criar uma RFC, o usuário pode escolher entre "Salvar Rascunho" (status `rascunho`) ou "Solicitar Aprovação" (status `aguardando_aprovacao`).
- Após salvar, abrir a RFC em `/tickets/:id` mostra a aba **RFC** com `TicketRFCReport`, que é apenas leitura — uma tabela com progresso, status, início/fim, duração.
- Não existe nenhuma forma de editar os passos depois de criada nem de promover o rascunho.

## Mudanças

### 1. `src/components/tickets/TicketRFCReport.tsx` — modo edição para rascunhos

Adicionar lógica condicional no topo do componente:

- Receber o `ticket` completo (não só `ticketId`) para checar `record_type`, `status` e permissões.
- `isDraft = ticket.status === 'novo'` E `isOtimizzoUser` (via `useAuth`).
- Se `isDraft`: renderizar uma versão editável usando o `RFCStepBuilder` existente, carregando os passos atuais como estado inicial.
- Adicionar dois botões no rodapé do card:
  - **Salvar Alterações** → faz `delete` dos `rfc_steps` antigos e `insert` dos novos (mais simples e seguro do que diff). Alternativa: upsert por id, mas como o builder gera ids client-side, manter o delete-and-insert.
  - **Solicitar Aprovação** → primeiro salva os passos (mesma lógica acima), depois faz `update` em `tickets` mudando `status` para `aguardando_aprovacao` e insere um comentário interno "RFC enviada para aprovação por {usuário}", igual ao fluxo do `RFCFormSection`.
- Se NÃO for rascunho: manter exatamente a tabela read-only atual.

### 2. `src/pages/TicketDetail.tsx`

Trocar `<TicketRFCReport ticketId={ticket.id} />` por `<TicketRFCReport ticket={ticket} />` para passar o ticket completo.

### 3. Cache invalidation

Após salvar/promover, invalidar as queries:

- `["ticket", ticketId]`
- `["rfc-steps", ticketId]` (ou nome equivalente usado por `useTicketRFCSteps`)
- `["tickets"]` (lista)

### 4. Validação

- Pelo menos 1 passo obrigatório, igual à criação.
- Botão "Solicitar Aprovação" desabilitado se `steps.length === 0`.

## Detalhes técnicos

- O `RFCStepBuilder` já expõe `steps` + `onStepsChange`. Hidratamos o estado inicial mapeando os `rfc_steps` do banco para o shape `RFCStep` esperado (`{ id, descricao, ordem, procedimento, scripts }`).
- O delete-and-insert deve rodar dentro de um try/catch único; em caso de erro no insert, o usuário vê toast de erro e os passos antigos já foram apagados — para mitigar, podemos fazer insert primeiro com novos ids, depois deletar os antigos pelo `ticket_id` excluindo os recém-inseridos. Vou usar essa abordagem mais segura.
- RLS em `rfc_steps` já permite Otimizzo gerenciar (`Otimizzo manage rfc_steps`), então sem mudanças de banco.
- Sem migrations necessárias.

## Arquivos a editar

- `src/components/tickets/TicketRFCReport.tsx`
- `src/pages/TicketDetail.tsx`