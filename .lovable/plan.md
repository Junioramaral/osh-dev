

# Fix: Tenant Admin não reflete role corretamente na sidebar

## Problema identificado

Há **3 falhas** no código atual que fazem o Tenant Admin aparecer como "Usuário" com menus limitados:

1. **Label da role no sidebar** (`SidebarContent.tsx` linha 127): A cadeia condicional não inclui `isTenantAdmin` — cai no fallback `'Usuário'`.

2. **Menus da sidebar** (`AppLayout.tsx` linhas 45-65): Itens de navegação usam `isSuperAdmin`, `isOtimizzoUser`, `isViewer` mas nunca `isTenantAdmin`. Tenant Admin vê os mesmos menus que um usuário comum.

3. **Prop não passada**: `SidebarContent` não recebe `isTenantAdmin` como prop.

## O que um Tenant Admin deveria ver

Um Tenant Admin gerencia seu próprio tenant. Ele deveria:
- Ver o label **"Tenant Admin"** na sidebar
- Ter acesso à página de **Admin do seu próprio Tenant** (gerenciar usuários do cliente)
- Ver **Dashboard**, **Tickets**, **Base de Conhecimento**, **Minhas RFCs** (menus operacionais padrão)
- Não precisa ver menus exclusivos da Otimizzo (SLA Dashboard, CSAT, Relatórios, Execução RFC, etc.)

## Mudanças

### 1. `src/components/layout/SidebarContent.tsx`
- Adicionar prop `isTenantAdmin: boolean` na interface
- Atualizar label da role: `isSuperAdmin ? 'Super Admin' : isTenantAdmin ? 'Tenant Admin' : isViewer ? 'Auditor' : isOtimizzoUser ? 'Otimizzo' : 'Usuário'`

### 2. `src/components/layout/AppLayout.tsx`
- Extrair `isTenantAdmin` do `useAuth()`
- Passar `isTenantAdmin` como prop para `SidebarContent`
- Adicionar item de menu administrativo para Tenant Admin acessar a página do seu tenant:
  - `{ name: "Meu Tenant", href: "/admin/tenants/{tenantId}", icon: Users, show: isTenantAdmin && !isSuperAdmin }`
  - Usar o `tenantId` do contexto de auth para montar o link

### 3. `src/pages/TenantDetail.tsx`
- Verificar se já permite acesso para `tenant_admin` (atualmente provavelmente restrito a `super_admin`/`viewer`). Se necessário, ajustar guard de acesso para que tenant admins possam acessar **apenas seu próprio tenant**.

## Detalhes técnicos

- Nenhuma mudança de banco de dados necessária — a role `tenant_admin` já existe na enum `app_role` e na tabela `user_roles`
- `isTenantAdmin` já é calculado no `AuthContext.tsx` (linha 130)
- `tenantId` já está disponível no `AuthContext.tsx` (linha 134)
- Arquivos modificados: `AppLayout.tsx`, `SidebarContent.tsx`, possivelmente `TenantDetail.tsx`

