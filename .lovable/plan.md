

# Correcao: UI Travando - SidebarContent Inline Causando Remontagem

## Causa Raiz Identificada

O problema **persiste** porque a causa principal nao estava no `useToast` nem no `AuthContext`. O verdadeiro problema esta no **`AppLayout.tsx`**:

O componente `SidebarContent` e definido como uma **funcao inline** dentro do corpo do `AppLayout` (linha ~89). Isso significa que:

1. A cada re-render do `AppLayout`, uma **nova referencia de funcao** `SidebarContent` e criada
2. O React interpreta como um **componente completamente diferente**, desmontando a arvore anterior e montando uma nova
3. Isso causa **remontagem** do `SLAAlertBell`, de todos os `NavLink`, e de todos os hooks internos
4. O `SLAAlertBell` contem 2 queries com `refetchInterval: 30000` — a cada remontagem, as queries reiniciam
5. O `SidebarContent` e renderizado em **2 locais** (sidebar desktop + Sheet mobile), duplicando o problema
6. A cada 30s, o polling dispara -> re-render -> remontagem do SidebarContent -> queries reiniciam -> mais re-renders -> **acumulo exponencial** ate travar a UI

Isso explica por que a tela funciona apos refresh (nova montagem limpa) e trava apos alguns minutos (acumulo progressivo).

## Evidencia nos Logs de Rede

Os logs de rede mostram **8+ requests identicas** de `sla_notifications` no mesmo segundo (13:34:15), quando deveria haver apenas 2 (count + data). Isso confirma remontagens multiplas.

## Solucao

Extrair `SidebarContent` como um componente separado com props, para que o React mantenha a mesma referencia entre re-renders.

---

## Detalhes Tecnicos

### Arquivo: `src/components/layout/AppLayout.tsx`

**Problema atual (linha ~89):**
```text
const AppLayout = ({ children }) => {
  // ... state, hooks ...
  
  const SidebarContent = () => (  // <-- NOVA funcao a cada render!
    <>
      ...SLAAlertBell, NavLinks, etc...
    </>
  );

  return (
    <aside><SidebarContent /></aside>       // Remonta tudo
    <Sheet><SidebarContent /></Sheet>        // Remonta tudo
  );
};
```

**Correcao:** Extrair `SidebarContent` como componente separado fora do `AppLayout`, passando as dependencias como props:

```text
// Componente separado, referencia estavel
interface SidebarContentProps {
  operationalNav: NavItem[];
  adminNav: NavItem[];
  pendingCount: number;
  myTicketsCount: number;
  profile: Profile | null;
  user: User | null;
  isSuperAdmin: boolean;
  isViewer: boolean;
  isOtimizzoUser: boolean;
  onClose: () => void;
  onProfileOpen: () => void;
  signOut: () => Promise<void>;
}

const SidebarContent = ({ ...props }: SidebarContentProps) => (
  // ... mesmo JSX de antes, usando props em vez de closures
);

const AppLayout = ({ children }) => {
  // ... state, hooks ...
  
  return (
    <aside>
      <SidebarContent operationalNav={...} ... />
    </aside>
    <Sheet>
      <SidebarContent operationalNav={...} ... />
    </Sheet>
  );
};
```

### Arquivos a modificar

- `src/components/layout/AppLayout.tsx` — extrair SidebarContent como componente proprio

### O que NAO muda

- Nenhuma funcionalidade e alterada
- Nenhum visual e modificado
- Nenhum outro arquivo e tocado
- Apenas refatoracao estrutural para evitar remontagem

