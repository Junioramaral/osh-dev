import { ReactNode, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { Navigate } from "react-router-dom";
import { usePendingTicketsCount } from "@/hooks/usePendingTicketsCount";
import { useMyTicketsCount } from "@/hooks/useMyTicketsCount";
import { SLAAlertBell } from "@/components/layout/SLAAlertBell";
import { ProfileEditDialog } from "@/components/profile/ProfileEditDialog";
import AppSidebar from "@/components/layout/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  Ticket,
  UserCheck,
  Database,
  AppWindow,
  Server,
  FileText,
  BarChart3,
  FileBarChart,
  Star,
  ClipboardCheck,
  ClipboardList,
  ShieldCheck,
  Building2,
} from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, profile, signOut, loading, mustChangePassword } = useAuth();
  const { isPlatformAdmin, isTenantAdmin, isTenantStaff, tenantId } = useTenant();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  const { data: pendingCount = 0 } = usePendingTicketsCount();
  const { data: myTicketsCount = 0 } = useMyTicketsCount();

  const handleProfileOpen = useCallback(() => setProfileDialogOpen(true), []);

  const operationalNav = useMemo(() => [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, show: true },
    { name: "Tickets", href: "/tickets", icon: Ticket, show: true },
    { name: "Meus Tickets", href: "/my-tickets", icon: UserCheck, show: isTenantStaff },
    { name: "Dashboard SLA", href: "/sla-dashboard", icon: BarChart3, show: isTenantStaff },
    { name: "Satisfação (CSAT)", href: "/csat", icon: Star, show: isTenantStaff },
    { name: "Base de Conhecimento", href: "/faq", icon: FileText, show: true },
    { name: "Relatórios", href: "/reports", icon: FileBarChart, show: isTenantStaff },
    { name: "Execução RFC", href: "/rfc-execution", icon: ClipboardCheck, show: isTenantStaff },
    { name: "Aprovação RFC", href: "/rfc-aprovacao", icon: ShieldCheck, show: isTenantStaff },
    { name: "Minhas RFCs", href: "/minhas-rfcs", icon: ClipboardList, show: !isTenantStaff },
  ].filter(item => item.show), [isTenantStaff]);

  const adminNav = useMemo(() => [
    { name: "Plataforma", href: "/platform/tenants", icon: Building2, show: isPlatformAdmin },
    { name: "Meu Tenant", href: "/my-tenant", icon: Users, show: isTenantAdmin && !isPlatformAdmin },
    { name: "Clientes", href: "/clients", icon: Users, show: isTenantStaff },

    { name: "Máquinas", href: "/machines", icon: Server, show: isTenantStaff },
    { name: "Bancos de Dados", href: "/databases", icon: Database, show: isTenantStaff },
    { name: "Aplicativos", href: "/applications", icon: AppWindow, show: isTenantStaff },
  ].filter(item => item.show), [isPlatformAdmin, isTenantAdmin, isTenantStaff, tenantId]);

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
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full bg-background print:block print:h-auto print:overflow-visible">
        <AppSidebar
          operationalNav={operationalNav}
          adminNav={adminNav}
          pendingCount={pendingCount}
          myTicketsCount={myTicketsCount}
          profile={profile}
          userEmail={user?.email}
          isPlatformAdmin={isPlatformAdmin}
          isTenantAdmin={isTenantAdmin}
          isTenantStaff={isTenantStaff}
          onProfileOpen={handleProfileOpen}
          signOut={signOut}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card print:hidden">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
                <Server className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">Otimizzo</span>
            </div>
            <SLAAlertBell />
          </div>

          <main className="flex-1 overflow-auto print:overflow-visible print:h-auto print:block">
            <div className="container mx-auto p-6 print:max-w-none print:p-0 print:m-0">
              {children}
            </div>
          </main>
        </div>

        <ProfileEditDialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen} />
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
