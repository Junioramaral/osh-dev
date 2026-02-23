

# Workflow de Execucao de RFC — Plano de Implementacao

## Resumo

Refatorar completamente as telas de Execucao RFC (analista) e Minhas RFCs (cliente) para criar um workflow interativo com persistencia de dados, observacoes com auto-save, botoes de copiar, badges coloridos, progresso salvo no banco e animacao de conclusao.

---

## 1. Migracao de Banco de Dados

Adicionar 3 colunas novas:

- **`rfc_steps.observacao`** (`text`, nullable) — campo de observacao do analista por passo
- **`rfc_steps.concluded_by`** (`uuid`, nullable) — quem concluiu o passo
- **`tickets.rfc_progress`** (`integer`, default 0) — percentual de progresso calculado e persistido

Criar um **trigger** na tabela `rfc_steps` que recalcula automaticamente `tickets.rfc_progress` sempre que um passo for atualizado (INSERT/UPDATE/DELETE). Formula: `ROUND(count_concluidos / count_total * 100)`.

---

## 2. Refatorar `src/pages/RFCExecution.tsx` (Tela do Analista)

**Corrigir anti-pattern**: Remover `ListPanel` e `DetailPanel` como funcoes internas (mesmo problema de re-render que causava perda de foco).

**Novos recursos por passo:**

- **Badge de status**: Verde "Concluido" ou Azul "Pendente" ao lado de cada passo
- **Bloco de codigo** (`<pre>` com fundo escuro) para scripts/comandos com **botao "Copiar"** que usa `navigator.clipboard.writeText()`
- **Botao "Copiar"** tambem no campo de procedimento
- **Campo de observacao** (`Textarea`) com **debounce de 1.5s** para auto-save — salva automaticamente no `rfc_steps.observacao`
- **Timestamp e autor**: Ao marcar como concluido, salvar `concluded_at`, `concluded_by` (auth.uid) e exibir "Concluido por [nome] em [data/hora]"
- **Barra de progresso** com percentual atualizado em tempo real
- **Animacao de 100%**: Quando todos os passos forem concluidos, exibir um banner animado com brilho verde pulsante e icone de celebracao

---

## 3. Refatorar `src/pages/ClientRFCPortal.tsx` (Tela do Cliente)

**Corrigir anti-pattern**: Remover `ListPanel` e `DetailPanel` como funcoes internas.

**Ajustes:**

- **Barra de progresso**: Ler `tickets.rfc_progress` do banco (valor persistido) em vez de calcular localmente
- **Timeline vertical**: Manter layout atual, mas adicionar:
  - Badge "Concluido" (verde) ou "Pendente" (azul) por passo
  - Timestamp de conclusao quando disponivel
  - Observacao publica do analista (campo `observacao`) — exibida como texto somente leitura
  - **Ocultar scripts/comandos** (ja esta assim, manter)
- **Animacao de 100%**: Banner de "Manutencao concluida" com animacao de brilho verde

---

## 4. Novo hook `useRFCStepActions.ts`

Hook centralizado para logica de execucao de passos:

- `toggleStep(stepId, currentValue)` — marca/desmarca passo, salva `concluded_at`, `concluded_by`
- `updateObservacao(stepId, text)` — atualiza observacao com debounce
- Invalida queries apos cada operacao

---

## Detalhes Tecnicos

### Migracao SQL

```text
1. ALTER TABLE rfc_steps ADD COLUMN observacao text;
2. ALTER TABLE rfc_steps ADD COLUMN concluded_by uuid;
3. ALTER TABLE tickets ADD COLUMN rfc_progress integer DEFAULT 0;
4. CREATE FUNCTION recalculate_rfc_progress() — trigger function
5. CREATE TRIGGER on rfc_steps AFTER INSERT/UPDATE/DELETE
```

### Arquivos a criar

- `src/hooks/useRFCStepActions.ts` — hook com toggleStep + updateObservacao (debounce)

### Arquivos a modificar

- `src/pages/RFCExecution.tsx` — refatoracao completa (inline JSX, observacoes, code blocks, copiar, badges, animacao)
- `src/pages/ClientRFCPortal.tsx` — refatoracao (inline JSX, progresso do banco, observacoes publicas, badges, animacao)
- `src/integrations/supabase/types.ts` — atualizado automaticamente apos migracao

### Sequencia

```text
1. Migracao SQL (colunas + trigger)
2. useRFCStepActions.ts (criar hook)
3. RFCExecution.tsx (refatorar)
4. ClientRFCPortal.tsx (refatorar)
```

### O que NAO muda

- RFCStepBuilder, RFCFormSection (criacao de RFC)
- RFCApproval (aprovacao)
- Edge functions existentes
- RLS policies (rfc_steps ja tem policies corretas)
- Outras paginas do sistema
