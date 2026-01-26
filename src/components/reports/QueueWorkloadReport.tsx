import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ListOrdered, Layers, Clock, CheckCircle2, FileText, AlertTriangle } from "lucide-react";
import { useQueueWorkloadData } from "@/hooks/useQueueWorkloadData";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ReportCover from "./ReportCover";

interface QueueWorkloadReportProps {
  onBack: () => void;
}

const COLORS = ["#3b82f6", "#22c55e", "#eab308", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#f43f5e"];

const formatDuration = (minutes: number): string => {
  if (minutes === 0) return "-";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
};

const QueueWorkloadReport = ({ onBack }: QueueWorkloadReportProps) => {
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

  const { data, isLoading } = useQueueWorkloadData({
    startDate,
    endDate,
    segment: segment !== "all" ? segment : undefined,
  });

  // Prepare pie chart data (only queues with tickets)
  const pieData = data?.queues
    .filter(q => q.total_tickets > 0)
    .slice(0, 8)
    .map(q => ({
      name: q.queue_name.length > 15 ? q.queue_name.substring(0, 15) + "..." : q.queue_name,
      value: q.total_tickets,
    })) || [];

  // Add unassigned to pie if exists
  if (data?.unassigned && data.unassigned.total_tickets > 0) {
    pieData.push({
      name: "Sem Fila",
      value: data.unassigned.total_tickets,
    });
  }

  // Prepare bar chart data
  const barData = data?.queues
    .filter(q => q.total_tickets > 0)
    .slice(0, 10)
    .map(q => ({
      name: q.queue_name.length > 12 ? q.queue_name.substring(0, 12) + "..." : q.queue_name,
      abertos: q.open_tickets,
      resolvidos: q.resolved_tickets,
      pendentes: q.pending_tickets,
    })) || [];

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
    document.title = `Relatorio_Filas_${periodClean}`;
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
              <h1 className="text-2xl font-bold">Distribuição por Filas</h1>
              <p className="text-muted-foreground">Análise de carga de trabalho por fila de atendimento</p>
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
            title="Distribuição por Filas"
            subtitle="Análise de Carga de Trabalho"
            periodLabel={periodLabel}
          />

          {/* PAGE 2: Summary + Pie Chart */}
          <div className="print-section print-break-before space-y-6">
            <h2 className="text-2xl font-bold text-center mb-8">Visão Geral</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card className="print-break-avoid">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Total de Tickets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{data?.overall.total_tickets || 0}</p>
                </CardContent>
              </Card>
              <Card className="print-break-avoid">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <ListOrdered className="h-4 w-4" />
                    Filas com Tickets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{data?.overall.total_queues || 0}</p>
                </CardContent>
              </Card>
              <Card className="print-break-avoid">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Sem Fila
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-yellow-600">{data?.overall.unassigned_tickets || 0}</p>
                </CardContent>
              </Card>
              <Card className="print-break-avoid">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Taxa de SLA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-3xl font-bold ${
                    (data?.overall.sla_rate || 0) >= 90 
                      ? "text-green-600" 
                      : (data?.overall.sla_rate || 0) >= 70 
                        ? "text-yellow-600" 
                        : "text-red-600"
                  }`}>
                    {data?.overall.sla_rate || 0}%
                  </p>
                </CardContent>
              </Card>
            </div>

            {pieData.length > 0 && (
              <Card className="print-break-avoid">
                <CardHeader>
                  <CardTitle className="text-base">Distribuição por Fila</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* PAGE 3: Bar Chart */}
          {barData.length > 0 && (
            <div className="print-section print-break-before space-y-6">
              <h2 className="text-2xl font-bold text-center mb-8">Volume por Status</h2>
              
              <Card className="print-break-avoid">
                <CardHeader>
                  <CardTitle className="text-base">Tickets por Fila e Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={barData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="abertos" stackId="a" fill="hsl(215, 65%, 55%)" name="Em Aberto" />
                      <Bar dataKey="resolvidos" stackId="a" fill="hsl(142, 71%, 45%)" name="Resolvidos" />
                      <Bar dataKey="pendentes" stackId="a" fill="hsl(45, 93%, 47%)" name="Pendentes" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* PAGE 4+: Detailed Table */}
          <div className="print-section print-break-before">
            <h2 className="text-2xl font-bold text-center mb-8">Detalhamento por Fila</h2>
            
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fila</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Abertos</TableHead>
                      <TableHead className="text-center">Resolvidos</TableHead>
                      <TableHead className="text-center">Pendentes</TableHead>
                      <TableHead className="text-center">SLA</TableHead>
                      <TableHead className="text-center">TMR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.queues.filter(q => q.total_tickets > 0).map((queue, index) => (
                      <TableRow key={queue.queue_id || index} className="print-break-avoid">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <ListOrdered className="h-4 w-4 text-muted-foreground" />
                            {queue.queue_name}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-semibold">{queue.total_tickets}</TableCell>
                        <TableCell className="text-center text-blue-600">{queue.open_tickets}</TableCell>
                        <TableCell className="text-center text-green-600">{queue.resolved_tickets}</TableCell>
                        <TableCell className="text-center text-yellow-600">{queue.pending_tickets}</TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={queue.sla_met_rate >= 90 ? "default" : queue.sla_met_rate >= 70 ? "secondary" : "destructive"}
                          >
                            {queue.sla_met_rate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Clock className="h-3 w-3 inline mr-1 text-muted-foreground" />
                          {formatDuration(queue.avg_resolution_minutes)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!data?.queues || data.queues.filter(q => q.total_tickets > 0).length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhum ticket encontrado no período selecionado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* PAGE 5: Unassigned Tickets (if any) */}
          {data?.unassigned && data.unassigned.total_tickets > 0 && (
            <div className="print-section print-break-before">
              <h2 className="text-2xl font-bold text-center mb-8">Tickets Sem Fila Atribuída</h2>
              
              <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    Atenção: Tickets sem fila definida
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-4 bg-background rounded-lg">
                      <p className="text-2xl font-bold">{data.unassigned.total_tickets}</p>
                      <p className="text-sm text-muted-foreground">Total</p>
                    </div>
                    <div className="text-center p-4 bg-background rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{data.unassigned.open_tickets}</p>
                      <p className="text-sm text-muted-foreground">Em Aberto</p>
                    </div>
                    <div className="text-center p-4 bg-background rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{data.unassigned.resolved_tickets}</p>
                      <p className="text-sm text-muted-foreground">Resolvidos</p>
                    </div>
                    <div className="text-center p-4 bg-background rounded-lg">
                      <p className="text-2xl font-bold text-yellow-600">{data.unassigned.pending_tickets}</p>
                      <p className="text-sm text-muted-foreground">Pendentes</p>
                    </div>
                    <div className="text-center p-4 bg-background rounded-lg">
                      <p className="text-2xl font-bold">{data.unassigned.percentage}%</p>
                      <p className="text-sm text-muted-foreground">do Total</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    Estes tickets não foram atribuídos a nenhuma fila de atendimento. 
                    Considere revisar e atribuí-los às filas apropriadas para melhor controle de carga de trabalho.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Queues without tickets (informational) */}
          {data?.queues && data.queues.filter(q => q.total_tickets === 0).length > 0 && (
            <div className="print-section print-break-before">
              <h2 className="text-2xl font-bold text-center mb-8">Filas sem Tickets no Período</h2>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-wrap gap-2">
                    {data.queues.filter(q => q.total_tickets === 0).map((queue) => (
                      <Badge key={queue.queue_id} variant="outline" className="text-muted-foreground">
                        {queue.queue_name}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    Estas filas não receberam tickets no período selecionado.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default QueueWorkloadReport;
