
# Tela de Aprovação de RFC

## Objetivo

Criar uma nova página `/rfc-aprovacao` acessível apenas para Super Admin e usuários Otimizzo, onde o gestor pode revisar RFCs no status `aguardando_aprovacao`, expandir os passos com procedimentos e scripts, e tomar uma decisão de Aprovar ou Rejeitar com comentário obrigatório.

---

## Fluxo de Status

```text
novo  ──(cliente envia)──►  aguardando_aprovacao
                                     │
                          ┌──────────┴──────────┐
                       Aprovar               Rejeitar
                          │                     │
                       aprovado              novo
                          │               (retorna para rascunho)
                    (aparece em
                    Execução RFC)
```

- **Aprovar** → `status: 'aprovado'` + comentário interno registrado
- **Rejeitar** → `status: 'novo'` + comentário interno com motivo da rejeição

---

## Arquivos a criar/modificar

### 1. `src/pages/RFCApproval.tsx` — Nova página (criar)

Estrutura split-panel idêntica à `RFCExecution.tsx`, aproveitando o mesmo padrão visual já estabelecido no projeto:

**Painel esquerdo — Lista de RFCs pendentes:**
- Query: `tickets` com `record_type = 'rfc'` e `status = 'aguardando_aprovacao'`
- Cards clicáveis com: número, badge de segmento, título, nome do cliente, data de criação
- Badge contador no cabeçalho
- Estado vazio com ícone e mensagem "Nenhuma RFC aguardando aprovação"

**Painel direito — Detalhes + Ação:**
- Cabeçalho: número do ticket, título, cliente, segmento, data
- Seção de passos expansível: cada passo usa o mesmo padrão de accordion da `RFCExecution.tsx`
  - Collapsed: número + título
  - Expanded: procedimento (textarea leitura) + scripts (fundo escuro, font-mono)
- Seção de decisão (sticky no rodapé do painel ou dentro do scroll):
  - Textarea: "Comentário do gestor *" — obrigatório para ambas as ações
  - Botão **Aprovar** (verde/primary) — `disabled` se comentário vazio
  - Botão **Rejeitar** (vermelho/destructive) — `disabled` se comentário vazio

**Lógica de aprovação (`handleApprove`):**
```typescript
// 1. Atualizar status do ticket
await supabase.from('tickets')
  .update({ status: 'aprovado' })
  .eq('id', selectedRfcId);

// 2. Registrar comentário interno
await supabase.from('ticket_comments').insert({
  ticket_id: selectedRfcId,
  author_id: user.id,
  content: `✅ RFC APROVADA por ${profile.full_name}.\n\nComentário: ${comentario}`,
  is_internal: true,
});
```

**Lógica de rejeição (`handleReject`):**
```typescript
// 1. Retornar status para 'novo' (rascunho)
await supabase.from('tickets')
  .update({ status: 'novo' })
  .eq('id', selectedRfcId);

// 2. Registrar comentário interno com motivo
await supabase.from('ticket_comments').insert({
  ticket_id: selectedRfcId,
  author_id: user.id,
  content: `❌ RFC REJEITADA por ${profile.full_name}.\n\nMotivo: ${comentario}`,
  is_internal: true,
});
```

Após cada ação: toast de feedback, `queryClient.invalidateQueries`, limpar seleção e comentário.

---

### 2. `src/App.tsx` — Registrar rota

```tsx
import RFCApproval from "./pages/RFCApproval";
// ...
<Route path="/rfc-aprovacao" element={<RFCApproval />} />
```

---

### 3. `src/components/layout/AppLayout.tsx` — Link no sidebar

Adicionar na seção operacional, visível apenas para `isOtimizzoUser || isSuperAdmin`, abaixo de "Execução RFC":

```typescript
{ 
  name: "Aprovação RFC", 
  href: "/rfc-aprovacao", 
  icon: ClipboardCheck, // ou ShieldCheck
  show: isOtimizzoUser || isSuperAdmin 
}
```

Badge de contagem pode ser adicionado futuramente — por ora, apenas o link.

---

## Banco de Dados

**Nenhuma alteração de schema necessária.** As colunas `status`, `ticket_comments` e `rfc_steps` já existem e suportam o fluxo.

As políticas RLS existentes já permitem:
- `Otimizzo users can manage all tickets` — UPDATE de status ✅
- `Insert comments` — INSERT em `ticket_comments` ✅
- `Otimizzo manage rfc_steps` — SELECT dos passos ✅

---

## Componente de Decisão (UX)

```
┌──────────────────────────────────────────────────────────────────┐
│  Decisão do Gestor                                               │
├──────────────────────────────────────────────────────────────────┤
│  Comentário *                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Ex: RFC aprovada. Agendar janela de manutenção para...   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│              [✕ Rejeitar RFC]    [✓ Aprovar RFC]                │
└──────────────────────────────────────────────────────────────────┘
```

- Os botões ficam desabilitados enquanto o comentário está vazio
- Loading spinner durante a operação assíncrona
- Ao concluir, limpar o campo e deselecionar a RFC da lista

---

## Sequência de Implementação

```text
1. src/pages/RFCApproval.tsx
   └─ Novo componente completo (split-panel)
   └─ Lista de RFCs aguardando aprovação
   └─ Detalhes com passos expansíveis (procedimento + scripts)
   └─ Seção de decisão com textarea de comentário
   └─ handleApprove: status → 'aprovado' + comentário interno
   └─ handleReject: status → 'novo' + comentário interno

2. src/App.tsx
   └─ Route /rfc-aprovacao → <RFCApproval />

3. src/components/layout/AppLayout.tsx
   └─ Item "Aprovação RFC" na nav operacional
   └─ Visível apenas para isOtimizzoUser || isSuperAdmin
```

---

## O que NÃO muda

- Schema do banco (nenhuma migration necessária)
- Fluxo de Execução RFC (`/rfc-execution`)
- Portal do Cliente (`/minhas-rfcs`)
- RLS existente
- Outros tipos de tickets e status
