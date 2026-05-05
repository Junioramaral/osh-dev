## Adicionar legenda explicativa no Ranking de Encerramento (modo comparativo)

### Contexto
Atualmente o relatório exibe apenas dois badges na coluna "Analista" do modo comparativo: **NOVO** (verde) e **INATIVO** (cinza). A nomenclatura é confusa porque "INATIVO" sugere que o usuário está desativado no sistema, mas na verdade indica apenas que não resolveu tickets em um dos períodos comparados. Os termos **EVOLUIU** e **REGREDIU** são definidos internamente como `trend` (`improved`/`declined`), mas hoje só aparecem em texto livre nos cards de destaque, não como badges.

### Mudanças

**1. `src/components/reports/ClosureRankingReport.tsx`**

Adicionar um bloco de **legenda fixa** logo abaixo do título "Tabela Comparativa Detalhada" (acima da `Card` da tabela), visível somente no modo comparativo. Conteúdo:

- Título: "Como interpretar as tendências"
- Quatro itens com o badge colorido + descrição curta do critério:
  - **NOVO** (verde) — Analista resolveu tickets apenas no período mais recente; não havia atividade no período anterior.
  - **INATIVO** (cinza) — Analista resolveu tickets apenas no período anterior; não houve atividade no período mais recente. Não significa que a conta está desativada.
  - **EVOLUIU** (verde) — Volume resolvido cresceu mais de **+10%** em relação ao período anterior.
  - **REGREDIU** (vermelho) — Volume resolvido caiu mais de **−10%** em relação ao período anterior.
- Nota de rodapé: "Variações entre −10% e +10% são consideradas estáveis e não recebem badge. O cálculo considera apenas tickets resolvidos no período (RFCs são excluídos)."

Estilo: um `Card` discreto com fundo `bg-muted/30`, ícone `Info` à esquerda do título, badges renderizados inline com a mesma classe atual (`text-xs`, mesmas cores).

**2. Adicionar badges EVOLUIU/REGREDIU na tabela**

Hoje a tabela só mostra NOVO e INATIVO. Para a legenda fazer sentido visual, incluir também:
- `analyst.trend === "improved"` → Badge verde "EVOLUIU"
- `analyst.trend === "declined"` → Badge vermelho "REGREDIU"

Renderizados ao lado do nome do analista, mesmo padrão dos atuais. Trends `stable` continuam sem badge.

### Layout (esboço)

```text
Tabela Comparativa Detalhada
┌────────────────────────────────────────────────────────────┐
│ ℹ Como interpretar as tendências                           │
│  [NOVO]      Resolveu apenas no período mais recente       │
│  [INATIVO]   Resolveu apenas no período anterior           │
│  [EVOLUIU]   Volume cresceu mais de +10%                   │
│  [REGREDIU]  Volume caiu mais de -10%                      │
│  Variações entre -10% e +10% são consideradas estáveis.    │
└────────────────────────────────────────────────────────────┘
[Tabela existente...]
```

### Arquivos afetados
- `src/components/reports/ClosureRankingReport.tsx` (somente este)

Sem alterações em hooks, banco ou outros relatórios.