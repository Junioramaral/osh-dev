import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Ticket,
  Database,
  AppWindow,
  Server,
  FileText,
  LogOut,
  Menu,
  BarChart3,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, profile, hasRole, isSuperAdmin, signOut, loading } = useAuth();
  const [open, setOpen] = useState(false);

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

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, show: true },
    { name: "Tickets", href: "/tickets", icon: Ticket, show: true },
    { name: "Dashboard SLA", href: "/sla-dashboard", icon: BarChart3, show: isSuperAdmin || hasRole('tenant_admin') || hasRole('analyst_db') || hasRole('analyst_app') },
    { name: "Clientes", href: "/clients", icon: Users, show: isSuperAdmin || hasRole('tenant_admin') || hasRole('analyst_db') || hasRole('analyst_app') },
    { name: "Bancos de Dados", href: "/databases", icon: Database, show: isSuperAdmin || hasRole('analyst_db') || hasRole('tenant_admin') },
    { name: "Aplicativos", href: "/applications", icon: AppWindow, show: isSuperAdmin || hasRole('analyst_app') || hasRole('tenant_admin') },
    { name: "Máquinas", href: "/machines", icon: Server, show: isSuperAdmin || hasRole('analyst_db') || hasRole('analyst_app') || hasRole('tenant_admin') },
    { name: "Base de Conhecimento", href: "/faq", icon: FileText, show: true },
    { name: "Admin Tenants", href: "/admin/tenants", icon: Users, show: isSuperAdmin },
  ].filter(item => item.show);

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-2 p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-10 h-10 bg-sidebar-primary rounded-lg">
          <Server className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h2 className="font-semibold text-sidebar-foreground">Otimizzo</h2>
          <p className="text-xs text-sidebar-foreground/70">Service Hub</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
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
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="mb-3 px-3">
          <p className="text-sm font-medium text-sidebar-foreground">{profile?.full_name}</p>
          <p className="text-xs text-sidebar-foreground/60">{user?.email}</p>
          <p className="text-xs text-sidebar-foreground/70 capitalize mt-1">
            {isSuperAdmin ? 'Super Admin' : hasRole('tenant_admin') ? 'Tenant Admin' : hasRole('analyst_db') ? 'Analista DB' : hasRole('analyst_app') ? 'Analista APP' : 'Usuário'}
          </p>
        </div>
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
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 bg-sidebar text-sidebar-foreground">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
            <Server className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold">Otimizzo</span>
        </div>
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

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
