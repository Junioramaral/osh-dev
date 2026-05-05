import { useState } from "react";
import { ArrowLeft, Printer, Clock, Users, FileText, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClientHoursData, PeriodFilter } from "@/hooks/useClientHoursData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSegments } from "@/hooks/useSegments";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ReportFooter from "./ReportFooter";
import PrintPage from "./PrintPage";
import AppLayout from "@/components/layout/AppLayout";

interface ClientHoursReportProps {
  onBack: () => void;
}

const PERIOD_OPTIONS = [
  { value: "current", label: "Mês Atual" },
  { value: "previous", label: "Mês Anterior" },
  { value: "last3", label: "Últimos 3 meses" },
  { value: "last6", label: "Últimos 6 meses" },
];

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
];

function formatHours(hours: number): string {
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round((hours % 24) * 10) / 10;
    return `${days}d ${remainingHours}h`;
  }
  return `${hours}h`;
}

const ClientHoursReport = ({ onBack }: ClientHoursReportProps) => {
  const [period, setPeriod] = useState<PeriodFilter>("current");
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedSegment, setSelectedSegment] = useState<string>("all");

  const { data: segments } = useActiveSegments();

  // Fetch clients for filter
  const { data: clients } = useQuery({
    queryKey: ["clients-for-filter"],
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

  const { data, isLoading } = useClientHoursData(
    period,
    selectedClient !== "all" ? selectedClient : undefined,
    selectedSegment !== "all" ? (selectedSegment as "DB" | "APP") : null
  );

  const handlePrint = () => {
    window.print();
  };

  const periodLabel =
    PERIOD_OPTIONS.find((p) => p.value === period)?.label || "Período";

  const chartConfig = {
    hours: { label: "Horas", color: "hsl(var(--primary))" },
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
            <h1 className="text-2xl font-bold text-foreground">
              Horas por Cliente
            </h1>
            <p className="text-muted-foreground">
              Distribuição de horas trabalhadas por cliente, analista, fila, time e tipo
            </p>
          </div>
        </div>
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-bold">Relatório de Horas por Cliente</h1>
        <p className="text-muted-foreground">{periodLabel}</p>
      </div>

      {/* Filters - Hide on print */}
      <div className="flex flex-wrap gap-4 print:hidden">
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedClient} onValueChange={setSelectedClient}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Clientes</SelectItem>
            {clients?.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedSegment} onValueChange={setSelectedSegment}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Segmento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {segments?.map((seg) => (
              <SelectItem key={seg.code} value={seg.code}>
                {seg.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : !data || data.overall.total_entries === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum registro de horas encontrado para o período selecionado.
          </CardContent>
        </Card>
      ) : (
        <>
          <PrintPage pageBreakAfter={false} fullHeight={false}>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4 print:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total de Horas</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatHours(data.overall.total_hours)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Média por Ticket</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatHours(data.overall.avg_hours_per_entry)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total de Tickets</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data.overall.total_entries}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Analistas Ativos</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data.overall.unique_analysts}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Hours by Analyst - Horizontal Bar Chart */}
            {data.byAnalyst.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-base">Horas por Analista</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.byAnalyst.slice(0, 10)}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tickFormatter={(v) => `${v}h`} />
                        <YAxis
                          type="category"
                          dataKey="analyst_name"
                          width={75}
                          tick={{ fontSize: 12 }}
                        />
                        <ChartTooltip
                          content={<ChartTooltipContent />}
                          formatter={(value: number) => [`${value}h`, "Horas"]}
                        />
                        <Bar
                          dataKey="hours"
                          fill="hsl(var(--primary))"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}
          </PrintPage>

          <PrintPage pageBreakAfter={false} fullHeight={false}>
            {/* Two column layout for Queue and Team charts */}
            <div className="grid gap-6 md:grid-cols-2 print:grid-cols-2">
              {/* Hours by Queue - Pie Chart */}
              {data.byQueue.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Distribuição por Fila</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.byQueue}
                            dataKey="hours"
                            nameKey="queue_name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ queue_name, percent }) =>
                              `${queue_name}: ${(percent * 100).toFixed(0)}%`
                            }
                            labelLine={false}
                          >
                            {data.byQueue.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => [`${value}h`, "Horas"]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}

              {/* Hours by Team - Vertical Bar Chart */}
              {data.byTeam.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Horas por Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={data.byTeam.slice(0, 8)}
                          margin={{ top: 5, right: 20, left: 10, bottom: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis
                            dataKey="team_name"
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis tickFormatter={(v) => `${v}h`} />
                          <ChartTooltip
                            content={<ChartTooltipContent />}
                            formatter={(value: number) => [`${value}h`, "Horas"]}
                          />
                          <Bar
                            dataKey="hours"
                            fill="hsl(var(--chart-2))"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Hours by Ticket Type - Vertical Bar Chart */}
            {data.byType.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-base">Horas por Tipo de Ticket</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.byType}
                        margin={{ top: 5, right: 20, left: 10, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="type_label"
                          angle={-45}
                          textAnchor="end"
                          height={60}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis tickFormatter={(v) => `${v}h`} />
                        <ChartTooltip
                          content={<ChartTooltipContent />}
                          formatter={(value: number) => [`${value}h`, "Horas"]}
                        />
                        <Bar
                          dataKey="hours"
                          fill="hsl(var(--chart-3))"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}
          </PrintPage>

          {/* Client Summary Table */}
          {selectedClient === "all" && data.byClient.length > 0 && (
            <PrintPage pageBreakBefore pageBreakAfter={false} fullHeight={false}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Resumo por Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Total Horas</TableHead>
                        <TableHead className="text-right">Tickets</TableHead>
                        <TableHead className="text-right">Média/Ticket</TableHead>
                        <TableHead>Principal Analista</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.byClient.map((client) => (
                        <TableRow key={client.client_id}>
                          <TableCell className="font-medium">
                            {client.client_name}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatHours(client.total_hours)}
                          </TableCell>
                          <TableCell className="text-right">
                            {client.total_entries}
                          </TableCell>
                          <TableCell className="text-right">
                            {client.avg_hours_per_entry}h
                          </TableCell>
                          <TableCell>{client.top_analyst || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </PrintPage>
          )}
        </>
      )}

      <ReportFooter />
    </div>
    </AppLayout>
  );
};

export default ClientHoursReport;
