## Objetivo

Reduzir o ruído na lista geral de Tickets escondendo, por padrão, os tickets já bloqueados por algum analista (que aparecem em "Meus Tickets" dele). Esses tickets continuam existindo e podem ser trazidos de volta sempre que o usuário filtrar por um cliente específico.

Multi-status já existe (os status são checkboxes), então não há mudança de filtros — só ajuste de comportamento de ocultação.

## Comportamento

Tela: `/tickets` (lista geral)

Regra de ocultação padrão:
- Esconder tickets com `lock_status = 'locked'` quando o `lock_owner_id` for de outro usuário interno (não o próprio).
- Tickets do próprio usuário (que ele mesmo bloqueou) continuam aparecendo normalmente.
- Tickets não bloqueados (novos, liberados, sem dono) continuam aparecendo.

Quando reexibir os ocultos:
- Quando o filtro de Cliente estiver diferente de "Todos", a lista volta a mostrar todos os tickets daquele cliente, inclusive os bloqueados por outros analistas.

Escopo:
- Aplica para todos os usuários internos: analistas, super_admin, viewer e usuários do tenant Otimizzo.
- Clientes (`isClient`) não são afetados — eles já não veem a fila interna de analistas.

Indicação visual:
- Adicionar um aviso discreto acima da tabela quando houver tickets ocultos:
  `"X ticket(s) assumido(s) por outros analistas estão ocultos. Selecione um cliente para visualizá-los."`
  (só aparece quando `clientFilter === 'all'` e existe pelo menos 1 ticket oculto pela regra)

## Detalhes técnicos

Arquivo único: `src/pages/Tickets.tsx`

1. No `filteredTickets` (linha ~472), adicionar uma nova condição antes do `return`:
   ```ts
   const isLockedByOther =
     ticket.lock_status === "locked" &&
     ticket.lock_owner_id &&
     ticket.lock_owner_id !== profile?.id;
   const hideLockedByOther = !isClient && clientFilter === "all" && isLockedByOther;
   ```
   E incluir `!hideLockedByOther` no `return` final.

2. Calcular `hiddenLockedCount` (tickets que seriam mostrados se não fosse essa regra) para o aviso.

3. Renderizar o aviso (componente `Alert` já importado) logo acima da `<Table>` quando `hiddenLockedCount > 0`.

Sem mudanças em backend, RLS, migrations ou em "Meus Tickets" — apenas filtragem no frontend.

## Memória

Atualizar `mem://index.md` com referência a uma nova memória `mem://features/ticket-list-hide-locked-by-others` documentando a regra (ocultação padrão + reexibição via filtro de cliente).