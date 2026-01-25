import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Target,
  Timer,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { format, subMonths, startOfMonth, endOfMonth, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useMonthlyTicketVolume } from "@/hooks/useMonthlyTicketVolume";

const OTIMIZZO_TENANT_ID = "00000000-0000-0000-0000-000000000001";

interface DashboardStats {
  totalTickets: number;
  ticketsFechados: number;
  ticketsAbertosHoje: number;
  ticketsEmAtendimento: number;
  ticketsAguardando: number;
  ticketsForaSLA: number;
  ticketsDB: number;
  ticketsApp: number;
  totalClientes: number;
  taxaSLA: number;
  ticketsResolvidosDentroSLA: number;
  ticketsResolvidosForaSLA: number;
  tempoMedioResolucaoMinutos: number;
}

interface MonthlyTrendData {
  month: string;
  monthLabel: string;
  abertos: number;
  fechados: number;
}

type TrendPeriod = 3 | 6 | 12;

const Dashboard = () => {
  const { user, profile, roles, isSuperAdmin, hasRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalTickets: 0,
    ticketsFechados: 0,
    ticketsAbertosHoje: 0,
    ticketsEmAtendimento: 0,
    ticketsAguardando: 0,
    ticketsForaSLA: 0,
    ticketsDB: 0,
    ticketsApp: 0,
    totalClientes: 0,
    taxaSLA: 0,
    ticketsResolvidosDentroSLA: 0,
    ticketsResolvidosForaSLA: 0,
    tempoMedioResolucaoMinutos: 0,
  });
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState<MonthlyTrendData[]>([]);
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>(6);
  const [barChartPeriod, setBarChartPeriod] = useState<TrendPeriod>(6);

  // Determine if current user is a client user
  const isClientUser = profile?.client_id && 
    profile.client_id !== OTIMIZZO_TENANT_ID && 
    !isSuperAdmin && 
    !hasRole('analyst_db') && 
    !hasRole('analyst_app') &&
    !hasRole('tenant_admin');

  // Fetch monthly volume data for bar chart (12 months stored, display configurable)
  const { data: monthlyVolumeData } = useMonthlyTicketVolume(
    isClientUser ? profile?.client_id : null,
    12
  );

  useEffect(() => {
    loadDashboardStats();
  }, [profile]);

  useEffect(() => {
    loadMonthlyTrend(trendPeriod);
  }, [profile, trendPeriod]);

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

      // Tickets fechados (resolvido ou fechado)
      const { count: fechadosCount } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['resolvido', 'fechado']);

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

      // Tickets resolvidos DENTRO do SLA
      const { count: dentroSLACount } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['resolvido', 'fechado'])
        .eq('sla_resolution_met', true);

      // Tickets resolvidos FORA do SLA
      const { count: foraSLAResolvidosCount } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['resolvido', 'fechado'])
        .eq('sla_resolution_met', false);

      // Calcular taxa de SLA
      const totalResolvidos = (dentroSLACount || 0) + (foraSLAResolvidosCount || 0);
      const taxaSLA = totalResolvidos > 0 
        ? Math.round(((dentroSLACount || 0) / totalResolvidos) * 100) 
        : 0;

      // Buscar tickets resolvidos para calcular tempo médio
      const { data: ticketsResolvidos } = await supabase
        .from('tickets')
        .select('created_at, resolved_at')
        .not('resolved_at', 'is', null);

      // Calcular tempo médio de resolução em minutos
      let tempoMedioResolucaoMinutos = 0;
      if (ticketsResolvidos && ticketsResolvidos.length > 0) {
        const totalMinutos = ticketsResolvidos.reduce((acc, ticket) => {
          const minutos = differenceInMinutes(
            new Date(ticket.resolved_at!),
            new Date(ticket.created_at!)
          );
          return acc + Math.max(0, minutos);
        }, 0);
        tempoMedioResolucaoMinutos = Math.round(totalMinutos / ticketsResolvidos.length);
      }

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
        ticketsFechados: fechadosCount || 0,
        ticketsAbertosHoje: todayCount || 0,
        ticketsEmAtendimento: emAtendimentoCount || 0,
        ticketsAguardando: aguardandoCount || 0,
        ticketsForaSLA: foraSLACount || 0,
        ticketsDB: dbCount || 0,
        ticketsApp: appCount || 0,
        totalClientes: clientsCount,
        taxaSLA: taxaSLA,
        ticketsResolvidosDentroSLA: dentroSLACount || 0,
        ticketsResolvidosForaSLA: foraSLAResolvidosCount || 0,
        tempoMedioResolucaoMinutos: tempoMedioResolucaoMinutos,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyTrend = async (periodMonths: number = 6) => {
    try {
      const months: MonthlyTrendData[] = [];
      
      for (let i = periodMonths - 1; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);
        
        // Tickets abertos no mês (criados)
        const { count: abertosCount } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());
        
        // Tickets fechados no mês (resolvidos)
        const { count: fechadosCount } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .gte('resolved_at', start.toISOString())
          .lte('resolved_at', end.toISOString())
          .in('status', ['resolvido', 'fechado']);
        
        months.push({
          month: format(monthDate, 'yyyy-MM'),
          monthLabel: format(monthDate, 'MMM/yy', { locale: ptBR }),
          abertos: abertosCount || 0,
          fechados: fechadosCount || 0,
        });
      }
      
      setTrendData(months);
    } catch (error) {
      console.error('Error loading monthly trend:', error);
    }
  };

  // Função para formatar minutos em formato legível
  const formatarTempoResolucao = (minutos: number): string => {
    if (minutos < 60) {
      return `${minutos} min`;
    } else if (minutos < 1440) { // menos de 24 horas
      const horas = Math.floor(minutos / 60);
      const mins = minutos % 60;
      return mins > 0 ? `${horas}h ${mins}m` : `${horas}h`;
    } else {
      const dias = Math.floor(minutos / 1440);
      const horasRestantes = Math.floor((minutos % 1440) / 60);
      return horasRestantes > 0 ? `${dias}d ${horasRestantes}h` : `${dias}d`;
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
      title: "Tickets Fechados",
      value: stats.ticketsFechados,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
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
        {/* Hero Section - Bem-vindo */}
        <Card className="bg-gradient-to-r from-primary/5 via-background to-accent/5 border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name} />
                <AvatarFallback className="text-lg bg-primary/10 text-primary">
                  {profile?.full_name?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-2xl md:text-3xl font-bold text-foreground">
                Bem-vindo, {profile?.full_name}!
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Tipo de usuário:</span>
              <Badge variant="secondary" className="capitalize font-medium">
                {isSuperAdmin 
                  ? 'Super Admin' 
                  : hasRole('tenant_admin') 
                    ? 'Tenant Admin' 
                    : hasRole('analyst_db') 
                      ? 'Analista DB' 
                      : hasRole('analyst_app') 
                        ? 'Analista APP' 
                        : 'Usuário'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              {isSuperAdmin && "Como super administrador, você tem acesso total ao sistema e pode gerenciar todos os tenants."}
              {!isSuperAdmin && hasRole('tenant_admin') && "Como administrador do tenant, você pode gerenciar usuários e recursos do seu tenant."}
              {hasRole('analyst_db') && "Como analista de banco de dados, você pode gerenciar tickets DB."}
              {hasRole('analyst_app') && "Como analista de aplicativos, você pode gerenciar tickets APP."}
              {!isSuperAdmin && !hasRole('tenant_admin') && !hasRole('analyst_db') && !hasRole('analyst_app') && "Você pode criar e acompanhar seus tickets."}
            </p>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {[...Array(10)].map((_, i) => (
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* Card especial de Taxa SLA */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Taxa de Resolução SLA
                </CardTitle>
                <div className={`p-2 rounded-lg ${
                  stats.taxaSLA >= 90 ? "bg-green-100" : stats.taxaSLA >= 70 ? "bg-yellow-100" : "bg-red-100"
                }`}>
                  <Target className={`w-4 h-4 ${
                    stats.taxaSLA >= 90 ? "text-green-600" : stats.taxaSLA >= 70 ? "text-yellow-600" : "text-red-600"
                  }`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  stats.taxaSLA >= 90 ? "text-green-600" : stats.taxaSLA >= 70 ? "text-yellow-600" : "text-red-600"
                }`}>
                  {stats.taxaSLA}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.ticketsResolvidosDentroSLA} de {stats.ticketsResolvidosDentroSLA + stats.ticketsResolvidosForaSLA} no prazo
                </p>
              </CardContent>
            </Card>

            {/* Card de Tempo Médio de Resolução */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Tempo Médio de Resolução
                </CardTitle>
                <div className="p-2 rounded-lg bg-blue-100">
                  <Timer className="w-4 h-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatarTempoResolucao(stats.tempoMedioResolucaoMinutos)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  baseado em {stats.ticketsFechados} tickets resolvidos
                </p>
              </CardContent>
            </Card>
            
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

        {/* Gráfico de Tendência Mensal */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Tendência Mensal: Tickets Abertos vs Fechados
            </CardTitle>
            <Select 
              value={trendPeriod.toString()} 
              onValueChange={(value) => setTrendPeriod(Number(value) as TrendPeriod)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Últimos 3 meses</SelectItem>
                <SelectItem value="6">Últimos 6 meses</SelectItem>
                <SelectItem value="12">Últimos 12 meses</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="monthLabel" 
                    className="text-xs fill-muted-foreground"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="abertos" 
                    name="Abertos" 
                    stroke="hsl(215, 65%, 55%)" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(215, 65%, 55%)', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="fechados" 
                    name="Fechados" 
                    stroke="hsl(142, 71%, 45%)" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(142, 71%, 45%)', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Carregando dados...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Barras - Volume Mensal de Tickets (Abertos vs Fechados) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              Volume Mensal: Tickets Abertos vs Fechados
            </CardTitle>
            <Select 
              value={barChartPeriod.toString()} 
              onValueChange={(value) => setBarChartPeriod(Number(value) as TrendPeriod)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Últimos 3 meses</SelectItem>
                <SelectItem value="6">Últimos 6 meses</SelectItem>
                <SelectItem value="12">Últimos 12 meses</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {monthlyVolumeData && monthlyVolumeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyVolumeData.slice(-barChartPeriod)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="monthLabel" 
                    className="text-xs fill-muted-foreground"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="abertos" 
                    name="Abertos" 
                    fill="hsl(48, 96%, 53%)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="fechados" 
                    name="Fechados" 
                    fill="hsl(142, 71%, 45%)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Carregando dados...
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
};

export default Dashboard;
