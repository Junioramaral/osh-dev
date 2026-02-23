import { ReactNode, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePendingTicketsCount } from "@/hooks/usePendingTicketsCount";
import { useMyTicketsCount } from "@/hooks/useMyTicketsCount";
import { SLAAlertBell } from "@/components/layout/SLAAlertBell";
import { ProfileEditDialog } from "@/components/profile/ProfileEditDialog";
import SidebarContent from "@/components/layout/SidebarContent";
import {
  LayoutDashboard,
  Users,
  Ticket,
  UserCheck,
  Database,
  AppWindow,
  Server,
  FileText,
  Menu,
  BarChart3,
  Shield,
  FileBarChart,
  Star,
  ClipboardCheck,
  ClipboardList,
  ShieldCheck,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, profile, isSuperAdmin, isViewer, isOtimizzoUser, signOut, loading, mustChangePassword } = useAuth();
  const [open, setOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  
  const { data: pendingCount = 0 } = usePendingTicketsCount();
  const { data: myTicketsCount = 0 } = useMyTicketsCount();

  const handleClose = useCallback(() => setOpen(false), []);
  const handleProfileOpen = useCallback(() => setProfileDialogOpen(true), []);

  const operationalNav = useMemo(() => [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, show: true },
    { name: "Tickets", href: "/tickets", icon: Ticket, show: true },
    { name: "Meus Tickets", href: "/my-tickets", icon: UserCheck, show: isOtimizzoUser || isSuperAdmin || isViewer },
    { name: "Dashboard SLA", href: "/sla-dashboard", icon: BarChart3, show: isSuperAdmin || isOtimizzoUser || isViewer },
    { name: "Satisfação (CSAT)", href: "/csat", icon: Star, show: isSuperAdmin || isOtimizzoUser || isViewer },
    { name: "Base de Conhecimento", href: "/faq", icon: FileText, show: true },
    { name: "Relatórios", href: "/reports", icon: FileBarChart, show: isSuperAdmin || isOtimizzoUser || isViewer },
    { name: "Execução RFC", href: "/rfc-execution", icon: ClipboardCheck, show: isOtimizzoUser || isSuperAdmin },
    { name: "Aprovação RFC", href: "/rfc-aprovacao", icon: ShieldCheck, show: isOtimizzoUser || isSuperAdmin },
    { name: "Minhas RFCs", href: "/minhas-rfcs", icon: ClipboardList, show: !isOtimizzoUser && !isSuperAdmin && !isViewer },
  ].filter(item => item.show), [isSuperAdmin, isViewer, isOtimizzoUser]);

  const adminNav = useMemo(() => [
    { name: "Admin Tenants", href: "/admin/tenants", icon: Users, show: isSuperAdmin || isViewer },
    { name: "Clientes", href: "/clients", icon: Users, show: isSuperAdmin || isOtimizzoUser || isViewer },
    { name: "Permissões", href: "/admin/permissions", icon: Shield, show: isSuperAdmin || isViewer },
    { name: "Máquinas", href: "/machines", icon: Server, show: isSuperAdmin || isOtimizzoUser || isViewer },
    { name: "Bancos de Dados", href: "/databases", icon: Database, show: isSuperAdmin || isOtimizzoUser || isViewer },
    { name: "Aplicativos", href: "/applications", icon: AppWindow, show: isSuperAdmin || isOtimizzoUser || isViewer },
  ].filter(item => item.show), [isSuperAdmin, isViewer, isOtimizzoUser]);

  if (mustChangePassword) {
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

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="flex h-screen bg-background print:block print:h-auto print:overflow-visible">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 h-screen bg-sidebar text-sidebar-foreground print:hidden">
        <SidebarContent
          operationalNav={operationalNav}
          adminNav={adminNav}
          pendingCount={pendingCount}
          myTicketsCount={myTicketsCount}
          profile={profile}
          userEmail={user?.email}
          isSuperAdmin={isSuperAdmin}
          isViewer={isViewer}
          isOtimizzoUser={isOtimizzoUser}
          onClose={handleClose}
          onProfileOpen={handleProfileOpen}
          signOut={signOut}
        />
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
                <SidebarContent
                  operationalNav={operationalNav}
                  adminNav={adminNav}
                  pendingCount={pendingCount}
                  myTicketsCount={myTicketsCount}
                  profile={profile}
                  userEmail={user?.email}
                  isSuperAdmin={isSuperAdmin}
                  isViewer={isViewer}
                  isOtimizzoUser={isOtimizzoUser}
                  onClose={handleClose}
                  onProfileOpen={handleProfileOpen}
                  signOut={signOut}
                />
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

      <ProfileEditDialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen} />
    </div>
  );
};

export default AppLayout;
