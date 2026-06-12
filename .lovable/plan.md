## Problema

Ao tentar vincular tickets no diálogo "Resolver Ticket" do cliente ATPPOA, a lista vem vazia mesmo existindo o ticket `00101013` (status `novo`) do mesmo cliente. A busca por máscara (`0010*`) também não funciona porque depende da mesma lista.

## Causa raiz

O hook `useClientLinkableTickets` usa o filtro PostgREST:

```ts
.or(`and(status.neq.resolvido,status.neq.cancelado),resolved_at.gte.${thirtyDaysAgo}`)
```

O enum `ticket_status` **não possui o valor `cancelado`** (os valores válidos são `novo`, `em_atendimento`, `aguardando_cliente`, `resolvido`, `fechado`, `aguardando_aprovacao`, `aprovado`, `liberado`). Confirmado via SQL: o Postgres retorna `invalid input value for enum ticket_status: "cancelado"`. Resultado: a query falha silenciosamente no Supabase e o hook devolve lista vazia para todos os clientes — não só ATPPOA.

## Correção

Em `src/hooks/useClientLinkableTickets.ts`, trocar o filtro para refletir os status reais. Como o enum tem `resolvido` e `fechado` representando "encerrado", o filtro correto fica:

```ts
.or(
  `and(status.neq.resolvido,status.neq.fechado),resolved_at.gte.${thirtyDaysAgo}`,
)
```

Isso passa a listar:
- Tickets ainda em andamento (qualquer status diferente de `resolvido` e `fechado`), incluindo `novo`, `em_atendimento`, `aguardando_cliente`, `aguardando_aprovacao`, `aprovado`, `liberado`
- Tickets já resolvidos/fechados cujo `resolved_at` esteja nos últimos 30 dias

## Arquivos afetados

- `src/hooks/useClientLinkableTickets.ts` — corrigir o filtro `.or(...)`
- `mem/features/ticket-resolution-linking.md` — atualizar descrição do escopo (trocar "cancelado" por "fechado")

Nenhuma alteração de UI ou de banco de dados é necessária. A busca por número/título e o wildcard `*` já funcionam — passarão a exibir resultados assim que o hook retornar os tickets corretamente.
