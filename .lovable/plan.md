# Plano: Correção da Sidebar e Padronização dos Filtros de Período nos Relatórios

## Problema 1 — Menu (sidebar) sumindo

Três relatórios renderizam o conteúdo direto, sem envolver em `<AppLayout>`, por isso a sidebar desaparece:

- `src/components/reports/ClosureRankingReport.tsx` — retorna `<div className="print-container">`
- `src/components/reports/ClientHoursReport.tsx` — retorna `<div className="space-y-6">`
- `src/components/reports/AnalystHoursManagementReport.tsx` — retorna `<div className="space-y-6">`

Os demais (Monthly, AnalystPerformance, Categories, PeriodComparison, ResolutionTime, QueueWorkload) já envolvem com `<AppLayout>` e mantêm a sidebar.

**Correção:** envolver o JSX retornado dos três componentes acima com `<AppLayout>...</AppLayout>` (importando de `@/components/layout/AppLayout`).

## Problema 2 — Filtros de período inconsistentes

Hoje cada relatório tem opções diferentes:

| Relatório | Opções atuais |
|---|---|
| AnalystPerformance | Mês Atual / Mês Anterior / Dois Meses Atrás |
| Categories | Mês Atual / Mês Anterior / Dois Meses Atrás |
| QueueWorkload | Mês Atual / Mês Anterior / Dois Meses Atrás |
| ResolutionTime | Mês Atual / Mês Anterior / Últimos 3 / Últimos 6 |
| ClientHours | Mês Atual / Anterior / Últimos 3 / Últimos 6 |
| AnalystHoursManagement | Mês Atual / Anterior / Últimos 3 / Últimos 6 |
| ClosureRanking | Já tem 4 opções + modo Comparativo |
| MonthlyClient | Próprio seletor mês/ano |
| PeriodComparison | Próprio comparativo |

**Padronização:** todos os relatórios passam a oferecer **dois modos** (toggle igual ao do ClosureRanking):

1. **Período único**: Mês Atual, Mês Anterior, Últimos 3 Meses, Últimos 6 Meses, **Mês específico (mês + ano)**.
2. **Comparativo entre meses**: dois seletores de mês/ano (Período A vs Período B), exibindo métricas lado a lado e variação percentual.

### Componente reutilizável

Criar `src/components/reports/ReportPeriodFilter.tsx` exportando:

- `<ReportPeriodFilter mode viewMode onModeChange onPeriodChange />` — encapsula o toggle Período/Comparativo, os 4 presets, o seletor mês/ano específico e os dois seletores do modo comparativo.
- Helpers `getDateRangeFromPreset(preset)` e `getDateRangeFromMonthYear(month, year)` em `src/lib/reportPeriod.ts` retornando `{ start, end, label }`.

Tipos:
```ts
type PeriodPreset = "current-month" | "last-month" | "last-3-months" | "last-6-months" | "specific";
type ReportPeriod =
  | { mode: "single"; preset: PeriodPreset; month?: number; year?: number }
  | { mode: "comparison"; a: { month: number; year: number }; b: { month: number; year: number } };
```

### Aplicação em cada relatório

Substituir o `<Select period>` atual por `<ReportPeriodFilter>` em:

- AnalystPerformanceReport — remover opção "Dois Meses Atrás"; usar novo filtro; adicionar render condicional de comparativo (recalcula métricas para período B e mostra coluna de variação).
- CategoriesReport — idem.
- QueueWorkloadReport — idem.
- ResolutionTimeReport — adiciona modo específico/comparativo às 4 opções já existentes.
- ClientHoursReport — idem.
- AnalystHoursManagementReport — idem.
- ClosureRankingReport — já tem; refatorar para usar o componente compartilhado e ganhar o preset "Mês específico".
- MonthlyClientReport — adicionar suporte aos presets além de mês/ano específico (mantendo o atual como modo "specific").
- PeriodComparisonReport — sem mudança (já é comparativo nativo).

### Modo comparativo — exibição

Para os relatórios que hoje só têm um período, o modo comparativo:
- Faz a mesma query duas vezes (período A e B) com o hook existente.
- Exibe os cards/tabelas em duas colunas (A | B) com badge de variação (igual ao padrão do ClosureRanking).
- Gráficos de barra recebem duas séries (A e B).

## Resumo dos arquivos alterados

- Novo: `src/lib/reportPeriod.ts`
- Novo: `src/components/reports/ReportPeriodFilter.tsx`
- Editado (envolver com AppLayout + trocar filtro):
  - `src/components/reports/ClosureRankingReport.tsx`
  - `src/components/reports/ClientHoursReport.tsx`
  - `src/components/reports/AnalystHoursManagementReport.tsx`
- Editado (apenas trocar filtro + adicionar modo comparativo):
  - `src/components/reports/AnalystPerformanceReport.tsx`
  - `src/components/reports/CategoriesReport.tsx`
  - `src/components/reports/QueueWorkloadReport.tsx`
  - `src/components/reports/ResolutionTimeReport.tsx`
  - `src/components/reports/MonthlyClientReport.tsx`

## Fora do escopo

- PeriodComparisonReport (já é comparativo).
- Edge function `send-monthly-report` (envio por e-mail mantém lógica atual).
