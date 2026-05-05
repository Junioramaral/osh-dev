import { useState, useRef } from "react";
import { ArrowLeft, Printer, Clock, FileText, Calculator, Percent, AlertTriangle, Users, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAnalystHoursManagementData, PeriodFilter } from "@/hooks/useAnalystHoursManagementData";
import ReportCover from "./ReportCover";
import ReportFooter from "./ReportFooter";
import PrintPage from "./PrintPage";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AppLayout from "@/components/layout/AppLayout";
import ReportPeriodFilter from "./ReportPeriodFilter";
import { ReportPeriodState, defaultReportPeriodState, rangeFromSingle } from "@/lib/reportPeriod";

interface AnalystHoursManagementReportProps {
  onBack: () => void;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "#f59e0b", "#10b981", "#8b5cf6"];

const getCoverageColor = (rate: number) => {
  if (rate >= 80) return "bg-green-500/20 text-green-700 border-green-300";
  if (rate >= 50) return "bg-yellow-500/20 text-yellow-700 border-yellow-300";
  return "bg-red-500/20 text-red-700 border-red-300";
};

const AnalystHoursManagementReport = ({ onBack }: AnalystHoursManagementReportProps) => {
  const [periodState, setPeriodState] = useState<ReportPeriodState>(defaultReportPeriodState());
  const [clientId, setClientId] = useState<string>("");
  const [analystId, setAnalystId] = useState<string>("");
  const [segment, setSegment] = useState<string>("");
  const [onlyWithoutLogs, setOnlyWithoutLogs] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Fetch clients for filter
  const { data: clients } = useQuery({
    queryKey: ["clients-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch analysts for filter
  const { data: analysts } = useQuery({
    queryKey: ["analysts-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const range =
    periodState.mode === "single"
      ? rangeFromSingle(periodState.period)
      : rangeFromSingle({ preset: "current-month" });
  const customRange = {
    startDate: format(range.start, "yyyy-MM-dd"),
    endDate: format(range.end, "yyyy-MM-dd"),
  };
  const periodLabel = range.label;

  const { data, isLoading } = useAnalystHoursManagementData(
    "current" as PeriodFilter,
    clientId && clientId !== "__all__" ? clientId : undefined,
    analystId && analystId !== "__all__" ? analystId : undefined,
    segment && segment !== "__all__" ? (segment as "DB" | "APP") : null,
    onlyWithoutLogs,
    customRange
  );

  const handlePrint = () => {
    const clientName = clientId && clientId !== "__all__"
      ? clients?.find(c => c.id === clientId)?.name || "Cliente"
      : "Todos_Clientes";
    const sanitizedClient = clientName.replace(/[^a-zA-Z0-9]/g, "_");
    const date = format(new Date(), "yyyy-MM-dd");
    
    document.title = `Gestao_Horas_${sanitizedClient}_${periodLabel.replace(/\s/g, "_")}_${date}`;
    window.print();
  };

  // Prepare chart data
  const barChartData = data?.byClient.slice(0, 8).map(client => ({
    name: client.client_name.length > 15 
      ? client.client_name.substring(0, 15) + "..." 
      : client.client_name,
    "Horas Vida": client.total_lifetime_hours,
    "Horas Lançadas": client.total_logged_hours,
  })) || [];

  const pieChartData = [
    { name: "Horas Registradas", value: data?.overall.total_logged_hours || 0 },
    { name: "Horas Não Registradas", value: data?.overall.total_difference || 0 },
  ];

  return (
    <AppLayout>
    <div className="space-y-6">
      {/* Header - Hidden on print */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestão de Horas dos Analistas</h1>
            <p className="text-muted-foreground">
              Compare horas de vida dos tickets com horas registradas
            </p>
          </div>
        </div>
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {/* Filters - Hidden on print */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <ReportPeriodFilter value={periodState} onChange={setPeriodState} allowComparison={false} />
            <div className="grid gap-4 md:grid-cols-4">

            <div className="space-y-2">
              <label className="text-sm font-medium">Cliente</label>
              <Select value={clientId || "__all__"} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Analista</label>
              <Select value={analystId || "__all__"} onValueChange={setAnalystId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {analysts?.map((analyst) => (
                    <SelectItem key={analyst.id} value={analyst.id}>
                      {analyst.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Segmento</label>
              <Select value={segment || "__all__"} onValueChange={setSegment}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  <SelectItem value="DB">Database</SelectItem>
                  <SelectItem value="APP">Aplicação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="only-without-logs" 
                  checked={onlyWithoutLogs}
                  onCheckedChange={(checked) => setOnlyWithoutLogs(checked === true)}
                />
                <Label htmlFor="only-without-logs" className="text-sm">
                  Apenas sem lançamentos
                </Label>
              </div>
            </div>
          </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      <div ref={reportRef} className="space-y-6">
        {/* Print Cover */}
        <div className="hidden print:block">
          <ReportCover
            title="Gestão de Horas dos Analistas"
            subtitle="Comparativo de Horas de Vida vs Horas Registradas"
            periodLabel={periodLabel}
            clientName={clientId && clientId !== "__all__" ? clients?.find(c => c.id === clientId)?.name : undefined}
          />
        </div>

        <PrintPage>
          {/* Summary Cards */}
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-4 print:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Horas Vida</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data?.overall.total_lifetime_hours.toFixed(1)}h</div>
                  <p className="text-xs text-muted-foreground">
                    {data?.overall.total_tickets} tickets
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Lançadas</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data?.overall.total_logged_hours.toFixed(1)}h</div>
                  <p className="text-xs text-muted-foreground">
                    {data?.overall.unique_analysts} analistas
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Diferença</CardTitle>
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {data?.overall.total_difference.toFixed(1)}h
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {data?.overall.tickets_without_logs} sem lançamentos
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taxa de Registro</CardTitle>
                  <Percent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data?.overall.coverage_rate.toFixed(0)}%
                  </div>
                  <Badge className={getCoverageColor(data?.overall.coverage_rate || 0)}>
                    {(data?.overall.coverage_rate || 0) >= 80 ? "Excelente" : 
                     (data?.overall.coverage_rate || 0) >= 50 ? "Moderado" : "Atenção"}
                  </Badge>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Charts */}
          {!isLoading && data && (
            <div className="grid gap-6 md:grid-cols-2 mt-6 print:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Horas por Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Horas Vida" fill="hsl(var(--muted-foreground))" />
                      <Bar dataKey="Horas Lançadas" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Taxa de Registro
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        <Cell fill="hsl(var(--primary))" />
                        <Cell fill="hsl(var(--destructive))" />
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value.toFixed(1)}h`} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </PrintPage>

        {/* Table by Client */}
        <PrintPage>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Resumo por Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-center">Tickets</TableHead>
                      <TableHead className="text-right">Horas Vida</TableHead>
                      <TableHead className="text-right">Horas Lançadas</TableHead>
                      <TableHead className="text-right">Diferença</TableHead>
                      <TableHead className="text-center">Taxa</TableHead>
                      <TableHead>Analista Principal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.byClient.map((client) => (
                      <TableRow key={client.client_id}>
                        <TableCell className="font-medium">{client.client_name}</TableCell>
                        <TableCell className="text-center">{client.ticket_count}</TableCell>
                        <TableCell className="text-right">{client.total_lifetime_hours.toFixed(1)}h</TableCell>
                        <TableCell className="text-right">{client.total_logged_hours.toFixed(1)}h</TableCell>
                        <TableCell className="text-right text-destructive font-medium">
                          {client.total_difference.toFixed(1)}h
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={getCoverageColor(client.coverage_rate)}>
                            {client.coverage_rate.toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell>{client.top_analyst || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {data && data.byClient.length > 0 && (
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell>TOTAL GERAL</TableCell>
                        <TableCell className="text-center">{data.overall.total_tickets}</TableCell>
                        <TableCell className="text-right">{data.overall.total_lifetime_hours.toFixed(1)}h</TableCell>
                        <TableCell className="text-right">{data.overall.total_logged_hours.toFixed(1)}h</TableCell>
                        <TableCell className="text-right text-destructive">
                          {data.overall.total_difference.toFixed(1)}h
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={getCoverageColor(data.overall.coverage_rate)}>
                            {data.overall.coverage_rate.toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell>-</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </PrintPage>

        {/* Table by Analyst */}
        <PrintPage>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Ranking por Analista (Taxa de Cobertura)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-48" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Analista</TableHead>
                      <TableHead className="text-center">Tickets</TableHead>
                      <TableHead className="text-right">Horas Vida</TableHead>
                      <TableHead className="text-right">Horas Lançadas</TableHead>
                      <TableHead className="text-center">Taxa de Cobertura</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.byAnalyst.map((analyst, index) => (
                      <TableRow key={analyst.analyst_id || "unassigned"}>
                        <TableCell className="font-medium">
                          <span className="text-muted-foreground mr-2">#{index + 1}</span>
                          {analyst.analyst_name}
                        </TableCell>
                        <TableCell className="text-center">{analyst.ticket_count}</TableCell>
                        <TableCell className="text-right">{analyst.total_lifetime_hours.toFixed(1)}h</TableCell>
                        <TableCell className="text-right">{analyst.total_logged_hours.toFixed(1)}h</TableCell>
                        <TableCell className="text-center">
                          <Badge className={getCoverageColor(analyst.coverage_rate)}>
                            {analyst.coverage_rate.toFixed(0)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </PrintPage>

        {/* Detailed Table by Ticket */}
        <PrintPage pageBreakAfter={false}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Detalhamento por Ticket (Ordenado por Maior Diferença)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-96" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead># Ticket</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Horas Vida</TableHead>
                      <TableHead className="text-right">Horas Lançadas</TableHead>
                      <TableHead className="text-right">Diferença</TableHead>
                      <TableHead className="text-center">Taxa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.tickets.slice(0, 50).map((ticket) => (
                      <TableRow key={ticket.ticket_id}>
                        <TableCell className="font-mono text-sm">{ticket.ticket_number}</TableCell>
                        <TableCell>{ticket.client_name}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={ticket.title}>
                          {ticket.title}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{ticket.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{ticket.lifetime_hours.toFixed(1)}h</TableCell>
                        <TableCell className="text-right">
                          {ticket.logged_hours === 0 ? (
                            <span className="text-destructive font-medium">0h</span>
                          ) : (
                            `${ticket.logged_hours.toFixed(1)}h`
                          )}
                        </TableCell>
                        <TableCell className="text-right text-destructive font-medium">
                          {ticket.difference_hours.toFixed(1)}h
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={getCoverageColor(ticket.coverage_rate)}>
                            {ticket.coverage_rate.toFixed(0)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {data && data.tickets.length > 50 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          ... e mais {data.tickets.length - 50} tickets
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </PrintPage>

        <ReportFooter />
      </div>
    </div>
    </AppLayout>
  );
};

export default AnalystHoursManagementReport;
