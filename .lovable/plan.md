

# Restringir filas para analistas na abertura de tickets e na listagem

## Problemas identificados

1. **NewTicketDialog**: O filtro de filas para analistas já foi implementado (linhas 805-835), mas o código depende da variável `analystQueues` que busca de `user_queues`. Preciso verificar se está funcionando corretamente — o select de fila ainda mostra todas as opções.

2. **Tickets.tsx (filtro de filas)**: A barra de filtro de filas (linha 536-575) usa `allQueues` que busca **todas** as filas ativas. Para analistas com `shouldRestrictView`, deveria mostrar apenas as filas atribuídas a eles via `user_queues`.

## Solução

### 1. `src/pages/Tickets.tsx` — Filtrar badges de filas para analistas

Na linha 552, onde `allQueues.map(...)` renderiza os badges de fila, substituir `allQueues` por uma lista derivada:
- Se `shouldRestrictView && hasQueues`: filtrar `allQueues` para mostrar apenas as filas cujo `id` está em `analystQueueIds`
- Caso contrário: mostrar todas as filas normalmente
- Remover o badge "Todas" para analistas restritos (já que só veem suas filas)
- Manter o badge "Sem fila" para analistas (eles também veem tickets sem fila)

### 2. `src/components/tickets/NewTicketDialog.tsx` — Confirmar que o filtro funciona

O código na linha 806 já filtra: `queues?.filter(q => analystQueues.includes(q.id))`. Isso deve estar funcionando. Vou verificar se `analystQueues` está sendo populado corretamente checando a query (linha 152-164). A query parece correta — busca `queue_id` de `user_queues` onde `user_id = profile.id` e `isAnalystOnly = true`.

Possível problema: o `isAnalystOnly` na linha 142 verifica `!isTenantAdmin`, mas o usuário pode ter role `tenant_admin` junto com `analyst_db`. Vou manter a lógica atual que parece correta para o caso descrito.

### Arquivos a editar

- **`src/pages/Tickets.tsx`**: Filtrar a lista de badges de filas com base nas filas atribuídas ao analista via `useAnalystQueues`

