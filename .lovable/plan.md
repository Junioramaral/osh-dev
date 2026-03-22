

# Atribuir Filas Diretamente ao Usuário (em vez de Time)

## Problema Atual
Hoje o analista é vinculado a um **time** (team_id), e o time é vinculado a filas (teams_queues). O usuário quer poder marcar **filas diretamente** no perfil do analista, usando checkboxes como as funções.

## Solução

### 1. Nova tabela `user_queues`
Criar uma tabela de junção `user_queues` (user_id, queue_id) para vincular filas diretamente ao usuário.

```sql
CREATE TABLE public.user_queues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  queue_id uuid NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, queue_id)
);

ALTER TABLE public.user_queues ENABLE ROW LEVEL SECURITY;

-- RLS: super admins manage, authenticated view
CREATE POLICY "Super admins manage user_queues" ON public.user_queues
  FOR ALL TO authenticated USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "View own queues" ON public.user_queues
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Otimizzo view user_queues" ON public.user_queues
  FOR SELECT TO authenticated USING (is_otimizzo_user(auth.uid()));
```

### 2. Criar componente `QueueCheckboxGroup`
Similar ao `RoleCheckboxGroup` — lista todas as filas ativas com checkboxes para seleção múltipla. Exibido no dialog de edição quando o usuário tem role de analista.

### 3. Atualizar `TenantDetail.tsx`
- Substituir o Select de "Time" por `QueueCheckboxGroup`
- No `editUserForm`, trocar `team_id: string` por `queue_ids: string[]`
- Ao salvar, fazer insert/delete na tabela `user_queues` (delete existentes + insert novos)
- Na tabela de listagem, mostrar as filas atribuídas em vez do time

### 4. Atualizar `useTenantUsers.ts`
- Buscar filas do usuário via `user_queues` join `queues` para exibir nomes
- Adicionar `queue_ids` e `queue_names` ao tipo `TenantUser`
- Adicionar lógica de save para user_queues no `updateUserMutation`

### 5. Atualizar `useAnalystQueues.ts`
- Consultar `user_queues` em vez de `teams_queues`
- Remover dependência de `profile.team_id`
- Usar `user_id` do auth diretamente

### 6. Atualizar `NewTicketDialog.tsx`
- Em vez de buscar o segmento pelo time do analista, derivar o segmento das **roles** do analista: `analyst_db` → "DB", `analyst_app` → "APP", ambos → ambos
- Buscar as filas do analista via `user_queues` para filtrar clientes
- Remover referência a `profile.team_id`

### 7. Atualizar função DB `get_analyst_queue_ids`
```sql
CREATE OR REPLACE FUNCTION public.get_analyst_queue_ids(_user_id uuid)
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT COALESCE(array_agg(uq.queue_id), ARRAY[]::uuid[])
  FROM user_queues uq
  WHERE uq.user_id = _user_id
$$;
```

### Arquivos afetados
- **Nova tabela**: `user_queues` (migration)
- **Novo componente**: `src/components/tenants/QueueCheckboxGroup.tsx`
- **Editados**: `TenantDetail.tsx`, `useTenantUsers.ts`, `useAnalystQueues.ts`, `NewTicketDialog.tsx`
- **Migration**: atualizar `get_analyst_queue_ids` function

