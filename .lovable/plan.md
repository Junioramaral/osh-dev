

# Filtrar Filas de Atendimento por Analista no NewTicketDialog

## Problema
O seletor "Fila de Atendimento" na abertura de tickets mostra **todas** as filas ativas para qualquer usuário Otimizzo. Para analistas como `junior.amaral@otimizzo.com`, deveria mostrar apenas as filas atribuídas a ele no cadastro (Admin Tenants → Otimizzo → editar usuário).

## Solução

### Arquivo: `src/components/tickets/NewTicketDialog.tsx`

Na linha ~805-829, onde o seletor de filas é renderizado, filtrar a lista `queues` para analistas:

- Se `isAnalystOnly` for true, usar `analystQueues` (já buscado na linha 152) para filtrar a lista de filas exibidas
- Se for super_admin ou tenant_admin, manter comportamento atual (todas as filas)

Concretamente:
1. Criar uma variável `availableQueues` que, para analistas, filtra `queues` mantendo apenas aquelas cujo `id` está em `analystQueues`
2. Substituir `queues` por `availableQueues` no mapeamento do `SelectContent` (linha 819)
3. Atualizar a condição de exibição do seletor (linha 805) para usar `availableQueues`

Isso garante que o auto-assign por engine/produto também só selecione filas permitidas, já que o `setValue("queue_id", ...)` no useEffect já define a fila, mas o seletor visual mostrará apenas as permitidas.

