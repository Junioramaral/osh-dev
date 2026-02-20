
# Refatoração: Suporte a Múltiplos Tipos de Registro (Ticket, RFC, MIR)

## Visão Geral

O formulário "Novo Ticket" será transformado em um criador de registros multi-tipo. O usuário primeiro escolhe o **Tipo de Registro** (Suporte ou RFC) e o formulário se adapta dinamicamente. A estrutura do banco de dados também será expandida para suportar os novos tipos.

---

## Impacto no Banco de Dados (3 migrações)

### Migração 1 — Expandir o status do ticket para suportar RFC

Adicionar `aguardando_aprovacao` ao enum `ticket_status` para o fluxo de aprovação da RFC.

```sql
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'aguardando_aprovacao';
```

### Migração 2 — Adicionar coluna `record_type` na tabela `tickets`

Uma nova coluna `record_type` (texto, default `'suporte'`) para distinguir o tipo de registro. Não é um enum para facilitar a extensão futura com MIR sem nova migração.

```sql
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS record_type text NOT NULL DEFAULT 'suporte';

-- Marcar os registros existentes como 'suporte'
UPDATE public.tickets SET record_type = 'suporte' WHERE record_type IS NULL;
```

### Migração 3 — Criar tabela `rfc_steps`

Tabela para armazenar os passos dinâmicos de uma RFC.

```sql
CREATE TABLE IF NOT EXISTS public.rfc_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  status_concluido boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS
ALTER TABLE public.rfc_steps ENABLE ROW LEVEL SECURITY;

-- Otimizzo pode gerenciar todos os passos
CREATE POLICY "Otimizzo manage rfc_steps" ON public.rfc_steps
FOR ALL USING (is_otimizzo_user(auth.uid()))
WITH CHECK (is_otimizzo_user(auth.uid()));

-- Super admins gerenciam tudo
CREATE POLICY "Super admins manage rfc_steps" ON public.rfc_steps
FOR ALL USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Clientes visualizam os passos dos seus tickets
CREATE POLICY "Client view own rfc_steps" ON public.rfc_steps
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tickets t 
    WHERE t.id = rfc_steps.ticket_id 
    AND t.client_id = get_user_tenant_id(auth.uid())
  )
);
```

---

## Novos Arquivos a Criar

### `src/components/tickets/RFCStepBuilder.tsx`

Componente isolado que gerencia a lista de passos da RFC:
- Input de texto + botão "Adicionar"
- Lista de passos com botões de deletar e reordenar (setas ↑ ↓)
- Recebe `steps` e `onStepsChange` como props
- Interface local: `{ id: string, descricao: string, ordem: number }`

### `src/components/tickets/RFCFormSection.tsx`

O formulário completo para criação de RFC, com:
- Cliente (dropdown — igual ao do fluxo Suporte para Otimizzo)
- Segmento (Radio buttons: Banco de Dados / Application)
- `RFCStepBuilder` embutido
- Rodapé com dois botões: **"Salvar Rascunho"** e **"Solicitar Aprovação de Especialista"**

---

## Arquivo Principal a Modificar: `NewTicketDialog.tsx`

### 1. Novo estado de seleção no topo

```tsx
const [recordType, setRecordType] = useState<"suporte" | "rfc">("suporte");
```

### 2. Seletor de "Tipo de Registro" no topo do formulário

Logo abaixo do `<DialogTitle>`, antes do `<form>`, adicionar um seletor com Tabs da shadcn/ui:

```tsx
<Tabs value={recordType} onValueChange={(v) => setRecordType(v as any)}>
  <TabsList className="grid w-full grid-cols-2">
    <TabsTrigger value="suporte">Suporte</TabsTrigger>
    <TabsTrigger value="rfc">RFC (Interno)</TabsTrigger>
  </TabsList>
</Tabs>
```

### 3. Renderização condicional do formulário

- Se `recordType === "suporte"`: renderiza o formulário atual completo (sem nenhuma alteração na lógica existente)
- Se `recordType === "rfc"`: renderiza o `<RFCFormSection>`

---

## Fluxo de Submit da RFC

### Rascunho
1. Cria um ticket na tabela `tickets` com:
   - `record_type: 'rfc'`
   - `status: 'novo'`
   - Campos obrigatórios mínimos: `client_id`, `segment`, `title`, `contact_name`, `contact_email`
   - Campos do Suporte deixados com valores padrão
2. Insere os passos na tabela `rfc_steps` com referência ao `ticket_id`

### Solicitar Aprovação
1. Mesmo processo do rascunho, mas:
   - `status: 'aguardando_aprovacao'`
   - Salva no comentário do ticket quem solicitou (via `ticket_comments`)

---

## Sequência de Implementação

```text
1. Migração SQL (3 partes em sequência)
   └─ Adiciona ticket_status 'aguardando_aprovacao'
   └─ Adiciona coluna record_type em tickets
   └─ Cria tabela rfc_steps com RLS

2. Cria RFCStepBuilder.tsx
   └─ Componente de lista de passos

3. Cria RFCFormSection.tsx  
   └─ Formulário RFC usando RFCStepBuilder

4. Modifica NewTicketDialog.tsx
   └─ Adiciona state recordType
   └─ Adiciona seletor de Tabs no topo
   └─ Renderização condicional do formulário
```

---

## O que NÃO muda

- Todo o formulário de Suporte existente (sem qualquer alteração)
- Todas as queries, hooks, lógica de upload e estados do fluxo Suporte
- A listagem de tickets, filtros e permissões existentes
- Os campos obrigatórios atuais da tabela `tickets` continuam funcionando normalmente (a RFC preencherá valores padrão nesses campos quando necessário)

---

## Campos Mínimos para RFC no INSERT

Como a tabela `tickets` tem campos NOT NULL obrigatórios, a RFC os preencherá com:

| Campo obrigatório | Valor na RFC |
|---|---|
| `title` | Título da RFC (campo no formulário) |
| `contact_name` | `profile.full_name` |
| `contact_email` | `user.email` |
| `ticket_type` | `'service_request'` (default técnico) |
| `priority` | `'P3'` (default) |
| `category` | `'RFC'` (string literal) |
| `opening_reason` | `'Criação de RFC'` (automático) |
| `problem_faced` | Derivado da descrição |
| `started_at` | `now()` |
| `frequency` | `'pontual'` (default) |
| `business_impact` | `'medio'` (default) |
| `reproduction_steps` | Lista de passos como texto |
| `record_type` | `'rfc'` |
