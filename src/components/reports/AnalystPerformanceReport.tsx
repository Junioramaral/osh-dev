import { useState } from "react";
import { SegmentSelect } from "@/components/common/SegmentSelect";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Trophy, Target, Clock, FileText, Star } from "lucide-react";
import { useAnalystPerformanceData } from "@/hooks/useAnalystPerformanceData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ReportCover from "./ReportCover";
import ReportPeriodFilter from "./ReportPeriodFilter";
import { ReportPeriodState, defaultReportPeriodState, rangeFromSingle } from "@/lib/reportPeriod";

interface AnalystPerformanceReportProps {
  onBack: () => void;
}

const COLORS = ["#3b82f6", "#22c55e", "#eab308", "#ef4444"];
const CSAT_COLORS = ["#22c55e", "#3b82f6", "#eab308", "#f97316", "#ef4444"];

const AnalystPerformanceReport = ({ onBack }: AnalystPerformanceReportProps) => {
  const [periodState, setPeriodState] = useState<ReportPeriodState>(defaultReportPeriodState());
  const [segment, setSegment] = useState("all");

  const range =
    periodState.mode === "single"
      ? rangeFromSingle(periodState.period)
      : rangeFromSingle({ preset: "current-month" });
  const startDate = range.start;
  const endDate = range.end;
  const periodLabel = range.label;

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

  // CSAT aggregation
  const totalCsatResponses = analysts?.reduce((sum, a) => sum + a.csat_count, 0) || 0;
  const avgCsatRating = analysts && totalCsatResponses > 0
    ? analysts.reduce((sum, a) => sum + (a.avg_csat_rating || 0) * a.csat_count, 0) / totalCsatResponses
    : 0;

  // CSAT distribution aggregation
  const csatDistribution = analysts?.reduce(
    (acc, a) => {
      acc[1] += a.csat_distribution[1];
      acc[2] += a.csat_distribution[2];
      acc[3] += a.csat_distribution[3];
      acc[4] += a.csat_distribution[4];
      acc[5] += a.csat_distribution[5];
      return acc;
    },
    { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  ) || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  const csatPieData = [
    { name: "5★", value: csatDistribution[5] },
    { name: "4★", value: csatDistribution[4] },
    { name: "3★", value: csatDistribution[3] },
    { name: "2★", value: csatDistribution[2] },
    { name: "1★", value: csatDistribution[1] },
  ].filter(d => d.value > 0);

  const barChartData = analysts?.slice(0, 10).map(a => ({
    name: a.analyst_name.split(" ")[0],
    tickets: a.total_tickets,
    resolved: a.resolved_tickets,
  })) || [];

  const csatBarData = analysts
    ?.filter(a => a.csat_count > 0)
    .slice(0, 10)
    .map(a => ({
      name: a.analyst_name.split(" ")[0],
      csat: a.avg_csat_rating?.toFixed(1) || 0,
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
    const handleAfterPrint = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', handleAfterPrint);
    };
    
    window.addEventListener('afterprint', handleAfterPrint);
    window.print();
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
        <div className="flex gap-4 print:hidden flex-wrap items-end">
          <ReportPeriodFilter value={periodState} onChange={setPeriodState} allowComparison={false} />
          <SegmentSelect value={segment} onValueChange={setSegment} className="w-48" />
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
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
            <Card className="print-break-avoid">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  CSAT Médio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-1">
                  <p className="text-3xl font-bold">{avgCsatRating.toFixed(1)}</p>
                  <span className="text-lg text-muted-foreground">/5</span>
                </div>
                <p className="text-xs text-muted-foreground">{totalCsatResponses} avaliações</p>
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
                    {analysts[0].csat_count > 0 && ` • ${analysts[0].avg_csat_rating?.toFixed(1)}★ CSAT`}
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

          {/* CSAT Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="print-break-avoid">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  Distribuição CSAT
                </CardTitle>
              </CardHeader>
              <CardContent>
                {csatPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={csatPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {csatPieData.map((_, index) => (
                          <Cell key={`cell-csat-${index}`} fill={CSAT_COLORS[index % CSAT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Sem avaliações no período
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="print-break-avoid">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  CSAT por Analista
                </CardTitle>
              </CardHeader>
              <CardContent>
                {csatBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={csatBarData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 5]} />
                      <Tooltip />
                      <Bar dataKey="csat" fill="hsl(45, 93%, 47%)" name="CSAT" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Sem avaliações no período
                  </div>
                )}
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
                    <TableHead className="text-center">CSAT</TableHead>
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
                      <TableCell className="text-center">
                        {analyst.csat_count > 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span>{analyst.avg_csat_rating?.toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
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
