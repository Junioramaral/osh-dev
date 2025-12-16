import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Trophy, Target, Clock } from "lucide-react";
import { useAnalystPerformanceData } from "@/hooks/useAnalystPerformanceData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

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

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Performance de Analistas</h1>
              <p className="text-muted-foreground">Métricas de produtividade por analista</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Analistas Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{analysts?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Total de Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalTickets}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" />
                Resolvidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{totalResolved}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                SLA Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{avgSlaRate}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
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
                  <Bar dataKey="tickets" fill="hsl(var(--primary))" name="Total" />
                  <Bar dataKey="resolved" fill="hsl(var(--chart-2))" name="Resolvidos" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
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
                    label
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

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ranking de Analistas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
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
                  <TableRow key={analyst.analyst_id}>
                    <TableCell>
                      {index < 3 ? (
                        <Badge variant={index === 0 ? "default" : "secondary"}>
                          {index + 1}º
                        </Badge>
                      ) : (
                        index + 1
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{analyst.analyst_name}</TableCell>
                    <TableCell className="text-center">{analyst.total_tickets}</TableCell>
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
    </AppLayout>
  );
};

export default AnalystPerformanceReport;
