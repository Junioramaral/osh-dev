import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { usePeriodComparisonData } from "@/hooks/usePeriodComparisonData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface PeriodComparisonReportProps {
  onBack: () => void;
}

const MONTHS = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const PeriodComparisonReport = ({ onBack }: PeriodComparisonReportProps) => {
  const [monthA, setMonthA] = useState(String(currentMonth));
  const [yearA, setYearA] = useState(String(currentYear));
  const [monthB, setMonthB] = useState(String(currentMonth > 1 ? currentMonth - 1 : 12));
  const [yearB, setYearB] = useState(String(currentMonth > 1 ? currentYear : currentYear - 1));

  const { data, isLoading } = usePeriodComparisonData({
    periodA: { month: parseInt(monthA), year: parseInt(yearA) },
    periodB: { month: parseInt(monthB), year: parseInt(yearB) },
  });

  const getVariationIcon = (value: number) => {
    if (value > 0) return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    if (value < 0) return <ArrowDownRight className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getVariationColor = (value: number, inverted = false) => {
    if (inverted) {
      if (value > 0) return "text-red-500";
      if (value < 0) return "text-green-500";
    } else {
      if (value > 0) return "text-green-500";
      if (value < 0) return "text-red-500";
    }
    return "text-muted-foreground";
  };

  const periodALabel = `${MONTHS.find(m => m.value === monthA)?.label} ${yearA}`;
  const periodBLabel = `${MONTHS.find(m => m.value === monthB)?.label} ${yearB}`;

  const comparisonData = data ? [
    {
      metric: "Total",
      [periodALabel]: data.periodA.total_tickets,
      [periodBLabel]: data.periodB.total_tickets,
    },
    {
      metric: "Resolvidos",
      [periodALabel]: data.periodA.resolved_tickets,
      [periodBLabel]: data.periodB.resolved_tickets,
    },
    {
      metric: "Pendentes",
      [periodALabel]: data.periodA.pending_tickets,
      [periodBLabel]: data.periodB.pending_tickets,
    },
    {
      metric: "SLA Cumprido",
      [periodALabel]: data.periodA.sla_met_count,
      [periodBLabel]: data.periodB.sla_met_count,
    },
  ] : [];

  const priorityData = data ? [
    { priority: "P1", [periodALabel]: data.periodA.tickets_by_priority.P1, [periodBLabel]: data.periodB.tickets_by_priority.P1 },
    { priority: "P2", [periodALabel]: data.periodA.tickets_by_priority.P2, [periodBLabel]: data.periodB.tickets_by_priority.P2 },
    { priority: "P3", [periodALabel]: data.periodA.tickets_by_priority.P3, [periodBLabel]: data.periodB.tickets_by_priority.P3 },
    { priority: "P4", [periodALabel]: data.periodA.tickets_by_priority.P4, [periodBLabel]: data.periodB.tickets_by_priority.P4 },
  ] : [];

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
              <h1 className="text-2xl font-bold">Comparativo de Períodos</h1>
              <p className="text-muted-foreground">Compare métricas entre dois períodos</p>
            </div>
          </div>
        </div>

        {/* Period Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Período A (Atual)</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Select value={monthA} onValueChange={setMonthA}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={yearA} onValueChange={setYearA}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Período B (Comparação)</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Select value={monthB} onValueChange={setMonthB}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={yearB} onValueChange={setYearB}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Variation Cards */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Variação de Volume</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                {getVariationIcon(data.variations.total)}
                <span className={`text-2xl font-bold ${getVariationColor(data.variations.total, true)}`}>
                  {data.variations.total > 0 ? "+" : ""}{data.variations.total}%
                </span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Variação de Resoluções</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                {getVariationIcon(data.variations.resolved)}
                <span className={`text-2xl font-bold ${getVariationColor(data.variations.resolved)}`}>
                  {data.variations.resolved > 0 ? "+" : ""}{data.variations.resolved}%
                </span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Variação de SLA</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                {getVariationIcon(data.variations.sla)}
                <span className={`text-2xl font-bold ${getVariationColor(data.variations.sla)}`}>
                  {data.variations.sla > 0 ? "+" : ""}{data.variations.sla}pp
                </span>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Comparison Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comparativo de Métricas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metric" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey={periodALabel} fill="hsl(var(--primary))" />
                  <Bar dataKey={periodBLabel} fill="hsl(var(--muted-foreground))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comparativo por Prioridade</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={priorityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="priority" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey={periodALabel} fill="hsl(var(--primary))" />
                  <Bar dataKey={periodBLabel} fill="hsl(var(--muted-foreground))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Comparison Table */}
        {data && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalhamento Comparativo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="font-medium text-muted-foreground">Métrica</div>
                <div className="font-medium">{periodALabel}</div>
                <div className="font-medium">{periodBLabel}</div>

                <div className="text-left">Total de Tickets</div>
                <div className="font-bold">{data.periodA.total_tickets}</div>
                <div>{data.periodB.total_tickets}</div>

                <div className="text-left">Resolvidos</div>
                <div className="font-bold text-green-600">{data.periodA.resolved_tickets}</div>
                <div>{data.periodB.resolved_tickets}</div>

                <div className="text-left">Pendentes</div>
                <div className="font-bold text-yellow-600">{data.periodA.pending_tickets}</div>
                <div>{data.periodB.pending_tickets}</div>

                <div className="text-left">Taxa de SLA</div>
                <div className="font-bold">{data.periodA.sla_met_rate}%</div>
                <div>{data.periodB.sla_met_rate}%</div>

                <div className="text-left">Tickets DB</div>
                <div className="font-bold">{data.periodA.tickets_by_segment.DB}</div>
                <div>{data.periodB.tickets_by_segment.DB}</div>

                <div className="text-left">Tickets APP</div>
                <div className="font-bold">{data.periodA.tickets_by_segment.APP}</div>
                <div>{data.periodB.tickets_by_segment.APP}</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default PeriodComparisonReport;
