

# Plano: Renomear `author_name` para `sender_name`

## Objetivo

Renomear o campo `author_name` para `sender_name` na tabela `ticket_comments` para manter consistência semântica com o campo `sender_email` que acabou de ser renomeado.

## Análise de Impacto

O campo `author_name` é utilizado em **5 arquivos** do projeto:

| Arquivo | Ocorrências | Uso |
|---------|-------------|-----|
| `src/components/tickets/TicketComments.tsx` | 4 | Leitura e inserção de comentários |
| `src/hooks/useTicketActions.ts` | 1 | Inserção de comentário na resolução |
| `src/hooks/useBulkTicketActions.ts` | 4 | Inserção de comentários em ações em massa |
| `supabase/functions/receive-email-reply/index.ts` | 1 | Inserção de comentários via email |
| `src/integrations/supabase/types.ts` | 3 | Tipos TypeScript (gerado automaticamente) |

## Mudanças Necessárias

### 1. Migração de Banco de Dados

```sql
-- Renomear coluna author_name para sender_name
ALTER TABLE public.ticket_comments 
RENAME COLUMN author_name TO sender_name;

-- Atualizar comentário da coluna
COMMENT ON COLUMN public.ticket_comments.sender_name IS 'Nome do remetente do comentário';
```

### 2. Atualizar Frontend

**Arquivo: `src/components/tickets/TicketComments.tsx`**

Linhas a alterar:
- Linha 32: `comment.author_name` → `comment.sender_name` (2 ocorrências)
- Linha 33: `comment.author_name` → `comment.sender_name`
- Linha 37: `comment.author_name` → `comment.sender_name`
- Linha 161: `author_name: profile?.full_name` → `sender_name: profile?.full_name`

### 3. Atualizar Hooks

**Arquivo: `src/hooks/useTicketActions.ts`**

- Linha 61: `author_name: authorName` → `sender_name: authorName`

**Arquivo: `src/hooks/useBulkTicketActions.ts`**

- Linha 164: `author_name: authorName` → `sender_name: authorName`
- Linha 319: `author_name: authorName` → `sender_name: authorName`
- Linha 395: `author_name: authorName` → `sender_name: authorName`

### 4. Atualizar Edge Function

**Arquivo: `supabase/functions/receive-email-reply/index.ts`**

- Linha 223: `author_name: from.name || ticket.contact_name` → `sender_name: from.name || ticket.contact_name`

### 5. Tipos TypeScript

O arquivo `src/integrations/supabase/types.ts` será atualizado automaticamente após a migração ser aplicada.

## Ordem de Execução

1. **Primeiro**: Executar a migração do banco de dados
2. **Segundo**: Atualizar todos os arquivos de código simultaneamente
3. **Terceiro**: Os tipos TypeScript serão regenerados automaticamente

## Considerações

- **Sem perda de dados**: A operação `RENAME COLUMN` preserva todos os dados existentes
- **Compatibilidade**: Todos os comentários existentes continuarão funcionando
- **Consistência completa**: Após esta alteração, os campos terão o padrão consistente:
  - `sender_email` - Email do remetente
  - `sender_name` - Nome do remetente

