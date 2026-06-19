## Diagnóstico — por que o ticket 00101013 não aparece na lista

Consultei o banco: o ticket existe normalmente, está como `resolvido`, `record_type='suporte'`, sem deleção. O `analyst_id` e o `lock_owner_id` apontam para o seu próprio usuário (Junior Amaral).

A causa do sumiço está em `src/pages/Tickets.tsx` (linhas 488-489), no filtro de tela:

```ts
const isAssumed = Boolean(ticket.analyst_id) || Boolean(ticket.lock_owner_id);
const hideAssumed = !isClient && clientFilter === "all" && isAssumed;
```

Pela regra "Ticket List Hide Owned By Others", qualquer ticket que tenha analista atribuído **ou** esteja locado é escondido da fila geral quando `clientFilter === "all"`. Como 00101013 está atribuído a você e locado, ele cai exatamente nessa regra — independentemente do status selecionado nos filtros. Por isso ele não aparece nem marcando todos os status.

### Por que ainda assim parece errado

A regra faz sentido para tickets em andamento (evita que apareçam na fila geral e em "Meus Tickets" ao mesmo tempo), mas tickets já **Resolvidos** ou **Fechados** não estão mais "em atendimento" por ninguém — esconder eles da lista geral surpreende, porque o usuário busca tickets encerrados para auditoria/consulta.

## Correção proposta

Ajustar a regra de ocultação para **não esconder tickets em status terminal** (`resolvido`, `fechado`). Tickets em andamento (novo, em_atendimento, aguardando_*, etc.) continuam ocultos da fila geral como hoje.

### Mudança

Em `src/pages/Tickets.tsx`, trocar:

```ts
const isAssumed = Boolean(ticket.analyst_id) || Boolean(ticket.lock_owner_id);
const hideAssumed = !isClient && clientFilter === "all" && isAssumed;
```

por:

```ts
const isAssumed = Boolean(ticket.analyst_id) || Boolean(ticket.lock_owner_id);
const isTerminalStatus = ticket.status === "resolvido" || ticket.status === "fechado";
const hideAssumed = !isClient && clientFilter === "all" && isAssumed && !isTerminalStatus;
```

Também aplicar a mesma correção no segundo `filter` (linha ~523) que recalcula o badge de ocultos, para que o aviso de "tickets ocultos" reflita só os realmente em andamento.

### Memória

Atualizar `mem/features/ticket-list-hide-locked-by-others.md` para registrar a exceção: tickets `resolvido`/`fechado` não são ocultados.

### Fora de escopo

- Não altero RLS nem queries do Supabase.
- Não mexo em "Meus Tickets" — tickets resolvidos seus continuam aparecendo lá normalmente também.