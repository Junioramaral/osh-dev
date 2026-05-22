## Problema

Na seção "Distribuição por Segmento" do Dashboard, os cards "Tickets DB" e "Tickets APP" são exibidos para todo cliente, mesmo quando o cliente não possui aquele segmento contratado. Ex.: ATPPOA só tem "DB", mas o card "Tickets APP" aparece mesmo assim.

## Solução

Para usuários do tipo cliente (isClientUser), carregar o campo `segments` do `clients` correspondente ao `profile.client_id` e renderizar apenas os cards cujos segmentos estão presentes nesse array.

Para Otimizzo (super_admin, tenant_admin, analystas), continuar mostrando ambos os cards (visão global).

## Alterações

**`src/pages/Dashboard.tsx`**
1. Adicionar estado `clientSegments: string[] | null` (null = não filtrar / staff Otimizzo).
2. Em `useEffect`, quando `isClientUser` for verdadeiro e existir `profile.client_id`, buscar `segments` da tabela `clients` (`select("segments").eq("id", profile.client_id).maybeSingle()`) e armazenar no estado.
3. Montar `distributionCards` dinamicamente:
   - Se `clientSegments` é null → incluir ambos DB e APP (comportamento atual para staff).
   - Caso contrário → incluir DB somente se `clientSegments.includes("DB")`, e APP somente se `clientSegments.includes("APP")`.
4. O card "Total de Clientes" (condicional para roles internos) permanece inalterado.

## Fora de escopo

- Não alterar `MonthlyClientReport`, `PeriodComparisonReport` ou outras telas.
- Não tocar em segmentos dinâmicos além de DB/APP nesta iteração (o dashboard atualmente só tem cards fixos para esses dois).
- Sem mudanças de schema ou migrations.
