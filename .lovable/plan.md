
# Corrigir "Não registrado" na Resolucao de RFC

## Problema

Quando uma RFC e resolvida, o campo `resolved_by` no banco de dados esta NULL, fazendo o sidebar exibir "Por: Nao registrado". Isso acontece porque o fluxo de resolucao nao salvou o nome do analista corretamente.

## Solucao

Duas acoes complementares:

### 1. Fallback no TicketSidebar (correcao visual imediata)

**Arquivo: `src/components/tickets/TicketSidebar.tsx`**

Quando `ticket.resolved_by` estiver vazio, buscar o nome do usuario que resolveu a partir do `ticket_history` (evento "resolved" com `user_id` preenchido). O historico ja tem essa informacao vinculada ao profile.

- Usar os dados de `ticket_history` que ja sao carregados pelo hook `useTicketHistory`
- Buscar o evento do tipo "resolved" e pegar o `profiles.full_name` associado
- Exibir esse nome como fallback em vez de "Nao registrado"

### 2. Garantir que `resolved_by` seja preenchido em todos os fluxos

**Arquivo: `src/hooks/useTicketActions.ts`**

Verificar e reforcar que o `updateTicketStatus` tambem preencha `resolved_by` quando o status muda para "resolvido". Atualmente, apenas o `resolveTicketWithReason` faz isso. Adicionar logica no `updateTicketStatus` para buscar o nome do usuario logado e preencher `resolved_by` e `resolved_at` quando status = "resolvido".

---

## Detalhe Tecnico

### TicketSidebar.tsx

- Importar `useTicketHistory` do hook existente
- Na secao do "Ticket Resolvido", se `ticket.resolved_by` for null/vazio:
  - Buscar no historico o evento com `action_type === 'resolved'`
  - Usar `event.profiles?.full_name` como fallback
  - Se tambem nao encontrar, manter "Nao registrado"

### useTicketActions.ts - updateTicketStatus

- Quando `status === "resolvido"`, buscar o perfil do usuario logado (`auth.getUser()` + `profiles`)
- Incluir `resolved_by: full_name` e `resolved_at: new Date().toISOString()` no update

### Arquivos a modificar

- `src/components/tickets/TicketSidebar.tsx`
- `src/hooks/useTicketActions.ts`

### Correcao de dados existentes

Alem do codigo, executar um UPDATE SQL para corrigir o ticket atual que ja esta com `resolved_by` NULL, preenchendo com o nome do analista que resolveu (disponivel no ticket_history).
