## Problema

A regra anterior escondia apenas `lock_status='locked'`. O ticket 00101012 está com `analyst_id = Junior Amaral` e `lock_status='unlocked'`, mas aparece em "Meus Tickets" do Junior porque a query lá usa `analyst_id.eq OR lock_owner_id.eq`. Resultado: ele continua na fila geral indevidamente.

## Correção

Alinhar o critério de ocultação na lista geral (`/tickets`) ao mesmo critério de "Meus Tickets":

Esconder por padrão qualquer ticket onde **outro usuário** seja `analyst_id` OU `lock_owner_id`. Continuar mostrando:
- Tickets do próprio usuário (analyst_id ou lock_owner_id = ele mesmo)
- Tickets sem analista e sem lock (novos / liberados / sem dono)

Reexibição (mantida): quando `clientFilter !== 'all'`, mostra tudo do cliente, inclusive os assumidos por outros.

Escopo (mantido): todos os usuários internos (analistas, super_admin, viewer, Otimizzo). Clientes não afetados.

Aviso visual (mantido): o `Alert` acima da tabela continua, recalculado pela nova regra.

## Detalhes técnicos

Arquivo único: `src/pages/Tickets.tsx`

Trocar nos dois blocos (filteredTickets ~488 e hiddenLockedCount ~537) a definição:

```ts
const isOwnedByOther =
  (
    (ticket.analyst_id && ticket.analyst_id !== profile?.id) ||
    (ticket.lock_status === "locked" && ticket.lock_owner_id && ticket.lock_owner_id !== profile?.id)
  );
const hideOwnedByOther = !isClient && clientFilter === "all" && isOwnedByOther;
```

Substituir `isLockedByOther`/`hideLockedByOther` por essas variáveis (renomear). Texto do Alert ajustado para "X ticket(s) já assumido(s) por outros analistas estão ocultos. Selecione um cliente para visualizá-los."

Atualizar `mem/features/ticket-list-hide-locked-by-others.md` (renomear conceito para "assumido por outro" = analyst_id OU lock locked por outro), e atualizar a entrada no `mem/index.md`.

Sem mudanças em backend, RLS ou em "Meus Tickets".
