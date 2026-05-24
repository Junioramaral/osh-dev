import { useLocation } from "react-router-dom";
import { LucideIcon, Server, LogOut, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SLAAlertBell } from "@/components/layout/SLAAlertBell";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface AppNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface AppSidebarProps {
  operationalNav: AppNavItem[];
  adminNav: AppNavItem[];
  pendingCount: number;
  myTicketsCount: number;
  profile: { full_name: string; avatar_url: string | null } | null;
  userEmail: string | undefined;
  isSuperAdmin: boolean;
  isTenantAdmin: boolean;
  isViewer: boolean;
  isOtimizzoUser: boolean;
  onProfileOpen: () => void;
  signOut: () => void;
}

const AppSidebar = ({
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
  onProfileOpen,
  signOut,
}: AppSidebarProps) => {
  const { pathname } = useLocation();
  const { setOpen, isMobile, state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";

  const roleLabel = isSuperAdmin
    ? "Super Admin"
    : isTenantAdmin
    ? "Tenant Admin"
    : isViewer
    ? "Auditor"
    : isOtimizzoUser
    ? "Otimizzo"
    : "Usuário";

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  const renderItem = (item: AppNavItem) => {
    const Icon = item.icon;
    const isActive = pathname === item.href;
    const badgeCount =
      item.name === "Tickets"
        ? pendingCount
        : item.name === "Meus Tickets"
        ? myTicketsCount
        : 0;
    const badgeColor =
      badgeCount === 0
        ? ""
        : badgeCount <= 5
        ? "bg-green-500 text-white"
        : badgeCount <= 15
        ? "bg-yellow-500 text-black"
        : "bg-red-500 text-white";

    return (
      <SidebarMenuItem key={item.name}>
        <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
          <NavLink to={item.href} onClick={handleNavClick}>
            <Icon className={cn(isActive && "text-primary")} />
            <span>{item.name}</span>
          </NavLink>
        </SidebarMenuButton>
        {badgeCount > 0 && (
          <SidebarMenuBadge className={cn("pointer-events-none", badgeColor)}>
            {badgeCount > 99 ? "99+" : badgeCount}
          </SidebarMenuBadge>
        )}
        {badgeCount > 0 && collapsed && (
          <span className="pointer-events-none absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
        )}
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar
      collapsible="icon"
      onMouseEnter={() => !isMobile && setOpen(true)}
      onMouseLeave={() => !isMobile && setOpen(false)}
    >
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1 overflow-hidden">
          <div className="flex items-center justify-center w-8 h-8 bg-sidebar-primary rounded-lg shrink-0">
            <Server className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <div
            className={cn(
              "flex-1 min-w-0 transition-opacity duration-200",
              collapsed && "opacity-0 pointer-events-none",
            )}
          >
            <h2 className="font-semibold text-sidebar-foreground leading-tight truncate">
              Otimizzo
            </h2>
            <p className="text-xs text-sidebar-foreground/70 truncate">Service Hub</p>
          </div>
          <div
            className={cn(
              "transition-opacity duration-200",
              collapsed && "opacity-0 pointer-events-none w-0",
            )}
          >
            <SLAAlertBell />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operacional</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{operationalNav.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {adminNav.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Administrativo</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{adminNav.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {collapsed ? (
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <SidebarMenuButton onClick={onProfileOpen} className="h-10">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name} />
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                        {profile?.full_name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{profile?.full_name}</span>
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  <div className="text-xs">
                    <p className="font-medium">{profile?.full_name}</p>
                    <p className="text-muted-foreground">{userEmail}</p>
                    <p className="text-muted-foreground">{roleLabel}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : (
              <SidebarMenuButton
                onClick={onProfileOpen}
                className="h-auto py-2"
                tooltip={profile?.full_name}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {profile?.full_name?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium truncate leading-tight">{profile?.full_name}</p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">{userEmail}</p>
                  <p className="text-xs text-sidebar-foreground/70 truncate">{roleLabel}</p>
                </div>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>

          {(isSuperAdmin || isViewer) && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/system-settings"}
                tooltip="Configurações"
              >
                <NavLink to="/system-settings" onClick={handleNavClick}>
                  <Settings />
                  <span>Configurações</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Sair">
              <LogOut />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;