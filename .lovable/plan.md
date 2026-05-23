# Filtro dinâmico de Segmentos por cliente

## Problema
Hoje todos os dropdowns "Segmento" mostram fixo `DB` e `APP`, mesmo para clientes que contratam só um. Ex.: ATPPOA (só DB) vê APP em Tickets, FAQ, SLA, CSAT e relatórios.

Já existe a regra correta no Dashboard ("Distribuição por Segmento" lê `clients.segments`). Vamos padronizar isso em todos os lugares.

## Regra
- Usuário **cliente**: mostrar apenas os segmentos presentes em `clients.segments` do próprio tenant (`profile.client_id`).
  - Só DB → mostra "DB"
  - Só APP → mostra "APP"
  - Ambos → mostra "DB" e "APP" (+ "Todos Segmentos")
  - Se houver apenas 1 segmento, ocultar a opção "Todos Segmentos" (ou esconder o filtro inteiro) e travar o valor.
- Usuário **interno (Otimizzo / analista / admin)**:
  - Em telas com filtro de cliente: quando um cliente específico estiver selecionado, restringir os segmentos aos contratados por aquele cliente; caso contrário (Todos/None), mostrar todos.
  - Em telas sem filtro de cliente: mostrar todos os segmentos.

## Implementação

### 1. Novo hook `useAvailableSegments`
`src/hooks/useAvailableSegments.ts`
- Input: `clientId?: string` (opcional).
- Lógica:
  - Lê `useAuth()` para obter `profile`, `isClientUser`.
  - Se `isClientUser`: busca `clients.segments` de `profile.client_id`.
  - Caso contrário e `clientId` fornecido (≠ "all"): busca `clients.segments` desse cliente.
  - Caso contrário: retorna `["DB","APP"]` (fallback completo).
- Retorna `{ segments: ("DB"|"APP")[], isLoading }`.
- Cache via React Query (`["available-segments", clientId|profile.client_id]`).

### 2. Componente reutilizável `SegmentSelect`
`src/components/common/SegmentSelect.tsx`
- Props: `value`, `onValueChange`, `clientId?`, `includeAll?` (default true), `className?`, `placeholder?`.
- Usa `useAvailableSegments(clientId)`.
- Render:
  - Se `segments.length === 0` → não renderiza nada (ou disabled).
  - Se `segments.length === 1` e `includeAll` → renderiza Select desabilitado fixo no único segmento e dispara `onValueChange(segment)` no mount (efeito) para garantir consistência.
  - Senão → `Select` com opção "Todos Segmentos" (quando `includeAll`) + um `SelectItem` por segmento (labels padronizados: DB = "Banco de Dados", APP = "Aplicação"; em Tickets/MyTickets manter "DB"/"APP" curtos via prop `shortLabels`).

### 3. Substituir os Selects existentes

Trocar os blocos hardcoded por `<SegmentSelect />` (passando `clientId` quando a tela tiver filtro de cliente):

- `src/pages/Tickets.tsx` (linha ~628) — `shortLabels`, passar `clientFilter` se houver.
- `src/pages/MyTickets.tsx` (linha ~483) — `shortLabels`.
- `src/pages/FAQ.tsx` (linha ~319).
- `src/pages/SLADashboard.tsx` (linha ~309).
- `src/pages/CSATDashboard.tsx` (linha ~106).
- `src/components/reports/CSATSatisfactionReport.tsx` (linha ~293) — passar `clientId` do filtro.
- `src/components/reports/ResolutionTimeReport.tsx` (linha ~128).
- `src/components/reports/QueueWorkloadReport.tsx` (linha ~131).
- `src/components/reports/CategoriesReport.tsx` (linha ~105).
- `src/components/reports/AnalystPerformanceReport.tsx` (linha ~155).
- `src/components/reports/AnalystHoursManagementReport.tsx` (linha ~187).
- `src/components/reports/ClosureRankingReport.tsx` (linhas ~344 e ~447).

Em cada relatório, propagar o `clientId` selecionado no filtro existente. Quando o cliente mudar, se o `segment` atual não estiver mais disponível, resetar para `"all"` (ou para o único segmento permitido) dentro do `useEffect`.

### 4. Caso RFC
`src/components/tickets/RFCFormSection.tsx` (RadioGroup DB/APP, linha ~422): também restringir aos segmentos do cliente do ticket. Se só houver 1, pré-selecionar e desabilitar o radio do outro.

### 5. Fora de escopo
- Dashboard já corrigido (mantém lógica atual).
- Não mexer em lógica de negócio/SLA/queries, só na UI de seleção.
- Sem migração de banco.

## Detalhes técnicos
- `clients.segments` é `text[]` com valores `"DB"` / `"APP"`.
- Tipos de `segment` no Supabase usam enum `"DB" | "APP"` — manter cast nas queries existentes.
- Em telas com filtro `clientId === "all"` (visão interna), `SegmentSelect` deve mostrar ambos.
- Garantir que ao trocar de cliente o estado `segment` seja saneado: `useEffect([clientId, availableSegments])` → se `segment !== "all"` e `!availableSegments.includes(segment)`, setar `"all"`.
