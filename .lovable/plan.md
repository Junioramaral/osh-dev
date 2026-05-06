# Exibir email do analista no ticket

## Objetivo
No card "Pessoas" da página de detalhes do ticket, mostrar o email do analista logo abaixo do nome — no mesmo formato visual já usado para o Contato (nome em cima, email em texto pequeno e cinza embaixo).

## Contexto técnico
- Hoje em `src/components/tickets/TicketSidebar.tsx` o analista é renderizado a partir de `ticket.profiles.full_name` (join via `profiles!tickets_analyst_id_fkey`).
- A tabela `profiles` **não armazena email**. O email fica em `auth.users`, que não é acessível diretamente pelo client Supabase via RLS.
- Precisamos expor o email do analista de forma segura.

## Mudanças

### 1. Backend (Supabase)
Criar uma função SQL `security definer` que retorna o email de um usuário a partir do `user_id`, restrita a usuários autenticados:

```sql
create or replace function public.get_user_email(_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select email::text from auth.users where id = _user_id
$$;
```

Permissão: `grant execute on function public.get_user_email(uuid) to authenticated;`

Isso permite buscar o email apenas quando o caller já está autenticado e conhece o `user_id` do analista (que já é exposto via `tickets.analyst_id`).

### 2. Frontend
- Em `src/hooks/useTicketDetail.ts`, após carregar o ticket, se `ticket.analyst_id` existir, chamar `supabase.rpc('get_user_email', { _user_id: ticket.analyst_id })` e anexar o resultado em `ticket.analyst_email`.
- Em `src/components/tickets/TicketSidebar.tsx`, no bloco "Analista", abaixo do `<span>{full_name}</span>` adicionar:
  ```tsx
  {ticket.analyst_email && (
    <p className="text-xs text-muted-foreground">{ticket.analyst_email}</p>
  )}
  ```
  Ajustar o layout para coluna (igual ao Contato) quando houver email.

## Fora do escopo
- Não altera fluxo de notificações nem outras telas (ex.: lista de tickets, RFC). Apenas a visualização no sidebar do ticket.
