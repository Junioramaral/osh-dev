
# Passos de RFC Expansíveis com Campos Detalhados

## Visão Geral

O objetivo é transformar os itens da lista de passos de uma RFC de linhas simples em **cards expansíveis (accordion)** com três campos internos: Título, Procedimento Detalhado e Scripts/Comandos. Também é necessário adicionar as duas novas colunas no banco de dados.

---

## Mudança no Banco de Dados

A tabela `rfc_steps` precisa de duas novas colunas:

```sql
ALTER TABLE public.rfc_steps
  ADD COLUMN IF NOT EXISTS procedimento text,
  ADD COLUMN IF NOT EXISTS scripts text;
```

Ambas são opcionais (nullable), sem valor padrão — passos existentes não serão impactados.

---

## Arquivos a modificar

### 1. `src/components/tickets/RFCStepBuilder.tsx` — Reescrita completa do componente

**Interface `RFCStep` atualizada:**
```typescript
export interface RFCStep {
  id: string;
  descricao: string;        // já existia — Título do Passo
  procedimento: string;     // novo — Procedimento Detalhado
  scripts: string;          // novo — Scripts/Comandos
  ordem: number;
}
```

**Novos estados internos:**
- `expandedId: string | null` — controla qual card está aberto
- O input de criação rápida adiciona um passo com `procedimento: ""` e `scripts: ""`

**Estrutura visual dos cards (collapsed):**
```
┌────────────────────────────────────────────────────────────┐
│  [1]  Instalar Linux                    [↑][↓][🗑️] [▼]   │
└────────────────────────────────────────────────────────────┘
```

- Número do passo (círculo colorido)
- Título (`descricao`)
- Botões de reordenação e exclusão (permanecem na linha do header)
- Ícone `ChevronDown` / `ChevronUp` que indica expansibilidade — ao clicar no header (exceto botões de ação), expande/colapsa

**Estrutura visual dos cards (expanded):**
```
┌────────────────────────────────────────────────────────────┐
│  [1]  Instalar Linux                    [↑][↓][🗑️] [▲]   │
├────────────────────────────────────────────────────────────┤
│  Título do Passo *                                         │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Instalar Linux                                       │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  Procedimento Detalhado                                    │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 1. Baixar ISO do Ubuntu...                           │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  Scripts / Comandos                                        │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ apt-get install -y ...                               │ │ ← fundo escuro, font-mono
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

**Campo Scripts:** estilizado com `bg-zinc-900 text-green-400 font-mono` para simular terminal.

**Atualização inline dos campos:** ao editar o título, procedimento ou scripts de um step expandido, o componente usa `onStepsChange` para atualizar o estado local do formulário em tempo real — sem precisar de botão "Salvar".

**UX de criação:**
- O input rápido no topo continua funcionando (Enter ou clique em +)
- O novo passo é adicionado já **expandido** para que o usuário preencha os detalhes imediatamente
- `setExpandedId(novoStep.id)`

---

### 2. `src/components/tickets/RFCFormSection.tsx` — Atualização do submit

O mapeamento dos passos para inserção no banco já usa `s.descricao` e `s.ordem`. Precisa incluir os dois novos campos:

```typescript
const rfcStepsData = steps.map((s) => ({
  ticket_id: ticket.id,
  descricao: s.descricao,
  ordem: s.ordem,
  procedimento: s.procedimento || null,  // novo
  scripts: s.scripts || null,            // novo
}));
```

---

### 3. `src/pages/RFCExecution.tsx` — Exibição dos detalhes na tela de execução técnica

O tipo `RFCStep` já usa `select("*")`, então `procedimento` e `scripts` serão retornados automaticamente. Precisamos:

- Atualizar o tipo local `RFCStep` para incluir `procedimento` e `scripts`
- No checklist de execução, quando um step estiver expandido (ao clicar no título), exibir:
  - Procedimento detalhado (se preenchido)
  - Scripts/Comandos (se preenchidos, com fundo escuro e font-mono)

O técnico **não edita** esses campos na tela de execução — apenas visualiza e marca como concluído.

---

### 4. `src/pages/ClientRFCPortal.tsx` — Exibição na timeline do cliente

O tipo `RFCStep` e a query `select("*")` já retornarão os novos campos. Precisamos:

- Atualizar o tipo `RFCStep` para incluir `procedimento` e `scripts`
- Na timeline vertical, quando o cliente expande um passo (opcional — ícone ChevronDown no card de cada passo), exibir o `procedimento` (somente leitura)
- Scripts **não são exibidos** para o cliente (informação técnica interna)

---

## Sequência de Implementação

```text
1. Migration SQL
   └─ ADD COLUMN procedimento text
   └─ ADD COLUMN scripts text

2. RFCStepBuilder.tsx
   └─ Interface RFCStep atualizada (+ procedimento, scripts)
   └─ Estado expandedId para controle do accordion
   └─ Cards expansíveis: header colapsado + body expandido
   └─ Textarea de Título (editável inline)
   └─ Textarea de Procedimento Detalhado
   └─ Textarea estilizada de Scripts (fundo escuro, font-mono)
   └─ Reordenação e exclusão operam no card inteiro

3. RFCFormSection.tsx
   └─ Inclui procedimento e scripts no insert de rfc_steps

4. RFCExecution.tsx
   └─ Tipo RFCStep atualizado
   └─ Exibição de procedimento e scripts no checklist (leitura)

5. ClientRFCPortal.tsx
   └─ Tipo RFCStep atualizado
   └─ Exibição do procedimento na timeline (sem scripts)
```

---

## O que NÃO muda

- RLS existente em `rfc_steps`
- Lógica de ordenação (ordem), conclusão (status_concluido, concluded_at) e exclusão
- Todas as outras páginas e funcionalidades
- A barra de progresso e o badge de status
