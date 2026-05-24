## Objetivo

Substituir a sidebar atual (custom em `AppLayout.tsx` + `SidebarContent.tsx`) por uma sidebar baseada no componente shadcn `@/components/ui/sidebar` com `collapsible="icon"`, que:

- Inicia **colapsada** por padrão (trilho ~3rem com ícones).
- Expande automaticamente no **hover** sobre o trilho e recolhe no `onMouseLeave` (transição 200ms já nativa do shadcn).
- Mostra **tooltips à direita** nos itens quando colapsada (suportado nativamente via prop `tooltip` do `SidebarMenuButton`).
- Destaca o item ativo (rota atual) em ambos os estados usando tokens `sidebar-accent` / `primary`.
- No mobile (<768px) vira off-canvas drawer (`Sheet`) — comportamento nativo do shadcn `Sidebar`.

## Arquitetura

### 1. `AppLayout.tsx` — virar app shell
- Remover toda a `<aside>` custom, estado `sidebarPinned`/`sidebarHovered`, handlers de hover, props para `SidebarContent`, e o `Sheet` mobile.
- Envolver tudo com `<SidebarProvider defaultOpen={false}>` em um flex container `w-full`.
- Renderizar `<AppSidebar />` (novo) + `<main>` com o conteúdo (`{children}`).
- Adicionar header mobile compacto com `<SidebarTrigger />` (hambúrguer) + logo + `SLAAlertBell`. No desktop, esse header não aparece (md:hidden) — a sidebar gerencia seu próprio header.
- Manter `ProfileEditDialog`, `mustChangePassword`, `loading`, `signOut`, contadores (`usePendingTicketsCount`, `useMyTicketsCount`), permissões (`isSuperAdmin`, `isTenantAdmin`, etc.).
- Passar contadores, permissões, profile, `onProfileOpen`, `signOut` como props para `<AppSidebar />`.

### 2. Novo `src/components/layout/AppSidebar.tsx`
Substitui `SidebarContent.tsx` (que será deletado). Estrutura:

```text
<Sidebar collapsible="icon" onMouseEnter={...} onMouseLeave={...}>
  <SidebarHeader>
    logo (sempre) + "Otimizzo / Service Hub" (some no colapsado) + SLAAlertBell
  </SidebarHeader>
  <SidebarContent>
    <SidebarGroup label="Operacional">
      <SidebarMenu> items com SidebarMenuButton tooltip={item.name} </SidebarMenu>
    </SidebarGroup>
    <SidebarGroup label="Administrativo"> ... </SidebarGroup>
  </SidebarContent>
  <SidebarFooter>
    avatar + nome/email (some no colapsado) + Configurações + Sair (tooltips quando colapsado)
  </SidebarFooter>
</Sidebar>
```

#### Hover-to-expand
- Usar `useSidebar()` para acessar `setOpen` e `isMobile`.
- No `<Sidebar>` (componente raiz), adicionar `onMouseEnter={() => !isMobile && setOpen(true)}` e `onMouseLeave={() => !isMobile && setOpen(false)}`.
- Não usar a borda/trigger lateral de redimensionamento — apenas hover.
- `defaultOpen={false}` no `SidebarProvider` garante estado inicial colapsado.

#### Itens de navegação
- Cada item usa `<SidebarMenuButton asChild tooltip={item.name} isActive={pathname === item.href}>` envolvendo `<NavLink to={item.href}>` com ícone + `<span>{item.name}</span>`. A prop `tooltip` do shadcn já mostra o tooltip à direita só quando colapsado.
- Para os badges (`TicketCountBadge` em "Tickets" e "Meus Tickets"): usar `<SidebarMenuBadge>` quando expandido. Quando colapsado, mostrar um dot pequeno absolute no canto do ícone (já que `SidebarMenuBadge` é escondido pelo shadcn no modo icon). Usaremos um `<span>` posicionado com `group-data-[collapsible=icon]:block hidden` para o dot, e o badge normal com `group-data-[collapsible=icon]:hidden` para o número.

#### Grupos
- `<SidebarGroupLabel>` ("Operacional" / "Administrativo") — o shadcn já esconde labels automaticamente no modo icon-collapsed.

#### Footer
- Avatar clicável (`onProfileOpen`). Em expandido: avatar + nome + email + role. Em colapsado: só avatar (com tooltip via Radix `Tooltip` wrapper, pois o `SidebarMenuButton` tooltip é só para itens de menu).
- Botão "Configurações" (`NavLink` para `/system-settings`, só se `isSuperAdmin || isViewer`) e "Sair" — usar `<SidebarMenuButton tooltip="...">` para herdar o comportamento de tooltip colapsado.

### 3. Tokens / cores
- Usar exclusivamente tokens já existentes: `bg-sidebar`, `text-sidebar-foreground`, `bg-sidebar-accent`, `text-sidebar-accent-foreground`, `text-primary` (para ícone do item ativo). Sem cores hardcoded.

### 4. Deletar
- `src/components/layout/SidebarContent.tsx` (substituído por `AppSidebar.tsx`).

### 5. Mobile
- Nativo do shadcn: `collapsible="icon"` em mobile renderiza como `Sheet` off-canvas via `<SidebarTrigger>`.
- Header mobile no `AppLayout` contém o trigger.

## Arquivos afetados

- `src/components/layout/AppLayout.tsx` — reescrito como app shell com `SidebarProvider`
- `src/components/layout/AppSidebar.tsx` — **novo**, sidebar shadcn collapsible icon
- `src/components/layout/SidebarContent.tsx` — **deletado**

## Fora de escopo

- Lógica de contadores, auth, navegação (rotas) e badges de contagem permanecem idênticas.
- Sem mudanças em outras páginas/componentes (o `main` continua recebendo `children`).
