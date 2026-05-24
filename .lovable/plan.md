## Objetivo

Transformar a sidebar atual (largura fixa `w-64`) em uma sidebar retrátil estilo "icon rail":
- **Recolhida (padrão)**: faixa estreita (~`w-16`) mostrando só os ícones de navegação + avatar + botões inferiores
- **Expandida**: largura cheia (`w-64`) mostrando ícones + rótulos
- **Gatilho**: hover do mouse sobre a faixa OU clique em um botão de pin/trigger no topo
- **Tooltips**: quando colapsada, cada item de navegação exibe tooltip com o nome ao passar o mouse
- **Mobile**: mantém o comportamento atual (Sheet/Drawer pelo menu hamburger), sem alteração

## Abordagem

Em vez de migrar para o `Sidebar` do shadcn (refator grande, afeta `AppLayout`, mobile, header, badges customizados), faremos um upgrade incremental no `AppLayout.tsx` e `SidebarContent.tsx` existentes — preservando toda a lógica de navegação, contadores (`TicketCountBadge`), `SLAAlertBell`, perfil e logout.

### 1. Estado de expansão (`AppLayout.tsx`)
- Adicionar estado local `sidebarExpanded` (boolean) + `sidebarPinned` (boolean, persistido em `localStorage`)
- Expandida = `sidebarPinned || sidebarExpanded` (hover)
- Handlers: `onMouseEnter` expande, `onMouseLeave` recolhe (só quando não está pinned)
- `<aside>` recebe `onMouseEnter/Leave` e classes condicionais: `w-16` recolhida / `w-64` expandida, com `transition-[width] duration-200 ease-out`

### 2. `SidebarContent.tsx`
- Receber nova prop `collapsed: boolean`
- Header (logo + título):
  - Recolhido: só o ícone do logo centralizado; esconder textos "Otimizzo / Service Hub"; mover `SLAAlertBell` para fora ou esconder quando colapsado (já existe no mobile header)
- Adicionar botão de pin/toggle no topo (ícone `PanelLeftClose` / `PanelLeftOpen` da lucide-react) que alterna `sidebarPinned`
- Itens de navegação (`operationalNav` e `adminNav`):
  - Quando `collapsed`: esconder o `{item.name}` e os badges (`TicketCountBadge`); centralizar o ícone (`justify-center`); envolver o `NavLink` em `Tooltip` (side="right") mostrando o nome + contador se houver
  - Quando expandido: layout atual
  - Esconder os títulos "Operacional" / "Administrativo" quando recolhido
- Bloco do perfil (avatar + nome + email + role):
  - Recolhido: só avatar centralizado, com tooltip mostrando nome/email/role
- Botões "Configurações" e "Sair":
  - Recolhido: só ícone centralizado com tooltip

### 3. Tooltips
- Usar `Tooltip`/`TooltipTrigger`/`TooltipContent` de `@/components/ui/tooltip` (já existe `TooltipProvider` no `App.tsx`)
- `side="right"`, `sideOffset={8}` para não sobrepor a faixa

### 4. Persistência do pin
- `localStorage.getItem("sidebar:pinned")` na inicialização (default: pinned=true para não quebrar UX atual de quem já usa expandida); usuário pode despinar para ativar o modo icon rail com hover

### 5. Detalhes visuais
- Quando recolhida: `px-2` nos containers, ícones em `w-5 h-5` para boa hit area, item ativo mantém `bg-sidebar-accent`
- Badge de contador ainda aparece colado ao ícone quando recolhido (pequeno dot vermelho com número, posicionado `absolute -top-1 -right-1`) para não perder informação crítica de tickets pendentes
- `overflow-hidden` no `<aside>` para evitar flicker de texto durante transição

## Arquivos afetados

- `src/components/layout/AppLayout.tsx` — estado de expansão, handlers de hover, classes condicionais no `<aside>` desktop
- `src/components/layout/SidebarContent.tsx` — prop `collapsed`, tooltips, layout condicional, botão de pin, badge de contador colapsado

## Fora de escopo

- Mobile (Sheet) permanece igual
- Não migramos para `@/components/ui/sidebar` (shadcn)
- Sem mudanças em rotas, lógica de auth, hooks de contadores
