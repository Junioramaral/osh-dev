

# Plano: Renomear `author_email` para `sender_email`

## Objetivo

Renomear o campo `author_email` para `sender_email` na tabela `ticket_comments` para melhor clareza semântica, já que o campo representa quem enviou a mensagem.

## Análise de Impacto

O campo `author_email` é utilizado em **4 locais** no projeto:

| Arquivo | Uso |
|---------|-----|
| `supabase/migrations/...` | Migração original (apenas histórico) |
| `src/integrations/supabase/types.ts` | Tipos TypeScript gerados automaticamente |
| `src/components/tickets/TicketComments.tsx` | Leitura e inserção de comentários |
| `supabase/functions/receive-email-reply/index.ts` | Inserção de comentários via email |

## Mudanças Necessárias

### 1. Migração de Banco de Dados

Criar uma nova migração SQL para renomear a coluna:

```sql
-- Renomear coluna author_email para sender_email
ALTER TABLE public.ticket_comments 
RENAME COLUMN author_email TO sender_email;

-- Atualizar comentário da coluna
COMMENT ON COLUMN public.ticket_comments.sender_email IS 'Email do remetente do comentário';
```

### 2. Atualizar Código Frontend

**Arquivo: `src/components/tickets/TicketComments.tsx`**

Substituir todas as referências de `author_email` para `sender_email`:

- Linha 32: `comment.author_email` → `comment.sender_email`
- Linha 37: `comment.author_email` → `comment.sender_email`
- Linha 162: `author_email: user?.email` → `sender_email: user?.email`

### 3. Atualizar Edge Function

**Arquivo: `supabase/functions/receive-email-reply/index.ts`**

Substituir na inserção do comentário:

- Linha 222: `author_email: from.email` → `sender_email: from.email`

### 4. Tipos TypeScript

O arquivo `src/integrations/supabase/types.ts` será atualizado automaticamente após a migração ser aplicada (este arquivo é gerado pelo Supabase CLI).

## Ordem de Execução

1. Primeiro: Executar a migração do banco de dados
2. Segundo: Atualizar o código frontend e a Edge Function
3. Os tipos serão regenerados automaticamente

## Considerações

- **Sem perda de dados**: A operação `RENAME COLUMN` preserva todos os dados existentes
- **Compatibilidade**: Todos os comentários existentes continuarão funcionando
- **Consistência**: Manter o prefixo "sender_" também poderia ser aplicado a `author_name` → `sender_name` no futuro, se desejado

