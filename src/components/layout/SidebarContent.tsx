import { Button } from "@/components/ui/button";
import { TicketCountBadge } from "@/components/layout/TicketCountBadge";
import { SLAAlertBell } from "@/components/layout/SLAAlertBell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GradientSeparator } from "@/components/ui/gradient-separator";
import { Server, LogOut, Settings, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface SidebarContentProps {
  collapsed: boolean;
  pinned: boolean;
  onTogglePin: () => void;
  operationalNav: NavItem[];
  adminNav: NavItem[];
  pendingCount: number;
  myTicketsCount: number;
  profile: { full_name: string; avatar_url: string | null } | null;
  userEmail: string | undefined;
  isSuperAdmin: boolean;
  isTenantAdmin: boolean;
  isViewer: boolean;
  isOtimizzoUser: boolean;
  onClose: () => void;
  onProfileOpen: () => void;
  signOut: () => void;
}

const SidebarContent = ({
  collapsed,
  pinned,
  onTogglePin,
  operationalNav,
  adminNav,
  pendingCount,
  myTicketsCount,
  profile,
  userEmail,
  isSuperAdmin,
  isTenantAdmin,
  isViewer,
  isOtimizzoUser,
  onClose,
  onProfileOpen,
  signOut,
}: SidebarContentProps) => {
  const roleLabel = isSuperAdmin
    ? "Super Admin"
    : isTenantAdmin
    ? "Tenant Admin"
    : isViewer
    ? "Auditor"
    : isOtimizzoUser
    ? "Otimizzo"
    : "Usuário";

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const badgeCount =
      item.name === "Tickets"
        ? pendingCount
        : item.name === "Meus Tickets"
        ? myTicketsCount
        : 0;

    const link = (
      <NavLink
        key={item.name}
        to={item.href}
        className={cn(
          "relative flex items-center text-sm rounded-lg transition-colors hover:bg-sidebar-accent",
          collapsed ? "justify-center h-10 w-10 mx-auto" : "gap-3 px-3 py-2"
        )}
        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
        onClick={onClose}
      >
        <Icon className={collapsed ? "w-5 h-5" : "w-4 h-4"} />
        {!collapsed && (
          <>
            <span className="truncate">{item.name}</span>
            {item.name === "Tickets" && <TicketCountBadge count={pendingCount} />}
            {item.name === "Meus Tickets" && <TicketCountBadge count={myTicketsCount} />}
          </>
        )}
        {collapsed && badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold rounded-full bg-red-500 text-white">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </NavLink>
    );

    if (!collapsed) return link;
    return (
      <Tooltip key={item.name} delayDuration={100}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {item.name}
          {badgeCount > 0 ? ` (${badgeCount})` : ""}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <>
      <div
        className={cn(
          "flex items-center border-b border-sidebar-border h-16 shrink-0",
          collapsed ? "justify-center px-2" : "justify-between p-4"
        )}
      >
        <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
          <div className="flex items-center justify-center w-10 h-10 bg-sidebar-primary rounded-lg shrink-0">
            <Server className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="font-semibold text-sidebar-foreground">Otimizzo</h2>
              <p className="text-xs text-sidebar-foreground/70">Service Hub</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="flex items-center gap-1">
            <SLAAlertBell />
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
                  onClick={onTogglePin}
                >
                  {pinned ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {pinned ? "Recolher menu" : "Fixar menu"}
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      <nav className={cn("flex-1 overflow-y-auto overflow-x-hidden", collapsed ? "p-2 space-y-3" : "p-4 space-y-4")}>
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2">
              Operacional
            </p>
          )}
          {operationalNav.map(renderNavItem)}
        </div>

        {adminNav.length > 0 && (
          <>
            <GradientSeparator variant="sidebar" className="mx-3 my-2 opacity-50" />
            <div className="space-y-1">
              {!collapsed && (
                <p className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2">
                  Administrativo
                </p>
              )}
              {adminNav.map(renderNavItem)}
            </div>
          </>
        )}
      </nav>

      <div className={cn("shrink-0", collapsed ? "p-2" : "p-4")}>
        <GradientSeparator variant="sidebar" className={cn("mb-3", collapsed ? "mx-1" : "mx-3")} />
        {collapsed ? (
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <button
                onClick={onProfileOpen}
                className="mb-2 flex items-center justify-center w-10 h-10 mx-auto rounded-lg hover:bg-sidebar-accent transition-colors"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {profile?.full_name?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <div className="text-xs">
                <p className="font-medium">{profile?.full_name}</p>
                <p className="text-muted-foreground">{userEmail}</p>
                <p className="text-muted-foreground capitalize">{roleLabel}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <div
            className="mb-3 px-3 flex items-center gap-3 cursor-pointer rounded-lg hover:bg-sidebar-accent py-2 transition-colors"
            onClick={onProfileOpen}
            title="Editar perfil"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {profile?.full_name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.full_name}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{userEmail}</p>
              <p className="text-xs text-sidebar-foreground/70 capitalize mt-0.5">{roleLabel}</p>
            </div>
          </div>
        )}

        {(isSuperAdmin || isViewer) && (
          collapsed ? (
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <NavLink
                  to="/system-settings"
                  className="flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-colors hover:bg-sidebar-accent mb-2"
                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                  onClick={onClose}
                >
                  <Settings className="w-5 h-5" />
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>Configurações</TooltipContent>
            </Tooltip>
          ) : (
            <NavLink
              to="/system-settings"
              className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors hover:bg-sidebar-accent mb-2"
              activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
              onClick={onClose}
            >
              <Settings className="w-4 h-4" />
              Configurações
            </NavLink>
          )
        )}

        {collapsed ? (
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <Button
                onClick={signOut}
                variant="ghost"
                size="icon"
                className="w-10 h-10 mx-auto flex text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>Sair</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            onClick={signOut}
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        )}
      </div>
    </>
  );
};

export default SidebarContent;
