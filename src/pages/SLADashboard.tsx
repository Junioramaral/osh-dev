import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  Check
} from "lucide-react";
import { format, differenceInMinutes, subDays, startOfDay, endOfDay } from "date-fns";
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { calculateSLAStatus, formatDuration, type SLAStatus } from "@/lib/ticketUtils";
import { SegmentSelect } from "@/components/common/SegmentSelect";

const SLADashboard = () => {
  const { profile, hasRole, isSuperAdmin, tenantId } = useAuth();
  const [period, setPeriod] = useState("month");
  const [segment, setSegment] = useState<string>("all");
  const [clientId, setClientId] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");

  // Fetch clients for filter
  const { data: clients } = useQuery({
    queryKey: ["clients-list", profile?.id],
    queryFn: async () => {
      const query = supabase.from("clients").select("id, name").is("deleted_at", null).order("name");

      // RLS will handle tenant filtering automatically
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!(profile?.id)
  });

  // Fetch tickets data
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["sla-dashboard-tickets", period, segment, clientId, priority, profile?.id],
    queryFn: async () => {
      let query = supabase
        .from("tickets")
        .select(`
          *,
          clients(name)
        `)
        .neq('record_type', 'rfc');
      
      // Apply period filter
      const now = new Date();
      if (period === 'today') {
        query = query.gte('created_at', startOfDay(now).toISOString());
      } else if (period === 'week') {
        query = query.gte('created_at', subDays(now, 7).toISOString());
      } else if (period === 'month') {
        query = query.gte('created_at', subDays(now, 30).toISOString());
      } else if (period === 'quarter') {
        query = query.gte('created_at', subDays(now, 90).toISOString());
      }
      
      // Apply segment filter
      if (segment !== 'all' && (segment === 'DB' || segment === 'APP')) {
        query = query.eq('segment', segment as 'DB' | 'APP');
      }
      
      // Apply client filter
      if (clientId !== 'all') {
        query = query.eq('client_id', clientId);
      }
      
      // Apply priority filter
      if (priority !== 'all' && ['P1', 'P2', 'P3', 'P4'].includes(priority)) {
        query = query.eq('priority', priority as 'P1' | 'P2' | 'P3' | 'P4');
      }
      
      // Apply role-based filters
      // RLS handles tenant filtering automatically
      if (hasRole('analyst_db') && !hasRole('analyst_app') && !hasRole('tenant_admin')) {
        query = query.eq('segment', 'DB');
      } else if (hasRole('analyst_app') && !hasRole('analyst_db') && !hasRole('tenant_admin')) {
        query = query.eq('segment', 'APP');
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!(profile?.id)
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!tickets || tickets.length === 0) {
      return {
        compliance: { overall: 0, firstResponse: 0, resolution: 0, trend: 'stable' as const, trendValue: 0 },
        averageTimes: { firstResponse: 0, resolution: 0, formattedFirstResponse: '0min', formattedResolution: '0min' },
        atRisk: { count: 0, byPriority: {}, bySegment: {} },
        overdue: { count: 0, oldest: null },
        slaByStatus: [],
        slaByPriority: [],
        slaEvolution: [],
        criticalTickets: []
      };
    }

    // Calculate SLA compliance
    const resolvedTickets = tickets.filter(t => t.resolved_at);
    const firstResponseMet = resolvedTickets.filter(t => t.sla_first_response_met).length;
    const resolutionMet = resolvedTickets.filter(t => t.sla_resolution_met).length;
    
    const firstResponseRate = resolvedTickets.length > 0 ? (firstResponseMet / resolvedTickets.length) * 100 : 0;
    const resolutionRate = resolvedTickets.length > 0 ? (resolutionMet / resolvedTickets.length) * 100 : 0;
    const overallRate = resolvedTickets.length > 0 ? ((firstResponseMet + resolutionMet) / (resolvedTickets.length * 2)) * 100 : 0;

    const compliance = {
      overall: Math.round(overallRate),
      firstResponse: Math.round(firstResponseRate),
      resolution: Math.round(resolutionRate),
      trend: 'up' as const,
      trendValue: 2.5
    };

    // Calculate average times
    const respondedTickets = tickets.filter(t => t.first_response_at);
    const avgFirstResponse = respondedTickets.length > 0 
      ? respondedTickets.reduce((sum, t) => {
          const created = new Date(t.created_at);
          const responded = new Date(t.first_response_at!);
          return sum + differenceInMinutes(responded, created);
        }, 0) / respondedTickets.length
      : 0;
    
    const avgResolution = resolvedTickets.length > 0
      ? resolvedTickets.reduce((sum, t) => {
          const created = new Date(t.created_at);
          const resolved = new Date(t.resolved_at!);
          return sum + differenceInMinutes(resolved, created);
        }, 0) / resolvedTickets.length
      : 0;

    const averageTimes = {
      firstResponse: avgFirstResponse,
      resolution: avgResolution,
      formattedFirstResponse: formatDuration(avgFirstResponse),
      formattedResolution: formatDuration(avgResolution)
    };

    // Calculate tickets at risk and overdue
    const ticketsWithStatus = tickets.map(t => ({ ...t, slaStatus: calculateSLAStatus(t) }));
    const atRiskTickets = ticketsWithStatus.filter(t => t.slaStatus.type === 'warning');
    const overdueTickets = ticketsWithStatus.filter(t => t.slaStatus.type === 'overdue');

    const atRisk = {
      count: atRiskTickets.length,
      byPriority: atRiskTickets.reduce((acc, t) => {
        acc[t.priority] = (acc[t.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      bySegment: atRiskTickets.reduce((acc, t) => {
        acc[t.segment] = (acc[t.segment] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    const overdue = {
      count: overdueTickets.length,
      oldest: overdueTickets.length > 0 
        ? overdueTickets.reduce((oldest, t) => {
            const tTime = new Date(t.sla_first_response_deadline || t.sla_resolution_deadline).getTime();
            const oldestTime = new Date(oldest.sla_first_response_deadline || oldest.sla_resolution_deadline).getTime();
            return tTime < oldestTime ? t : oldest;
          })
        : null
    };

    // SLA by status for pie chart
    const statusCounts = ticketsWithStatus.reduce((acc, t) => {
      acc[t.slaStatus.type] = (acc[t.slaStatus.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const slaByStatus = [
      { name: 'Atendido', value: statusCounts['met'] || 0, fill: 'hsl(var(--success))' },
      { name: 'No Prazo', value: statusCounts['on-time'] || 0, fill: 'hsl(var(--primary))' },
      { name: 'Em Risco', value: statusCounts['warning'] || 0, fill: 'hsl(var(--warning))' },
      { name: 'Vencido', value: statusCounts['overdue'] || 0, fill: 'hsl(var(--destructive))' }
    ].filter(item => item.value > 0);

    // SLA by priority for bar chart
    const priorityGroups = ['P1', 'P2', 'P3', 'P4'];
    const slaByPriority = priorityGroups.map(p => {
      const priorityTickets = ticketsWithStatus.filter(t => t.priority === p);
      return {
        priority: p,
        atendido: priorityTickets.filter(t => t.slaStatus.type === 'met').length,
        noPrazo: priorityTickets.filter(t => t.slaStatus.type === 'on-time').length,
        emRisco: priorityTickets.filter(t => t.slaStatus.type === 'warning').length,
        vencido: priorityTickets.filter(t => t.slaStatus.type === 'overdue').length
      };
    }).filter(item => item.atendido + item.noPrazo + item.emRisco + item.vencido > 0);

    // SLA evolution for line chart (last 30 days)
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      return startOfDay(date);
    });

    const slaEvolution = last30Days.map(date => {
      const nextDay = endOfDay(date);
      const dayTickets = tickets.filter(t => {
        const created = new Date(t.created_at);
        return created >= date && created <= nextDay;
      });

      const resolved = dayTickets.filter(t => t.resolved_at);
      const met = resolved.filter(t => t.sla_resolution_met);
      const taxa = resolved.length > 0 ? (met.length / resolved.length) * 100 : 0;

      return {
        date: format(date, 'dd/MM'),
        taxa: Math.round(taxa),
        tickets: dayTickets.length
      };
    });

    // Critical tickets (overdue + at risk, sorted by urgency)
    const criticalTickets = [...overdueTickets, ...atRiskTickets]
      .sort((a, b) => {
        if (a.slaStatus.type === 'overdue' && b.slaStatus.type !== 'overdue') return -1;
        if (a.slaStatus.type !== 'overdue' && b.slaStatus.type === 'overdue') return 1;
        return (b.slaStatus.percentage || 0) - (a.slaStatus.percentage || 0);
      })
      .slice(0, 10);

    return {
      compliance,
      averageTimes,
      atRisk,
      overdue,
      slaByStatus,
      slaByPriority,
      slaEvolution,
      criticalTickets
    };
  }, [tickets]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard SLA</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral do cumprimento de SLA e performance do atendimento
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Período</label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="week">Última Semana</SelectItem>
                    <SelectItem value="month">Último Mês</SelectItem>
                    <SelectItem value="quarter">Último Trimestre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Segmento</label>
                <SegmentSelect
                  value={segment}
                  onValueChange={setSegment}
                  clientId={clientId}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Cliente</label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Clientes</SelectItem>
                    {clients?.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Prioridade</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="P1">P1 - Crítica</SelectItem>
                    <SelectItem value="P2">P2 - Alta</SelectItem>
                    <SelectItem value="P3">P3 - Média</SelectItem>
                    <SelectItem value="P4">P4 - Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* SLA Compliance Rate */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Taxa de Cumprimento SLA
                {metrics.compliance.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {metrics.compliance.overall}%
              </div>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <p>1ª Resposta: {metrics.compliance.firstResponse}%</p>
                <p>Resolução: {metrics.compliance.resolution}%</p>
              </div>
            </CardContent>
          </Card>

          {/* Average Times */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Tempo Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {metrics.averageTimes.formattedFirstResponse}
              </div>
              <p className="text-xs text-muted-foreground mt-1">1ª Resposta</p>
              <div className="text-xl font-semibold text-foreground mt-2">
                {metrics.averageTimes.formattedResolution}
              </div>
              <p className="text-xs text-muted-foreground">Resolução</p>
            </CardContent>
          </Card>

          {/* Tickets at Risk */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-warning" />
                Tickets em Risco
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">
                {metrics.atRisk.count}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.entries(metrics.atRisk.byPriority).map(([p, count]) => (
                  <Badge key={p} variant="outline" className="text-xs">
                    {p}: {count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Overdue Tickets */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Tickets Vencidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">
                {metrics.overdue.count}
              </div>
              {metrics.overdue.oldest && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Mais antigo: {metrics.overdue.oldest.ticket_number}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart: SLA by Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">SLA por Status</CardTitle>
              <CardDescription>Distribuição dos tickets por status de SLA</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.slaByStatus.length > 0 ? (
                <ChartContainer
                  config={{
                    value: {
                      label: "Quantidade",
                    },
                  }}
                  className="h-[300px]"
                >
                  <PieChart>
                    <Pie
                      data={metrics.slaByStatus}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {metrics.slaByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bar Chart: SLA by Priority */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">SLA por Prioridade</CardTitle>
              <CardDescription>Distribuição de SLA por nível de prioridade</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.slaByPriority.length > 0 ? (
                <ChartContainer
                  config={{
                    atendido: {
                      label: "Atendido",
                      color: "hsl(var(--success))",
                    },
                    noPrazo: {
                      label: "No Prazo",
                      color: "hsl(var(--primary))",
                    },
                    emRisco: {
                      label: "Em Risco",
                      color: "hsl(var(--warning))",
                    },
                    vencido: {
                      label: "Vencido",
                      color: "hsl(var(--destructive))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <BarChart data={metrics.slaByPriority}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="priority" stroke="hsl(var(--foreground))" />
                    <YAxis stroke="hsl(var(--foreground))" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="atendido" name="Atendido" stackId="a" fill="hsl(var(--success))" />
                    <Bar dataKey="noPrazo" name="No Prazo" stackId="a" fill="hsl(var(--primary))" />
                    <Bar dataKey="emRisco" name="Em Risco" stackId="a" fill="hsl(var(--warning))" />
                    <Bar dataKey="vencido" name="Vencido" stackId="a" fill="hsl(var(--destructive))" />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Line Chart: SLA Evolution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução do SLA</CardTitle>
            <CardDescription>Taxa de cumprimento de SLA nos últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.slaEvolution.length > 0 ? (
              <ChartContainer
                config={{
                  taxa: {
                    label: "Taxa de SLA (%)",
                    color: "hsl(var(--primary))",
                  },
                  tickets: {
                    label: "Tickets",
                  },
                }}
                className="h-[300px]"
              >
                <LineChart data={metrics.slaEvolution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--foreground))" />
                  <YAxis stroke="hsl(var(--foreground))" domain={[0, 100]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <ReferenceLine y={90} stroke="hsl(var(--success))" strokeDasharray="3 3" label="Meta SLA (90%)" />
                  <Line 
                    type="monotone" 
                    dataKey="taxa" 
                    name="Taxa de SLA (%)" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem dados disponíveis
              </div>
            )}
          </CardContent>
        </Card>

        {/* Critical Tickets Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tickets Críticos</CardTitle>
            <CardDescription>
              Tickets com SLA vencido ou em risco (Top 10 por urgência)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.criticalTickets.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Segmento</TableHead>
                      <TableHead>Status SLA</TableHead>
                      <TableHead>Tempo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.criticalTickets.map((ticket: any) => (
                      <TableRow 
                        key={ticket.id}
                        className={ticket.slaStatus.type === 'overdue' ? 'bg-destructive/5' : 'bg-warning/5'}
                      >
                        <TableCell className="font-medium">{ticket.ticket_number}</TableCell>
                        <TableCell className="max-w-xs truncate">{ticket.title}</TableCell>
                        <TableCell>{ticket.clients?.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{ticket.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{ticket.segment}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={ticket.slaStatus.color}>
                            {ticket.slaStatus.icon}
                            <span className="ml-1">{ticket.slaStatus.label}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{ticket.slaStatus.timeRemaining}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                Nenhum ticket crítico no momento
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default SLADashboard;
