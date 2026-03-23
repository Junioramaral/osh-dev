

# Aplicar filtro de filas restrito na tela Meus Tickets

## Problema
A tela "Meus Tickets" mostra todos os tickets atribuídos ao analista ou lockados por ele, sem filtrar por fila. Para analistas restritos, deveria mostrar apenas tickets das filas atribuídas ou tickets sem fila.

## Solução

### Arquivo: `src/pages/MyTickets.tsx`

1. **Extrair `queueIds` do hook `useAnalystQueues`** (linha 27) — já importado, só precisa desestruturar `queueIds` além de `queues`.

2. **Adicionar filtro de fila no `filteredTickets`** (linhas 313-324):
   - Para analistas com `shouldRestrictView && hasQueues`: adicionar condição que o ticket deve ter `queue_id` incluso em `queueIds` **ou** `queue_id` nulo (sem fila)
   - Super admins e não-restritos mantêm comportamento atual

3. **Adicionar um filtro de fila na UI** (opcional mas consistente com Tickets.tsx):
   - Não necessário — a página já é "Meus Tickets" e o filtro por fila é automático. A restrição será silenciosa, apenas impedindo tickets de filas não atribuídas de aparecerem.

### Mudança concreta

Na linha 27, adicionar `queueIds`:
```typescript
const { queues: analystQueues, queueIds: analystQueueIds, shouldRestrictView, hasQueues } = useAnalystQueues();
```

No bloco `filteredTickets` (linha 313-324), adicionar:
```typescript
const matchesQueue = !shouldRestrictView || !hasQueues || 
  !ticket.queue_id || analystQueueIds.includes(ticket.queue_id);
```

E incluir `matchesQueue` no return final do filter.

