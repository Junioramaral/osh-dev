import { Button } from "@/components/ui/button";
import { TicketCountBadge } from "@/components/layout/TicketCountBadge";
import { SLAAlertBell } from "@/components/layout/SLAAlertBell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GradientSeparator } from "@/components/ui/gradient-separator";
import { Server, LogOut, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { LucideIcon } from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface SidebarContentProps {
  operationalNav: NavItem[];
  adminNav: NavItem[];
  pendingCount: number;
  myTicketsCount: number;
  profile: { full_name: string; avatar_url: string | null } | null;
  userEmail: string | undefined;
  isSuperAdmin: boolean;
  isViewer: boolean;
  isOtimizzoUser: boolean;
  onClose: () => void;
  onProfileOpen: () => void;
  signOut: () => void;
}

const SidebarContent = ({
  operationalNav,
  adminNav,
  pendingCount,
  myTicketsCount,
  profile,
  userEmail,
  isSuperAdmin,
  isViewer,
  isOtimizzoUser,
  onClose,
  onProfileOpen,
  signOut,
}: SidebarContentProps) => (
  <>
    <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-10 h-10 bg-sidebar-primary rounded-lg">
          <Server className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h2 className="font-semibold text-sidebar-foreground">Otimizzo</h2>
          <p className="text-xs text-sidebar-foreground/70">Service Hub</p>
        </div>
      </div>
      <SLAAlertBell />
    </div>

    <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
      <div className="space-y-1">
        <p className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2">
          Operacional
        </p>
        {operationalNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors hover:bg-sidebar-accent"
              activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
              onClick={onClose}
            >
              <Icon className="w-4 h-4" />
              {item.name}
              {item.name === "Tickets" && <TicketCountBadge count={pendingCount} />}
              {item.name === "Meus Tickets" && <TicketCountBadge count={myTicketsCount} />}
            </NavLink>
          );
        })}
      </div>

      {adminNav.length > 0 && (
        <>
          <GradientSeparator variant="sidebar" className="mx-3 my-2 opacity-50" />
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2">
              Administrativo
            </p>
            {adminNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors hover:bg-sidebar-accent"
                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                  onClick={onClose}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </NavLink>
              );
            })}
          </div>
        </>
      )}
    </nav>

    <div className="p-4 shrink-0">
      <GradientSeparator variant="sidebar" className="mx-3 mb-3" />
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
          <p className="text-xs text-sidebar-foreground/70 capitalize mt-0.5">
            {isSuperAdmin ? 'Super Admin' : isViewer ? 'Auditor' : isOtimizzoUser ? 'Otimizzo' : 'Usuário'}
          </p>
        </div>
      </div>
      {(isSuperAdmin || isViewer) && (
        <NavLink
          to="/system-settings"
          className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors hover:bg-sidebar-accent mb-2"
          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
          onClick={onClose}
        >
          <Settings className="w-4 h-4" />
          Configurações
        </NavLink>
      )}
      <Button
        onClick={signOut}
        variant="ghost"
        className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
      >
        <LogOut className="w-4 h-4" />
        Sair
      </Button>
    </div>
  </>
);

export default SidebarContent;
