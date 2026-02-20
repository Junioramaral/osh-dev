
# Portal do Cliente: Acompanhamento de RFCs

## Visão Geral

Será criada uma nova página exclusiva para clientes (`/minhas-rfcs`) com uma interface de acompanhamento read-only das RFCs associadas ao tenant do cliente. O cliente verá um status em destaque, uma timeline vertical com os passos e indicação visual de progresso — tudo somente leitura.

---

## Problema de Dados: Falta de `concluded_at` em `rfc_steps`

Atualmente, a tabela `rfc_steps` tem apenas `status_concluido boolean`. Para exibir "data/hora da conclusão" no timeline do cliente, precisamos de uma coluna `concluded_at` que registra o momento exato em que um passo foi marcado como concluído.

### Migration necessária

```sql
ALTER TABLE public.rfc_steps
ADD COLUMN IF NOT EXISTS concluded_at timestamp with time zone;
```

A lógica de preenchimento: quando o técnico marcar `status_concluido = true`, o código em `RFCExecution.tsx` deverá também enviar `concluded_at = now()`. Quando desmarcar, `concluded_at = null`.

---

## Arquivos a criar

### `src/pages/ClientRFCPortal.tsx`

Página principal do portal de RFCs do cliente. Layout em duas colunas no desktop (lista à esquerda, detalhe à direita), coluna única no mobile.

**Comportamento da lista (coluna esquerda):**
- Query em `tickets` com filtros `record_type = 'rfc'` — a RLS já garante que o cliente só vê seus próprios tickets (sem necessidade de filtro adicional de `client_id`)
- Exibe card por RFC com: número, título, status atual (badge colorido), segmento
- Ordena por `created_at DESC`

**Badge de status grande (painel direito, no topo):**

| Status do ticket | Texto do badge | Cor |
|---|---|---|
| `aguardando_aprovacao` | Aguardando Aprovação | Amarelo/Âmbar |
| `aprovado` | Manutenção Aprovada — Em Breve | Azul |
| `em_atendimento` / `novo` | Sua manutenção está em andamento | Verde |
| `resolvido` | Manutenção Concluída | Verde escuro |
| `fechado` | RFC Encerrada | Cinza |

**Timeline vertical de passos:**
- Busca `rfc_steps` pelo `ticket_id` selecionado, ordenado por `ordem`
- Passos com `status_concluido = true`: ícone `CheckCircle2` verde + data/hora de `concluded_at` formatada em pt-BR
- Passos com `status_concluido = false`: círculo cinza + texto "Pendente"
- Nenhuma interação de edição — todos os checkboxes são `disabled`

**Barra de progresso:** calculada com `completedCount / totalCount`, exibida com `<Progress />` acima da timeline

---

## Sidebar: Novo link para clientes

Em `AppLayout.tsx`, dentro de `operationalNav`, adicionar:

```typescript
{ 
  name: "Minhas RFCs", 
  href: "/minhas-rfcs", 
  icon: ClipboardList,         // lucide-react
  show: !isOtimizzoUser && !isSuperAdmin && !isViewer  // apenas clientes
}
```

A lógica `!isOtimizzoUser && !isSuperAdmin && !isViewer` garante que apenas usuários do tipo cliente veem este link.

---

## Rota no App.tsx

```tsx
<Route path="/minhas-rfcs" element={<ClientRFCPortal />} />
```

---

## Atualização em `RFCExecution.tsx`

O `toggleStep` existente precisa ser atualizado para também gravar `concluded_at` quando marcar como concluído:

```typescript
// Ao marcar como concluído:
concluded_at: !currentValue ? new Date().toISOString() : null
```

---

## Estrutura Visual da Timeline

```
┌─────────────────────────────────────────────────────┐
│  🟢  Sua manutenção está em andamento               │   ← Badge grande
│       RFC #00000042 · Banco de Dados                │
└─────────────────────────────────────────────────────┘

  Progresso: 2 / 5 passos (40%)
  ████████░░░░░░░░░░░░░

  ──────── Passos de Execução ────────

  ●  1. Fazer backup completo                         ← ✅ Concluído
     ✓  Concluído em 20/02/2026 às 14:32

  ●  2. Instalar PostgreSQL                           ← ✅ Concluído
     ✓  Concluído em 20/02/2026 às 15:10

  ○  3. Migrar schema                                 ← ⏳ Pendente
     Aguardando execução

  ○  4. Migrar dados
     Aguardando execução

  ○  5. Validar integridade
     Aguardando execução
```

Cada item da timeline é um `div` com uma linha vertical conectando os passos, sem componente de checklist interativo.

---

## RLS: Sem mudanças necessárias

A RLS existente já cobre o cenário do cliente:
- `tickets`: política `Client users can view their tickets` limita SELECT ao `client_id = get_user_tenant_id(auth.uid())`
- `rfc_steps`: política `Client view own rfc_steps` limita SELECT via JOIN com a tabela tickets

---

## Sequência de Implementação

```text
1. Migration SQL
   └─ Adiciona coluna concluded_at em rfc_steps

2. Atualiza RFCExecution.tsx
   └─ toggleStep agora salva concluded_at ao marcar/desmarcar

3. Cria ClientRFCPortal.tsx
   └─ Lista de RFCs do cliente (somente leitura)
   └─ Badge de status dinâmico
   └─ Barra de progresso
   └─ Timeline vertical com check verde e data/hora

4. Atualiza App.tsx
   └─ Adiciona rota /minhas-rfcs

5. Atualiza AppLayout.tsx
   └─ Adiciona "Minhas RFCs" para usuários clientes (!isOtimizzoUser && !isSuperAdmin && !isViewer)
```

---

## O que NÃO muda

- A tela de Execução de RFC (`/rfc-execution`) para o time técnico
- O formulário de criação de RFC (`NewTicketDialog`)
- As políticas RLS existentes
- Todas as outras páginas e funcionalidades
