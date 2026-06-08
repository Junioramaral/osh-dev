## Objetivo
Permitir que analistas do tenant dono (Otimizzo) editem inline os campos **Tipo**, **Categoria** e **Subcategoria** no card "Detalhes do Ticket", usando um ícone de lápis que vira ícone de salvar.

## Quem pode editar
Apenas usuários com `isOtimizzoUser === true` (tenant dono) e que sejam analistas/admins. Para clientes finais o card continua somente leitura (sem ícone).

## UX
- No header do card "Detalhes do Ticket", botão ícone discreto:
  - Estado normal: ícone **Pencil** (lápis) → entra em modo edição.
  - Estado edição: ícone **Check** (salvar) + ícone **X** (cancelar) ao lado.
- Em modo edição, as três linhas (Tipo, Categoria, Subcategoria) transformam o valor à direita em `Select`:
  - **Tipo**: opções fixas (`incidente`, `duvida`, `problema`, `service_request`) com labels via `getTicketTypeLabel`.
  - **Categoria**: carrega de `ticket_categories` filtrando por `segment = ticket.segment` (mesmo padrão do `NewTicketDialog`).
  - **Subcategoria**: carrega de `ticket_subcategories` filtrando por `category_id` da categoria selecionada. Limpa quando a categoria muda.
- Botão salvar fica desabilitado enquanto carrega/sem mudanças. Ao salvar com sucesso: toast, refetch do ticket, sai do modo edição.

## Implementação

### Arquivo: `src/components/tickets/TicketDetails.tsx`
- Receber `ticket` (já recebe) e usar `useAuth()` para detectar permissão.
- Converter o "Card 3: Detalhes do Ticket" em um sub-componente com estado local `isEditing`, `formValues` (tipo, categoria, subcategoria).
- Adicionar botões de ação no `CardHeader` (lápis / salvar+cancelar).
- Carregar categorias e subcategorias via React Query usando `supabase` (mesmo padrão do `NewTicketDialog.tsx` linhas ~445-457).
- Render condicional do valor: `Select` quando editando, texto quando não.

### Persistência
- Novo hook `useUpdateTicketDetails` (ou inline `useMutation`) que faz:
  ```ts
  supabase.from('tickets').update({ ticket_type, category, subcategory }).eq('id', ticket.id)
  ```
- `onSuccess`: invalida `['ticket-detail', ticketId]` e `['ticket-history', ticketId]`; toast de sucesso.

### Histórico
- O trigger existente de `ticket_history` (já dispara em UPDATE) deve registrar a mudança automaticamente. Verificar; caso não cubra esses campos, registrar entrada manual com `record_change` ou inserir em `ticket_history` no client após o update (uma linha por campo alterado).

### RLS
- A policy de UPDATE em `tickets` já permite analistas do tenant Otimizzo atualizarem tickets atribuídos a eles / da sua fila. Sem mudanças de schema.

## Fora de escopo
- Edição dos demais campos (Frequência, Impacto, Iniciado em).
- Edição por clientes finais.
- Mudanças no fluxo de criação de ticket.
