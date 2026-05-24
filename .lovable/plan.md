### Objetivo
Adicionar um novo controle "Alterar Prioridade" no card **Ações do Ticket** do TicketSidebar, posicionado logo abaixo de "Alterar Status". Permitir que analistas Otimizzo/SuperAdmin alterem a prioridade (P1 → P4) de tickets não resolvidos.

### Alterações

#### 1. `src/hooks/useTicketActions.ts`
- Adicionar mutation `updateTicketPriority` com assinatura `{ ticketId: string; priority: TicketPriority }`.
- Atualizar a tabela `tickets` (campo `priority`), invalidar queries `["tickets"]`, `["my-tickets"]`, `["ticket-detail"]` e exibir toast de sucesso/erro.
- Retornar `updateTicketPriority` no hook.

#### 2. `src/components/tickets/TicketSidebar.tsx`
- Importar a nova mutation `updateTicketPriority` e a função `getPriorityColor`.
- Adicionar, dentro do bloco visível para usuários autorizados (`!isResolved && !isViewer`), um novo `<Select>` rotulado **Alterar Prioridade** abaixo do "Alterar Status".
- O `<Select>` deve listar as opções: **P1 – Crítico**, **P2 – Alta**, **P3 – Média**, **P4 – Baixa**.
- Cada opção pode usar a cor de badge correspondente (`getPriorityColor`) para melhor identificação visual.
- O controle deve ficar desabilitado enquanto a mutation está em `isPending`.

### Escopo
- Somente UI e hook de atualização. Não altera regras de negócio, SLA ou histórico.
- Visível apenas para Otimizzo/SuperAdmin (mesma regra de "Alterar Status"). Viewers não veem.