## Objetivo

Permitir que usuários (Otimizzo / Super Admin / Viewer) filtrem os artigos da Base de Conhecimento primeiro por **Cliente**, depois por **Segmento** e, em seguida, por **Tipo do Segmento** (categoria DB ou módulo APP), para localizar facilmente as FAQs de um cliente específico.

## Mudanças em `src/pages/FAQ.tsx`

### 1. Filtro de Cliente sempre visível
Hoje o `<Select>` de Cliente só aparece quando `visibilityFilter === "client_specific"`. Vamos torná-lo independente:

- Mostrar o filtro **Cliente** sempre que `canSeeAllFilters` for `true` (Super Admin, Otimizzo, Viewer).
- Opção `"all"` = "Todos Clientes".
- Quando um cliente é selecionado, a query dos artigos passa a considerar:
  - artigos `client_specific` ou `private` daquele cliente
  - + artigos `global` (que valem para todos os clientes)
- Carregar a lista de `clients` (já existe `clients-for-faq-filter`) — sem mudanças no hook, apenas remover o gate de visibilidade.

### 2. Filtro de Segmento (já existe, será encadeado)
Permanece com opções "DB" e "APP" lidas via `useActiveSegments()` (substituir o hardcode atual por dinâmico, alinhado ao restante do sistema).

### 3. Novo filtro: Tipo do Segmento
Aparece **somente quando um Segmento é selecionado**:

- Se `segmentFilter === "DB"`: dropdown listando os engines distintos presentes em `faq_articles.db_engines` (ou via tabela `database_engines` ativos). Filtra artigos cujo array `db_engines` contém o valor.
- Se `segmentFilter === "APP"`: dropdown listando os produtos APP via `application_products`. Filtra artigos cujo array `app_product_ids` contém o ID.
- Opção `"all"` = "Todos os tipos".

### 4. Lógica de filtragem combinada
No `filteredArticles`:
```ts
matchesClient =
  clientFilter === "all"
  || article.client_id === clientFilter
  || article.visibility === "global"; // globais sempre aparecem para o cliente filtrado

matchesSegmentType =
  segmentTypeFilter === "all"
  || (segmentFilter === "DB"  && article.db_engines?.includes(segmentTypeFilter))
  || (segmentFilter === "APP" && article.app_product_ids?.includes(segmentTypeFilter));
```

### 5. UX
- Reset automático do `segmentTypeFilter` para `"all"` ao trocar o `segmentFilter`.
- Layout: manter o `flex flex-col md:flex-row gap-4`, ordem da esquerda para direita: Busca → Cliente → Visibilidade → Segmento → Tipo do Segmento → Status.
- Sem alterações em `FAQSelector.tsx` (componente do ticket) — escopo é apenas a página `/faq`.

## Permissões
- Clients comuns continuam vendo apenas o que a RLS permite (próprio tenant + globais), filtros adicionais ficam ocultos como hoje.
- Super Admin / Otimizzo / Viewer ganham o filtro de Cliente independente.

## Arquivos afetados
- `src/pages/FAQ.tsx` (única alteração de código)

Sem mudanças em banco, hooks compartilhados ou RLS.