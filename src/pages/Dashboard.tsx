import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Plus,
  UserCheck,
  FileText,
  Undo2,
  LucideIcon,
  LayoutGrid,
  Flag,
  Tags,
  BarChart3,
} from "lucide-react";

// Componente de Seção do Dashboard
interface DashboardSectionProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}

const DashboardSection = ({ title, icon: Icon, children }: DashboardSectionProps) => (
  <Card className="p-6 bg-muted/30 border-dashed">
    <div className="flex items-center gap-2 text-muted-foreground mb-4">
      <Icon className="w-4 h-4" />
      <h3 className="text-sm font-medium uppercase tracking-wider">{title}</h3>
    </div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  </Card>
);
import NewTicketDialog from "@/components/tickets/NewTicketDialog";
import AppLayout from "@/components/layout/AppLayout";
import { format, subMonths, startOfMonth, endOfMonth, differenceInMinutes, subDays } from "date-fns";
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
  ticketsRetornadosInatividade: number;
  inactivityDays: number;
}

interface MonthlyTrendData {
  month: string;
  monthLabel: string;
  abertos: number;
  fechados: number;
}

type TrendPeriod = 3 | 6 | 12;

interface PriorityCount {
  priority: string;
  count: number;
}

interface CategoryCount {
  name: string;
  count: number;
}

const PRIORITY_STYLES: Record<string, { color: string; bgColor: string }> = {
  P1: { color: "text-red-600", bgColor: "bg-red-100" },
  P2: { color: "text-orange-600", bgColor: "bg-orange-100" },
  P3: { color: "text-yellow-600", bgColor: "bg-yellow-100" },
  P4: { color: "text-green-600", bgColor: "bg-green-100" },
};

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
    ticketsRetornadosInatividade: 0,
    inactivityDays: 7,
  });
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState<MonthlyTrendData[]>([]);
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>(6);
  const [barChartPeriod, setBarChartPeriod] = useState<TrendPeriod>(6);
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [priorityCounts, setPriorityCounts] = useState<PriorityCount[]>([]);
  const [topCategories, setTopCategories] = useState<CategoryCount[]>([]);
  const [totalForDistribution, setTotalForDistribution] = useState(0);
  const [clientSegments, setClientSegments] = useState<string[] | null>(null);
  const navigate = useNavigate();

  // Determine if current user is a client user
  const isClientUser = profile?.client_id && 
    profile.client_id !== OTIMIZZO_TENANT_ID && 
    !isSuperAdmin && 
    !hasRole('analyst_db') && 
    !hasRole('analyst_app') &&
    !hasRole('tenant_admin');

  // Fetch monthly volume data for bar chart (12 months stored, display configurable)
  // Clients see only their tenant; staff/admins see global volume (RLS handles scope).
  const { data: monthlyVolumeData } = useMonthlyTicketVolume(
    isClientUser ? (profile?.client_id ?? null) : null,
    12
  );

  useEffect(() => {
    loadDashboardStats();
  }, [profile]);

  useEffect(() => {
    const loadClientSegments = async () => {
      if (!isClientUser || !profile?.client_id) {
        setClientSegments(null);
        return;
      }
      const { data } = await supabase
        .from("clients")
        .select("segments")
        .eq("id", profile.client_id)
        .maybeSingle();
      setClientSegments(((data as any)?.segments as string[] | null) ?? []);
    };
    loadClientSegments();
  }, [profile, isClientUser]);

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

      // Tickets retornados à fila por inatividade (apenas para admins)
      let retornadosCount = 0;
      let inactivityDaysValue = 7;
      if (isSuperAdmin || hasRole('tenant_admin') || hasRole('analyst_db') || hasRole('analyst_app')) {
        // Buscar configuração de dias de inatividade
        const { data: configData } = await supabase
          .from('system_configs')
          .select('value')
          .eq('key', 'ticket_inactivity_days')
          .maybeSingle();
        
        inactivityDaysValue = configData?.value ? Number(configData.value) : 7;
        const cutoffDate = subDays(new Date(), inactivityDaysValue).toISOString();
        
        const { count: unlockedCount } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .gte('unlocked_at', cutoffDate)
          .not('unlocked_at', 'is', null);
        retornadosCount = unlockedCount || 0;
      }

      // Distribuição por prioridade e Top 5 categorias (excluindo RFCs)
      const { data: distributionTickets } = await supabase
        .from('tickets')
        .select('priority, category')
        .neq('record_type', 'rfc');

      const priorityMap = new Map<string, number>();
      const categoryMap = new Map<string, number>();
      (distributionTickets || []).forEach((t) => {
        if (t.priority) priorityMap.set(t.priority, (priorityMap.get(t.priority) || 0) + 1);
        if (t.category) categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + 1);
      });

      const priorityList: PriorityCount[] = ['P1', 'P2', 'P3', 'P4'].map((p) => ({
        priority: p,
        count: priorityMap.get(p) || 0,
      }));

      const topCats: CategoryCount[] = Array.from(categoryMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setPriorityCounts(priorityList);
      setTopCategories(topCats);
      setTotalForDistribution(distributionTickets?.length || 0);

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
        ticketsRetornadosInatividade: retornadosCount,
        inactivityDays: inactivityDaysValue,
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

  // Grupo 1: Visão Geral de Tickets
  const ticketOverviewCards = [
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
  ];

  // Grupo 2: Performance e SLA
  const slaPerformanceCards = [
    {
      title: "Fora do SLA",
      value: stats.ticketsForaSLA,
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

  // Grupo 3: Distribuição por Segmento
  const distributionCards = [
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

  // Card de clientes (condicional)
  const showClientsCard = isSuperAdmin || hasRole('tenant_admin') || hasRole('analyst_db') || hasRole('analyst_app');
  if (showClientsCard) {
    distributionCards.push({
      title: "Total de Clientes",
      value: stats.totalClientes,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    });
  }

  // Helper para renderizar cards individuais
  const renderStatCard = (stat: { title: string; value: number; icon: LucideIcon; color: string; bgColor: string }) => {
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
  };

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
            
            {/* Atalhos Rápidos */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button 
                onClick={() => setNewTicketOpen(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Novo Ticket
              </Button>
              
              {(isSuperAdmin || hasRole('analyst_db') || hasRole('analyst_app')) && (
                <Button 
                  variant="outline"
                  onClick={() => navigate('/my-tickets')}
                  className="gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  Meus Tickets
                </Button>
              )}
              
              <Button 
                variant="outline"
                onClick={() => navigate('/faq')}
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                FAQ
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-8">
            {[...Array(3)].map((_, sectionIdx) => (
              <div key={sectionIdx} className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
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
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Seção 1: Visão Geral de Tickets */}
            <DashboardSection title="Visão Geral de Tickets" icon={Ticket}>
              {ticketOverviewCards.map(renderStatCard)}
              {/* Card de Tickets Retornados por Inatividade - Apenas Admin */}
              {(isSuperAdmin || hasRole('analyst_db') || hasRole('analyst_app') || hasRole('tenant_admin')) && (
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Retornados à Fila ({stats.inactivityDays}d)
                    </CardTitle>
                    <div className="p-2 rounded-lg bg-warning/20">
                      <Undo2 className="w-4 h-4 text-warning" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${
                      stats.ticketsRetornadosInatividade > 0 ? "text-warning" : "text-green-600"
                    }`}>
                      {stats.ticketsRetornadosInatividade}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      desbloqueados por inatividade
                    </p>
                  </CardContent>
                </Card>
              )}
            </DashboardSection>

            {/* Seção 2: Performance e SLA */}
            <DashboardSection title="Performance e SLA" icon={Target}>
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

              {/* Outros cards de SLA */}
              {slaPerformanceCards.map(renderStatCard)}
            </DashboardSection>

            {/* Seção 3: Distribuição por Segmento */}
            <DashboardSection title="Distribuição por Segmento" icon={LayoutGrid}>
              {distributionCards.map(renderStatCard)}
            </DashboardSection>

            {/* Seção 4: Distribuição por Prioridade */}
            <DashboardSection title="Distribuição por Prioridade" icon={Flag}>
              {priorityCounts.map((p) =>
                renderStatCard({
                  title: `Tickets ${p.priority}`,
                  value: p.count,
                  icon: Flag,
                  color: PRIORITY_STYLES[p.priority]?.color || "text-muted-foreground",
                  bgColor: PRIORITY_STYLES[p.priority]?.bgColor || "bg-muted",
                })
              )}
            </DashboardSection>

            {/* Top 5 Categorias */}
            {topCategories.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <Tags className="w-5 h-5" />
                    Top 5 Categorias
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-center">Qtd</TableHead>
                        <TableHead className="text-center">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topCategories.map((cat, index) => (
                        <TableRow key={cat.name}>
                          <TableCell className="font-bold text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="font-medium">{cat.name}</TableCell>
                          <TableCell className="text-center font-semibold">{cat.count}</TableCell>
                          <TableCell className="text-center">
                            {totalForDistribution > 0
                              ? Math.round((cat.count / totalForDistribution) * 100)
                              : 0}
                            %
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
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

        {/* Resumo Numérico - Volume Mensal */}
        {monthlyVolumeData && monthlyVolumeData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Resumo Numérico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-center">Abertos</TableHead>
                    <TableHead className="text-center">Fechados</TableHead>
                    <TableHead className="text-center">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyVolumeData.slice(-barChartPeriod).map((m) => {
                    const saldo = m.fechados - m.abertos;
                    return (
                      <TableRow key={m.month}>
                        <TableCell className="capitalize font-medium">{m.monthLabel}</TableCell>
                        <TableCell className="text-center">
                          <span className="text-yellow-600 font-semibold">{m.abertos}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-green-600 font-semibold">{m.fechados}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={saldo >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                            {saldo > 0 ? "+" : ""}{saldo}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(() => {
                    const slice = monthlyVolumeData.slice(-barChartPeriod);
                    const totalAbertos = slice.reduce((sum, m) => sum + m.abertos, 0);
                    const totalFechados = slice.reduce((sum, m) => sum + m.fechados, 0);
                    const totalSaldo = totalFechados - totalAbertos;
                    return (
                      <TableRow className="font-bold border-t-2">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-center text-yellow-600">{totalAbertos}</TableCell>
                        <TableCell className="text-center text-green-600">{totalFechados}</TableCell>
                        <TableCell className="text-center">
                          <span className={totalSaldo >= 0 ? "text-green-600" : "text-red-600"}>
                            {totalSaldo > 0 ? "+" : ""}{totalSaldo}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })()}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

      </div>
      
      <NewTicketDialog 
        open={newTicketOpen} 
        onOpenChange={setNewTicketOpen} 
      />
    </AppLayout>
  );
};

export default Dashboard;
