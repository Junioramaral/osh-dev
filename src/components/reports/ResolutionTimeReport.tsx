import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, Clock, TrendingUp, TrendingDown, Timer, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { useResolutionTimeData } from "@/hooks/useResolutionTimeData";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import PrintPage from "./PrintPage";
import ReportCover from "./ReportCover";
import ReportFooter from "./ReportFooter";

interface ResolutionTimeReportProps {
  onBack: () => void;
}

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ${minutes % 60}min`;
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  return `${days}d ${hours}h`;
}

export default function ResolutionTimeReport({ onBack }: ResolutionTimeReportProps) {
  const [period, setPeriod] = useState("last-month");
  const [segment, setSegment] = useState("all");

  // Calculate date range based on period
  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case "current-month":
        return { start: startOfMonth(now), end: now };
      case "last-month":
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case "last-3-months":
        return { start: startOfMonth(subMonths(now, 3)), end: now };
      case "last-6-months":
        return { start: startOfMonth(subMonths(now, 6)), end: now };
      default:
        const lm = subMonths(now, 1);
        return { start: startOfMonth(lm), end: endOfMonth(lm) };
    }
  };

  const { start, end } = getDateRange();
  const startDate = format(start, "yyyy-MM-dd");
  const endDate = format(end, "yyyy-MM-dd");

  const { data, isLoading } = useResolutionTimeData({ startDate, endDate, segment });

  const sanitizeForFilename = (text: string) => {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_");
  };

  const exportToPDF = () => {
    const periodLabel = period === "current-month" ? "Mes_Atual" : 
                        period === "last-month" ? format(subMonths(new Date(), 1), "MMM_yyyy", { locale: ptBR }) :
                        period === "last-3-months" ? "Ultimos_3_Meses" : "Ultimos_6_Meses";
    const title = `Tempo_Resolucao_${sanitizeForFilename(periodLabel)}`;
    
    const originalTitle = document.title;
    document.title = title;
    
    const handleAfterPrint = () => {
      document.title = originalTitle;
      window.removeEventListener("afterprint", handleAfterPrint);
    };
    window.addEventListener("afterprint", handleAfterPrint);
    
    window.print();
  };

  // Prepare chart data for analysts
  const analystChartData = (data?.by_analyst || []).slice(0, 10).map((analyst) => ({
    name: analyst.analyst_name.split(" ")[0],
    tempo: Math.round(analyst.avg_resolution_minutes / 60),
    tickets: analyst.total_resolved,
  }));

  // Prepare chart data for categories
  const categoryChartData = (data?.by_category || []).slice(0, 8).map((cat) => ({
    name: cat.category.length > 15 ? cat.category.substring(0, 15) + "..." : cat.category,
    tempo: Math.round(cat.avg_resolution_minutes / 60),
    tickets: cat.total_resolved,
  }));

  // Prepare chart data for priorities
  const priorityChartData = (data?.by_priority || []).map((pri) => ({
    name: pri.priority,
    tempo: Math.round(pri.avg_resolution_minutes / 60),
    tickets: pri.total_resolved,
  }));

  const periodLabel = format(start, "MMM yyyy", { locale: ptBR }) + 
    (period !== "current-month" && period !== "last-month" ? ` - ${format(end, "MMM yyyy", { locale: ptBR })}` : "");

  return (
    <AppLayout>
      <div className="space-y-6 print:space-y-0">
        {/* Header - não impresso */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Tempo de Resolução</h1>
              <p className="text-muted-foreground">Análise detalhada de tempo médio de resolução</p>
            </div>
          </div>
          <Button onClick={exportToPDF} disabled={isLoading}>
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>

        {/* Filters - não impresso */}
        <Card className="print:hidden">
          <CardContent className="pt-6">
            <div className="flex gap-4 flex-wrap">
              <div className="w-48">
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current-month">Mês Atual</SelectItem>
                    <SelectItem value="last-month">Mês Anterior</SelectItem>
                    <SelectItem value="last-3-months">Últimos 3 Meses</SelectItem>
                    <SelectItem value="last-6-months">Últimos 6 Meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Select value={segment} onValueChange={setSegment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Segmento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Segmentos</SelectItem>
                    <SelectItem value="DB">Banco de Dados</SelectItem>
                    <SelectItem value="APP">Aplicação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Print Content */}
        <div className="print:block">
          {/* Cover Page */}
          <PrintPage pageBreakBefore={false}>
            <ReportCover
              title="Relatório de Tempo de Resolução"
              periodLabel={periodLabel}
              subtitle={segment === "all" ? "Todos os Segmentos" : segment === "DB" ? "Banco de Dados" : "Aplicação"}
            />
          </PrintPage>

          {/* Summary Cards Page */}
          <PrintPage>
            <h2 className="text-xl font-bold mb-6 print:text-lg">Resumo Geral</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Tempo Médio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {data?.overall.avg_resolution_minutes 
                      ? formatDuration(data.overall.avg_resolution_minutes) 
                      : "-"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    Mediana
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {data?.overall.median_resolution_minutes 
                      ? formatDuration(data.overall.median_resolution_minutes) 
                      : "-"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-green-500" />
                    Mais Rápido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">
                    {data?.overall.min_resolution_minutes 
                      ? formatDuration(data.overall.min_resolution_minutes) 
                      : "-"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-red-500" />
                    Mais Demorado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600">
                    {data?.overall.max_resolution_minutes 
                      ? formatDuration(data.overall.max_resolution_minutes) 
                      : "-"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total de Tickets Resolvidos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">{data?.overall.total_resolved || 0}</p>
              </CardContent>
            </Card>

            <ReportFooter />
          </PrintPage>

          {/* Charts Page - By Analyst */}
          <PrintPage>
            <h2 className="text-xl font-bold mb-6 print:text-lg">Tempo Médio por Analista</h2>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analystChartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" unit="h" />
                  <YAxis type="category" dataKey="name" width={80} />
                  <Tooltip 
                    formatter={(value: number) => [`${value}h`, "Tempo Médio"]}
                    labelFormatter={(label) => `Analista: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="tempo" name="Tempo Médio (horas)" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                    {analystChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ReportFooter />
          </PrintPage>

          {/* Charts Page - By Category */}
          <PrintPage>
            <h2 className="text-xl font-bold mb-6 print:text-lg">Tempo Médio por Categoria</h2>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} margin={{ bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    interval={0}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis unit="h" />
                  <Tooltip 
                    formatter={(value: number) => [`${value}h`, "Tempo Médio"]}
                  />
                  <Legend />
                  <Bar dataKey="tempo" name="Tempo Médio (horas)" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ReportFooter />
          </PrintPage>

          {/* Charts Page - By Priority */}
          <PrintPage>
            <h2 className="text-xl font-bold mb-6 print:text-lg">Tempo Médio por Prioridade</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis unit="h" />
                  <Tooltip 
                    formatter={(value: number) => [`${value}h`, "Tempo Médio"]}
                  />
                  <Legend />
                  <Bar dataKey="tempo" name="Tempo Médio (horas)" radius={[4, 4, 0, 0]}>
                    <Cell fill="#ef4444" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#3b82f6" />
                    <Cell fill="#22c55e" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ReportFooter />
          </PrintPage>

          {/* Table Page - Ranking */}
          <PrintPage>
            <h2 className="text-xl font-bold mb-6 print:text-lg">Ranking de Analistas por Tempo de Resolução</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Analista</TableHead>
                  <TableHead className="text-right">Tickets</TableHead>
                  <TableHead className="text-right">Tempo Médio</TableHead>
                  <TableHead className="text-right">Mais Rápido</TableHead>
                  <TableHead className="text-right">Mais Lento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.by_analyst || []).map((analyst, index) => (
                  <TableRow key={analyst.analyst_id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{analyst.analyst_name}</TableCell>
                    <TableCell className="text-right">{analyst.total_resolved}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatDuration(analyst.avg_resolution_minutes)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatDuration(analyst.min_resolution_minutes)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatDuration(analyst.max_resolution_minutes)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ReportFooter />
          </PrintPage>
        </div>
      </div>
    </AppLayout>
  );
}
