

# Corrigir carregamento dos dados do Admin na edição do Tenant

## Problema

A query `tenantAdmins` (linha 130-142 de `TenantDetail.tsx`) busca usuários com role `super_admin` no tenant. Porém, ao criar o tenant, o contato é convidado com role `user`. Resultado: nenhum admin é encontrado e os campos "Nome Completo do Admin" e "Email do Admin" ficam vazios.

## Correção

Alterar a query `tenantAdmins` para buscar o primeiro usuário do tenant (independente do role), em vez de filtrar por `super_admin`. Isso garante que o contato cadastrado na criação seja carregado corretamente.

### Alteração em `src/pages/TenantDetail.tsx`

**Linha 141**: trocar `.eq("user_roles.role", "super_admin")` por remover esse filtro, buscando qualquer usuário ativo do tenant. Ordenar por `created_at` para pegar o primeiro cadastrado (o contato original).

```typescript
// ANTES (linha 131-142):
const { data: profiles } = await supabase
  .from("profiles")
  .select(`id, full_name, user_roles!inner(role)`)
  .eq("client_id", tenantId)
  .eq("user_roles.role", "super_admin")  // ← problema: contato tem role 'user'
  .eq("is_active", true);

// DEPOIS:
const { data: profiles } = await supabase
  .from("profiles")
  .select(`id, full_name, user_roles!inner(role)`)
  .eq("client_id", tenantId)
  .eq("is_active", true)
  .order("created_at", { ascending: true })
  .limit(1);
```

Remove o filtro por `super_admin` e pega o primeiro usuário criado no tenant (que é o contato cadastrado na criação).

## Arquivo alterado
- `src/pages/TenantDetail.tsx` — query `tenantAdmins` (linhas 131-142)

