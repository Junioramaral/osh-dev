# Sincronizar Relatório Mensal: PDF (tela) ↔ Email

## Diagnóstico

Comparando os dois geradores:

| Seção | PDF (tela) | Email | Ação |
|---|---|---|---|
| Resumo Executivo (4 cards) | ✅ Total / Resolvidos / Tempo Médio / SLA% | ✅ 4 cards iguais + 4 extras (Tempo Médio, SLA Atendido, SLA Não Atendido, Em Andamento) | Adicionar os 4 cards extras no PDF |
| Distribuição de Tickets (tabelas Segmento/Prioridade com %) | ❌ Ausente (só gráficos) | ✅ Duas tabelas | Adicionar tabelas no PDF |
| Top 5 Categorias com % | ⚠️ Lista sem % | ✅ Tabela com % | Reformatar para tabela com % |
| Resumo Numérico 6 meses | ✅ Tabela completa | ❌ Ausente | Adicionar tabela no email |
| Listagem de tickets — Segmento | ❌ tem na tela mas não no email | — | Adicionar coluna Segmento no email |
| Listagem de tickets — Datas | Email tem só `created_at` (dd/MM/yyyy, sem hora) | — | Mostrar Abertura **dd/MM/yyyy HH:mm** + Última atualização **dd/MM/yyyy HH:mm** |
| Legenda SLA (✓ ✗ ⏳) | — | sem explicação | Adicionar legenda abaixo da tabela |

## Mudanças

### 1. `src/components/reports/MonthlyClientReport.tsx` (PDF/tela)

**Resumo Executivo — adicionar segunda linha de 4 cards** (após o grid existente, linhas 322-375):
- Tempo Médio Resolução (`avgResolutionHours`h) — já existe, mover para 2ª linha junto com os 3 abaixo
- SLA Atendido (verde) → contar `sla_resolution_met === true`
- SLA Não Atendido (vermelho) → `=== false`
- Em Andamento (cinza) → `=== null`

Manter na 1ª linha: Total / Resolvidos / Em Aberto (`pending`) / SLA%.

> Nota: `useReportData` já calcula `total`, `resolved`, `pending`, `slaMetRate`, `avgResolutionHours`. Para SLA Atendido/Não/Andamento usaremos o array existente `slaCompliance` (que já separa esses 3 valores).

**Adicionar nova seção "Distribuição de Tickets"** entre o Resumo Executivo e "Análise de Performance":
- Tabela 1: Segmento (DB / APP) — Quantidade — %
- Tabela 2: Prioridade (P1/P2/P3/P4) — Quantidade — %

Usa dados já disponíveis em `metrics.bySegment` e `metrics.byPriority`.

**Top 5 Categorias** (linhas 516-535) — converter de lista para tabela com colunas Categoria | Quantidade | %.

### 2. `supabase/functions/send-monthly-report/index.ts` (Email)

**Adicionar seção "Resumo Numérico (Últimos 6 Meses)"** — buscar dados dos 6 meses anteriores:

```sql
-- Para cada um dos 6 meses (incluindo o atual), contar:
--   abertos: tickets criados naquele mês (record_type != 'rfc')
--   fechados: tickets resolvidos naquele mês (resolved_at no mês)
```

Implementar uma função `fetch6MonthVolume(supabase, clientId, targetMonth, targetYear)` que retorna `[{monthLabel, abertos, fechados, saldo}]` e renderizar como tabela HTML (replicando o estilo do PDF, com linha de Total).

**Listagem de Tickets (linhas 285-307)** — atualizar tabela para:
| Número | Título | **Segmento** | Prioridade | Status | SLA | **Abertura** | **Última atualização** |

- Adicionar coluna Segmento (badge DB/APP)
- Trocar "Data" para 2 colunas: Abertura e Última atualização
- Formatar `dd/MM/yyyy HH:mm` (timezone America/Sao_Paulo)
- Adicionar `updated_at` à query SELECT (linha 392)

**Legenda SLA** — abaixo da tabela de tickets, adicionar:
```
Legenda SLA: ✓ Cumprido  •  ✗ Não Cumprido  •  ⏳ Em Andamento
```

## Arquivos alterados

- `src/components/reports/MonthlyClientReport.tsx`
- `supabase/functions/send-monthly-report/index.ts`

## Sem quebra

- Métricas calculadas a partir dos mesmos dados; nenhuma mudança em DB ou hooks.
- `useReportData` já retorna tudo que o PDF precisa.
- Edge Function continua com mesma assinatura (`clientId`, `month`, `year`).
