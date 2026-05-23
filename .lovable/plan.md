## Causa raiz

Na tela de Configurações do Sistema, a **lista de categorias** é carregada com a query key `["ticket_categories_with_counts"]` (linha 243 de `SystemSettings.tsx`), mas todas as mutations (criar, editar, ativar/inativar, remover) invalidam uma chave diferente: `["ticket_categories"]`.

Como as chaves não batem, o React Query nunca refaz o fetch da lista visível — só quando a página recarrega e a query roda do zero. É exatamente isso que você está observando.

Locais afetados pelo mesmo bug:
- `src/pages/SystemSettings.tsx` linha 459 — toggle ativo/inativo da categoria
- `src/pages/SystemSettings.tsx` linha 477 — delete da categoria
- `src/components/settings/CategoryDialog.tsx` linhas 113 e 137 — create e update da categoria

## Correção

Trocar a invalidação em todos os 4 pontos acima para invalidar **ambas** as chaves, garantindo que tanto a lista da tela quanto qualquer outro consumidor sejam atualizados:

```ts
queryClient.invalidateQueries({ queryKey: ["ticket_categories_with_counts"] });
queryClient.invalidateQueries({ queryKey: ["ticket_categories"] });
```

## Varredura nas outras telas

Fiz uma varredura nas demais query keys do `SystemSettings.tsx` e os pares lista↔mutation estão consistentes (`segments`, `queues`, `database_engines`, `application_products`, `teams-with-queues`/`teams`). O bug de cache órfão está isolado em categorias.

Outras telas (FAQ, Clientes, Máquinas, Aplicativos, RFC, Tickets, Tenant) já usam hooks dedicados (`useClientMutations`, `useMachineMutations`, `useDatabaseMutations`, etc.) com as mesmas chaves nas leituras e mutations — não há sintoma similar reportado lá. Se você notar o mesmo comportamento em alguma tela específica, me avise que eu incluo na correção.

## Arquivos a editar

- `src/pages/SystemSettings.tsx`
- `src/components/settings/CategoryDialog.tsx`

Nenhuma mudança de schema, RLS ou Realtime — é apenas alinhamento de chaves de cache do React Query.