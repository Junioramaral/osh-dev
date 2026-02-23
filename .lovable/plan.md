

# Cronometragem de Atividades RFC e Relatorio de Tempo

## Objetivo

Adicionar um sistema de cronometragem por passo na execucao de RFCs: o analista clica "Iniciar Atividade" para registrar o inicio, e ao marcar como concluido o sistema calcula automaticamente a duracao. Na tela do ticket (TicketDetail), adicionar uma aba "RFC" ao lado de "Timeline" com um relatorio de tempo por atividade e total. Tambem incluir eventos de RFC (inicio/conclusao de passos) na Timeline do ticket.

---

## 1. Migracao de Banco de Dados

Adicionar coluna na tabela `rfc_steps`:

- **`started_at`** (`timestamptz`, nullable) — timestamp de quando o analista clicou "Iniciar Atividade"
- **`started_by`** (`uuid`, nullable) — quem iniciou a atividade

Isso permite calcular a duracao: `concluded_at - started_at`.

---

## 2. Modificar `src/hooks/useRFCStepActions.ts`

Adicionar nova acao `startStep(stepId)` que salva `started_at = now()` e `started_by = auth.uid()`. Atualizar `toggleStep` para, ao marcar como concluido, manter o `started_at` existente (nao sobrescrever).

---

## 3. Modificar `src/pages/RFCExecution.tsx`

Para cada passo, adicionar um botao **"Iniciar Atividade"** (com icone de play/relogio) que aparece quando:
- O passo NAO esta concluido
- O passo NAO tem `started_at` preenchido

Quando o passo ja foi iniciado mas nao concluido, mostrar um badge "Em andamento" (amarelo/laranja) com o horario de inicio, substituindo o badge "Pendente" atual.

Ao marcar como concluido (checkbox), exibir a duracao calculada (`concluded_at - started_at`) no info de conclusao.

---

## 4. Nova aba "RFC" no `src/pages/TicketDetail.tsx`

Adicionar uma aba condicional (apenas quando `record_type === 'rfc'`) chamada **"RFC"** com um componente novo `TicketRFCReport`.

---

## 5. Novo componente `src/components/tickets/TicketRFCReport.tsx`

Relatorio de tempo da RFC contendo:
- Tabela com colunas: Passo, Descricao, Inicio, Fim, Duracao, Responsavel
- Cada linha mostra o tempo de cada atividade (diferenca entre `started_at` e `concluded_at`)
- Linha final com o **tempo total** somado de todas as atividades
- Passos sem inicio/fim mostram "—"
- Badge de status por passo (Pendente / Em andamento / Concluido)
- Barra de progresso geral no topo

Este componente busca dados de `rfc_steps` (com join em `profiles` para nome do responsavel).

---

## 6. Modificar `src/components/tickets/TicketTimeline.tsx`

Adicionar os eventos de RFC steps na timeline. Buscar `rfc_steps` do ticket e gerar eventos:
- **`rfc_step_started`**: "Passo X iniciado" — quando `started_at` nao e null
- **`rfc_step_completed`**: "Passo X concluido (duracao: Xh Xmin)" — quando `concluded_at` nao e null

Esses eventos aparecem na timeline junto com os demais (status changes, comments, time logs), ordenados cronologicamente.

---

## Detalhes Tecnicos

### Migracao SQL

```text
ALTER TABLE public.rfc_steps ADD COLUMN started_at timestamptz;
ALTER TABLE public.rfc_steps ADD COLUMN started_by uuid;
```

### Arquivos a criar

- `src/components/tickets/TicketRFCReport.tsx` — relatorio de tempo por atividade

### Arquivos a modificar

- `src/hooks/useRFCStepActions.ts` — adicionar `startStep`
- `src/pages/RFCExecution.tsx` — botao "Iniciar Atividade", badge "Em andamento", exibir duracao
- `src/pages/TicketDetail.tsx` — nova aba "RFC" condicional
- `src/components/tickets/TicketTimeline.tsx` — incluir eventos de rfc_steps na timeline
- `src/hooks/useTicketDetail.ts` — novo hook `useTicketRFCSteps` para buscar passos com perfis

### Sequencia

```text
1. Migracao SQL (started_at, started_by)
2. useRFCStepActions.ts (startStep)
3. useTicketDetail.ts (useTicketRFCSteps)
4. RFCExecution.tsx (botao iniciar, badge em andamento, duracao)
5. TicketRFCReport.tsx (criar relatorio)
6. TicketDetail.tsx (aba RFC)
7. TicketTimeline.tsx (eventos de RFC na timeline)
```

### Calculo de duracao

A duracao e calculada como `concluded_at - started_at` em minutos/horas. Formato de exibicao:
- Menos de 60min: "Xmin"
- 60min ou mais: "Xh Xmin"

### O que NAO muda

- RFCStepBuilder, RFCFormSection (criacao de RFC)
- RFCApproval (aprovacao)
- ClientRFCPortal (portal do cliente — nao ve cronometragem interna)
- Edge functions existentes
- RLS policies (rfc_steps ja tem policies corretas para leitura)

