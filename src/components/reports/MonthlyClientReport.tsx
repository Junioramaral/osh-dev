import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Download, FileText, Ticket, CheckCircle, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend, LineChart, Line } from "recharts";
import ReportCover from "./ReportCover";
import { useReportData } from "@/hooks/useReportData";

interface MonthlyClientReportProps {
  onBack: () => void;
}

const MonthlyClientReport = ({ onBack }: MonthlyClientReportProps) => {
  const currentDate = new Date();
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-for-report"],
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

  // Fetch report data
  const { data: reportData, isLoading } = useReportData(
    selectedClient || null,
    selectedMonth,
    selectedYear
  );

  // Generate month options
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      value: i + 1,
      label: format(new Date(2024, i, 1), "MMMM", { locale: ptBR }),
    }));
  }, []);

  // Generate year options (last 3 years)
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear - 2];
  }, []);

  const exportToPDF = () => {
    window.print();
  };

  const exportToCSV = () => {
    if (!reportData?.tickets.length) return;

    const headers = ["Número", "Título", "Segmento", "Prioridade", "Status", "Categoria", "Data Abertura", "Data Resolução", "SLA"];
    const rows = reportData.tickets.map((ticket) => [
      ticket.ticket_number,
      ticket.title,
      ticket.segment,
      ticket.priority,
      ticket.status,
      ticket.category,
      ticket.created_at ? format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm") : "",
      ticket.resolved_at ? format(new Date(ticket.resolved_at), "dd/MM/yyyy HH:mm") : "",
      ticket.sla_resolution_met === true ? "Cumprido" : ticket.sla_resolution_met === false ? "Não Cumprido" : "Em Andamento",
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio_${reportData.client?.name || "cliente"}_${selectedMonth}_${selectedYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "novo": return "default";
      case "em_atendimento": return "secondary";
      case "aguardando_cliente": return "outline";
      case "resolvido": return "default";
      case "fechado": return "secondary";
      default: return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      novo: "Novo",
      em_atendimento: "Em Atendimento",
      aguardando_cliente: "Aguardando Cliente",
      resolvido: "Resolvido",
      fechado: "Fechado",
    };
    return labels[status] || status;
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case "P1": return "destructive";
      case "P2": return "default";
      case "P3": return "secondary";
      case "P4": return "outline";
      default: return "outline";
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 print:space-y-4">
        {/* Header - Hide on print */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Relatório Mensal de Cliente</h1>
              <p className="text-muted-foreground">Selecione o cliente e o período</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV} disabled={!reportData?.tickets.length}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button onClick={exportToPDF} disabled={!reportData?.tickets.length}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* Filters - Hide on print */}
        <Card className="print:hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cliente</label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Mês</label>
                <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m.value} value={m.value.toString()}>
                        <span className="capitalize">{m.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ano</label>
                <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* No client selected */}
        {!selectedClient && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Selecione um cliente para gerar o relatório</p>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {selectedClient && isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-[400px] w-full" />
            <div className="grid gap-4 md:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          </div>
        )}

        {/* Report Content */}
        {selectedClient && reportData && !isLoading && (
          <>
            {/* Cover Page */}
            <ReportCover
              clientName={reportData.client?.name || "Cliente"}
              month={selectedMonth}
              year={selectedYear}
            />

            {/* Executive Summary */}
            <div className="print:page-break-before">
              <h2 className="text-xl font-semibold mb-4">Resumo Executivo</h2>
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Ticket className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{reportData.metrics.total}</p>
                        <p className="text-sm text-muted-foreground">Total de Tickets</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{reportData.metrics.resolved}</p>
                        <p className="text-sm text-muted-foreground">Resolvidos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-500/10 rounded-lg">
                        <Clock className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{reportData.metrics.avgResolutionHours}h</p>
                        <p className="text-sm text-muted-foreground">Tempo Médio</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{reportData.metrics.slaMetRate}%</p>
                        <p className="text-sm text-muted-foreground">SLA Cumprido</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
              {/* SLA Compliance Pie Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Cumprimento de SLA</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    {reportData.metrics.slaCompliance.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={reportData.metrics.slaCompliance}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {reportData.metrics.slaCompliance.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Sem dados
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Volume by Segment */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Volume por Segmento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    {reportData.metrics.bySegment.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportData.metrics.bySegment} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="name" width={100} fontSize={12} />
                          <Tooltip />
                          <Bar dataKey="value" name="Tickets" radius={[0, 4, 4, 0]}>
                            {reportData.metrics.bySegment.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Sem dados
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Volume by Priority */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Volume por Prioridade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    {reportData.metrics.byPriority.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportData.metrics.byPriority}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" fontSize={12} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" name="Tickets" radius={[4, 4, 0, 0]}>
                            {reportData.metrics.byPriority.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Sem dados
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Daily Volume Chart */}
            <Card className="print:page-break-before">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Evolução Diária de Tickets</CardTitle>
                <CardDescription>Volume de tickets abertos por dia no período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={reportData.metrics.dailyVolume}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={10} interval="preserveStartEnd" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="tickets"
                        name="Tickets"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Categories */}
            {reportData.metrics.topCategories.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Top 5 Categorias</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {reportData.metrics.topCategories.map((cat, index) => (
                      <div key={cat.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground w-6">{index + 1}.</span>
                          <span className="text-sm">{cat.name}</span>
                        </div>
                        <Badge variant="secondary">{cat.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tickets List */}
            <Card className="print:page-break-before">
              <CardHeader>
                <CardTitle className="text-base">Listagem de Tickets</CardTitle>
                <CardDescription>{reportData.tickets.length} tickets no período</CardDescription>
              </CardHeader>
              <CardContent>
                {reportData.tickets.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Segmento</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Abertura</TableHead>
                        <TableHead>SLA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.tickets.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell className="font-mono text-xs">{ticket.ticket_number}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{ticket.title}</TableCell>
                          <TableCell>
                            <Badge variant={ticket.segment === "DB" ? "default" : "secondary"}>
                              {ticket.segment}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(ticket.status)}>
                              {getStatusLabel(ticket.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {ticket.created_at && format(new Date(ticket.created_at), "dd/MM/yy HH:mm")}
                          </TableCell>
                          <TableCell>
                            {ticket.sla_resolution_met === true && (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                OK
                              </Badge>
                            )}
                            {ticket.sla_resolution_met === false && (
                              <Badge variant="outline" className="text-red-600 border-red-600">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Não
                              </Badge>
                            )}
                            {ticket.sla_resolution_met === null && (
                              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                <Clock className="h-3 w-3 mr-1" />
                                —
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum ticket encontrado no período selecionado
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:page-break-before { page-break-before: always; }
          .print\\:page-break-after { page-break-after: always; }
          .print\\:space-y-4 > :not([hidden]) ~ :not([hidden]) { margin-top: 1rem; }
          .print\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
      `}</style>
    </AppLayout>
  );
};

export default MonthlyClientReport;
