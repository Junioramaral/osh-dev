
# Plano: Corrigir preenchimento do campo `author_email` em comentários do portal

## Problema Identificado

O campo `author_email` na tabela `ticket_comments` está `NULL` para todos os comentários criados via portal (source='portal'), enquanto deveria conter o email do usuário conectado.

## Causa Raiz

No arquivo `src/components/tickets/TicketComments.tsx`, ao inserir um novo comentário, o campo `author_email` não está sendo incluído no objeto de inserção.

**Código Atual (linhas 156-164):**
```typescript
const { data: commentData, error: commentError } = await supabase
  .from('ticket_comments')
  .insert({
    ticket_id: ticketId,
    author_id: user?.id,
    author_name: profile?.full_name,
    content,
    is_internal
    // author_email está FALTANDO
  })
```

## Solução

Adicionar o campo `author_email` utilizando `user?.email` que já está disponível através do contexto de autenticação (`useAuth()`).

## Mudanças Necessárias

### Arquivo: `src/components/tickets/TicketComments.tsx`

**Linha 158-164** - Adicionar `author_email: user?.email` ao objeto de inserção:

```typescript
const { data: commentData, error: commentError } = await supabase
  .from('ticket_comments')
  .insert({
    ticket_id: ticketId,
    author_id: user?.id,
    author_name: profile?.full_name,
    author_email: user?.email,  // NOVA LINHA
    content,
    is_internal
  })
```

## Impacto

- **Novos comentários**: Terão o campo `author_email` preenchido automaticamente
- **Comentários existentes**: Permanecerão com `NULL` (não é necessário migração, pois a UI já trata fallback)
- **Sem quebra de compatibilidade**: O campo é opcional e a lógica de exibição já usa fallback

## Verificação

Após a implementação, ao adicionar um novo comentário via portal, verificar no banco de dados se o campo `author_email` está preenchido com o email do usuário logado.
