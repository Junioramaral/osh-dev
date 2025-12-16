import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Trophy, Target, Clock, FileText } from "lucide-react";
import { useAnalystPerformanceData } from "@/hooks/useAnalystPerformanceData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ReportCover from "./ReportCover";

interface AnalystPerformanceReportProps {
  onBack: () => void;
}

const COLORS = ["#3b82f6", "#22c55e", "#eab308", "#ef4444"];

const AnalystPerformanceReport = ({ onBack }: AnalystPerformanceReportProps) => {
  const [period, setPeriod] = useState("current");
  const [segment, setSegment] = useState("all");

  const now = new Date();
  const startDate = period === "current" 
    ? startOfMonth(now) 
    : period === "last" 
      ? startOfMonth(subMonths(now, 1))
      : startOfMonth(subMonths(now, 2));
  const endDate = period === "current" 
    ? endOfMonth(now) 
    : period === "last"
      ? endOfMonth(subMonths(now, 1))
      : endOfMonth(subMonths(now, 2));

  const periodLabel = format(startDate, "MMMM 'de' yyyy", { locale: ptBR });

  const { data: analysts, isLoading } = useAnalystPerformanceData({
    startDate,
    endDate,
    segment: segment !== "all" ? segment : undefined,
  });

  const totalTickets = analysts?.reduce((sum, a) => sum + a.total_tickets, 0) || 0;
  const totalResolved = analysts?.reduce((sum, a) => sum + a.resolved_tickets, 0) || 0;
  const avgSlaRate = analysts && analysts.length > 0 
    ? Math.round(analysts.reduce((sum, a) => sum + a.sla_met_rate, 0) / analysts.length)
    : 0;

  const barChartData = analysts?.slice(0, 10).map(a => ({
    name: a.analyst_name.split(" ")[0],
    tickets: a.total_tickets,
    resolved: a.resolved_tickets,
  })) || [];

  const priorityData = analysts?.reduce((acc, a) => {
    acc.P1 += a.tickets_by_priority.P1;
    acc.P2 += a.tickets_by_priority.P2;
    acc.P3 += a.tickets_by_priority.P3;
    acc.P4 += a.tickets_by_priority.P4;
    return acc;
  }, { P1: 0, P2: 0, P3: 0, P4: 0 }) || { P1: 0, P2: 0, P3: 0, P4: 0 };

  const pieData = [
    { name: "P1", value: priorityData.P1 },
    { name: "P2", value: priorityData.P2 },
    { name: "P3", value: priorityData.P3 },
    { name: "P4", value: priorityData.P4 },
  ].filter(d => d.value > 0);

  const sanitizeForFilename = (text: string) => {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  };

  const exportToPDF = () => {
    const originalTitle = document.title;
    const periodClean = sanitizeForFilename(periodLabel);
    document.title = `Performance_Analistas_${periodClean}`;
    window.print();
    setTimeout(() => { document.title = originalTitle; }, 100);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header - Hide on print */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Performance de Analistas</h1>
              <p className="text-muted-foreground">Métricas de produtividade por analista</p>
            </div>
          </div>
          <Button onClick={exportToPDF}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>

        {/* Filters - Hide on print */}
        <div className="flex gap-4 print:hidden">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Mês Atual</SelectItem>
              <SelectItem value="last">Mês Anterior</SelectItem>
              <SelectItem value="before">Dois Meses Atrás</SelectItem>
            </SelectContent>
          </Select>
          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Segmento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="DB">Banco de Dados</SelectItem>
              <SelectItem value="APP">Aplicação</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Report Content - Print Wrapper */}
        <div className="print:block print:overflow-visible">
          {/* PAGE 1: Cover */}
          <ReportCover 
            title="Relatório de Performance"
            subtitle="Análise de Produtividade dos Analistas"
            periodLabel={periodLabel}
          />

        {/* PAGE 2: Summary Cards */}
        <div className="print-section print-break-before space-y-6">
          <h2 className="text-2xl font-bold text-center mb-8">Resumo Executivo</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="print-break-avoid">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Analistas Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{analysts?.length || 0}</p>
              </CardContent>
            </Card>
            <Card className="print-break-avoid">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Total de Tickets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalTickets}</p>
              </CardContent>
            </Card>
            <Card className="print-break-avoid">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Resolvidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">{totalResolved}</p>
              </CardContent>
            </Card>
            <Card className="print-break-avoid">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  SLA Médio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{avgSlaRate}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Top Performer Highlight */}
          {analysts && analysts.length > 0 && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">🏆 Destaque do Período</p>
                  <p className="text-2xl font-bold text-primary">{analysts[0].analyst_name}</p>
                  <p className="text-muted-foreground">
                    {analysts[0].total_tickets} tickets • {analysts[0].resolved_tickets} resolvidos • {analysts[0].sla_met_rate}% SLA
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* PAGE 3: Charts */}
        <div className="print-section print-break-before space-y-6">
          <h2 className="text-2xl font-bold text-center mb-8">Análise Gráfica</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="print-break-avoid">
              <CardHeader>
                <CardTitle className="text-base">Top 10 Analistas por Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="tickets" fill="hsl(215, 65%, 45%)" name="Total" />
                    <Bar dataKey="resolved" fill="hsl(142, 71%, 45%)" name="Resolvidos" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="print-break-avoid">
              <CardHeader>
                <CardTitle className="text-base">Distribuição por Prioridade</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* PAGE 4+: Ranking Table */}
        <div className="print-section print-break-before">
          <h2 className="text-2xl font-bold text-center mb-8">Ranking de Analistas</h2>
          
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Analista</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Resolvidos</TableHead>
                    <TableHead className="text-center">SLA</TableHead>
                    <TableHead className="text-center">DB</TableHead>
                    <TableHead className="text-center">APP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysts?.map((analyst, index) => (
                    <TableRow key={analyst.analyst_id} className="print-break-avoid">
                      <TableCell>
                        {index < 3 ? (
                          <Badge variant={index === 0 ? "default" : "secondary"}>
                            {index + 1}º
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">{index + 1}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{analyst.analyst_name}</TableCell>
                      <TableCell className="text-center font-semibold">{analyst.total_tickets}</TableCell>
                      <TableCell className="text-center">{analyst.resolved_tickets}</TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={analyst.sla_met_rate >= 90 ? "default" : analyst.sla_met_rate >= 70 ? "secondary" : "destructive"}
                        >
                          {analyst.sla_met_rate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{analyst.tickets_by_segment.DB}</TableCell>
                      <TableCell className="text-center">{analyst.tickets_by_segment.APP}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AnalystPerformanceReport;
