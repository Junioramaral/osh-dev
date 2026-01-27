import { ReactNode, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePendingTicketsCount } from "@/hooks/usePendingTicketsCount";
import { useMyTicketsCount } from "@/hooks/useMyTicketsCount";
import { TicketCountBadge } from "@/components/layout/TicketCountBadge";
import { SLAAlertBell } from "@/components/layout/SLAAlertBell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileEditDialog } from "@/components/profile/ProfileEditDialog";
import { GradientSeparator } from "@/components/ui/gradient-separator";
import {
  LayoutDashboard,
  Users,
  Ticket,
  UserCheck,
  Database,
  AppWindow,
  Server,
  FileText,
  LogOut,
  Menu,
  BarChart3,
  Shield,
  Settings,
  FileBarChart,
  Star,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, profile, isSuperAdmin, isViewer, isOtimizzoUser, signOut, loading, mustChangePassword } = useAuth();
  const [open, setOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  
  // Hooks must be called before any conditional returns
  const { data: pendingCount = 0 } = usePendingTicketsCount();
  const { data: myTicketsCount = 0 } = useMyTicketsCount();

  // Camada adicional de segurança: redirecionar para /auth se precisar trocar senha
  if (mustChangePassword) {
    console.log('[AppLayout] User must change password, redirecting to /auth');
    return <Navigate to="/auth" replace />;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando permissões...</p>
        </div>
      </div>
    );
  }

  const operationalNav = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, show: true },
    { name: "Tickets", href: "/tickets", icon: Ticket, show: true },
    { name: "Meus Tickets", href: "/my-tickets", icon: UserCheck, show: isOtimizzoUser || isSuperAdmin || isViewer },
    { name: "Dashboard SLA", href: "/sla-dashboard", icon: BarChart3, show: isSuperAdmin || isOtimizzoUser || isViewer },
    { name: "Satisfação (CSAT)", href: "/csat", icon: Star, show: isSuperAdmin || isOtimizzoUser || isViewer },
    { name: "Base de Conhecimento", href: "/faq", icon: FileText, show: true },
    { name: "Relatórios", href: "/reports", icon: FileBarChart, show: isSuperAdmin || isOtimizzoUser || isViewer },
  ].filter(item => item.show);

  const adminNav = [
    { name: "Admin Tenants", href: "/admin/tenants", icon: Users, show: isSuperAdmin || isViewer },
    { name: "Clientes", href: "/clients", icon: Users, show: isSuperAdmin || isOtimizzoUser || isViewer },
    { name: "Permissões", href: "/admin/permissions", icon: Shield, show: isSuperAdmin || isViewer },
    { name: "Bancos de Dados", href: "/databases", icon: Database, show: isSuperAdmin || isOtimizzoUser || isViewer },
    { name: "Aplicativos", href: "/applications", icon: AppWindow, show: isSuperAdmin || isOtimizzoUser || isViewer },
    { name: "Máquinas", href: "/machines", icon: Server, show: isSuperAdmin || isOtimizzoUser || isViewer },
  ].filter(item => item.show);

  const SidebarContent = () => (
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
        {/* Seção Operacional */}
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
                onClick={() => setOpen(false)}
              >
                <Icon className="w-4 h-4" />
                {item.name}
                {item.name === "Tickets" && <TicketCountBadge count={pendingCount} />}
                {item.name === "Meus Tickets" && <TicketCountBadge count={myTicketsCount} />}
              </NavLink>
            );
          })}
        </div>

        {/* Seção Administrativa */}
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
                  onClick={() => setOpen(false)}
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
          onClick={() => setProfileDialogOpen(true)}
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
            <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
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
            onClick={() => setOpen(false)}
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

  return (
    <div className="flex h-screen bg-background print:block print:h-auto print:overflow-visible">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 h-screen bg-sidebar text-sidebar-foreground print:hidden">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card print:hidden">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
            <Server className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold">Otimizzo</span>
        </div>
        <div className="flex items-center gap-2">
          <SLAAlertBell />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground">
              <div className="flex flex-col h-full">
                <SidebarContent />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto print:overflow-visible print:h-auto print:block">
        <div className="container mx-auto p-6 print:max-w-none print:p-0 print:m-0">
          {children}
        </div>
      </main>

      {/* Profile Edit Dialog */}
      <ProfileEditDialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen} />
    </div>
  );
};

export default AppLayout;
