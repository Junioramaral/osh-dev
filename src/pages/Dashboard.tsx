import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Ticket,
  Clock,
  AlertTriangle,
  CheckCircle,
  Users,
  Database,
  AppWindow,
  TrendingUp,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

interface DashboardStats {
  totalTickets: number;
  ticketsAbertosHoje: number;
  ticketsEmAtendimento: number;
  ticketsAguardando: number;
  ticketsForaSLA: number;
  ticketsDB: number;
  ticketsApp: number;
  totalClientes: number;
}

const Dashboard = () => {
  const { user, profile, roles, isSuperAdmin, hasRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalTickets: 0,
    ticketsAbertosHoje: 0,
    ticketsEmAtendimento: 0,
    ticketsAguardando: 0,
    ticketsForaSLA: 0,
    ticketsDB: 0,
    ticketsApp: 0,
    totalClientes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, [profile]);

  const loadDashboardStats = async () => {
    try {
      // Total tickets
      const { count: totalCount } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true });

      // Tickets opened today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todayCount } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      // Tickets by status
      const { count: emAtendimentoCount } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'em_atendimento');

      const { count: aguardandoCount } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'aguardando_cliente');

      // Tickets fora do SLA (resolution deadline passed and not resolved)
      const now = new Date().toISOString();
      const { count: foraSLACount } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .lt('sla_resolution_deadline', now)
        .is('resolved_at', null);

      // Tickets by segment
      const { count: dbCount } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('segment', 'DB');

      const { count: appCount } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('segment', 'APP');

      // Total clients (if admin or analyst)
      let clientsCount = 0;
      if (isSuperAdmin || hasRole('tenant_admin') || hasRole('analyst_db') || hasRole('analyst_app')) {
        const { count } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true });
        clientsCount = count || 0;
      }

      setStats({
        totalTickets: totalCount || 0,
        ticketsAbertosHoje: todayCount || 0,
        ticketsEmAtendimento: emAtendimentoCount || 0,
        ticketsAguardando: aguardandoCount || 0,
        ticketsForaSLA: foraSLACount || 0,
        ticketsDB: dbCount || 0,
        ticketsApp: appCount || 0,
        totalClientes: clientsCount,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total de Tickets",
      value: stats.totalTickets,
      icon: Ticket,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Abertos Hoje",
      value: stats.ticketsAbertosHoje,
      icon: TrendingUp,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Em Atendimento",
      value: stats.ticketsEmAtendimento,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Aguardando Cliente",
      value: stats.ticketsAguardando,
      icon: AlertTriangle,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Fora do SLA",
      value: stats.ticketsForaSLA,
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Tickets DB",
      value: stats.ticketsDB,
      icon: Database,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Tickets APP",
      value: stats.ticketsApp,
      icon: AppWindow,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
  ];

  if (isSuperAdmin || hasRole('tenant_admin') || hasRole('analyst_db') || hasRole('analyst_app')) {
    statCards.push({
      title: "Total de Clientes",
      value: stats.totalClientes,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    });
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral do Service Desk</p>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="space-y-2">
                  <div className="h-4 bg-muted rounded w-2/3" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {stats.ticketsForaSLA > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Atenção: Tickets Fora do SLA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Existem {stats.ticketsForaSLA} ticket(s) com SLA vencido que requerem atenção imediata.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Bem-vindo, {profile?.full_name}!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Tipo de usuário:</span>
              <Badge variant="outline" className="capitalize">
                {isSuperAdmin ? 'Super Admin' : hasRole('tenant_admin') ? 'Tenant Admin' : hasRole('analyst_db') ? 'Analista DB' : hasRole('analyst_app') ? 'Analista APP' : 'Usuário'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {isSuperAdmin && "Como super administrador, você tem acesso total ao sistema e pode gerenciar todos os tenants."}
              {!isSuperAdmin && hasRole('tenant_admin') && "Como administrador do tenant, você pode gerenciar usuários e recursos do seu tenant."}
              {hasRole('analyst_db') && "Como analista de banco de dados, você pode gerenciar tickets DB."}
              {hasRole('analyst_app') && "Como analista de aplicativos, você pode gerenciar tickets APP."}
              {!isSuperAdmin && !hasRole('tenant_admin') && !hasRole('analyst_db') && !hasRole('analyst_app') && "Você pode criar e acompanhar seus tickets."}
            </p>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm">🔍 Debug: Estado das Roles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
              {JSON.stringify({ 
                userId: user?.id,
                email: user?.email,
                roles: roles,
                isSuperAdmin,
                hasRole: {
                  super_admin: hasRole('super_admin'),
                  tenant_admin: hasRole('tenant_admin'),
                  analyst_db: hasRole('analyst_db'),
                  analyst_app: hasRole('analyst_app'),
                }
              }, null, 2)}
            </pre>
            <Button 
              onClick={() => {
                console.log('🔄 Recarregando página...');
                window.location.reload();
              }}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Recarregar Página
            </Button>
            <p className="text-xs text-muted-foreground">
              ℹ️ Verifique o console do navegador (F12) para ver os logs detalhados
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
