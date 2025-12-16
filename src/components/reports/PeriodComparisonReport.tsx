import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Minus, FileText } from "lucide-react";
import { usePeriodComparisonData } from "@/hooks/usePeriodComparisonData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import ReportCover from "./ReportCover";

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
    if (value > 0) return <ArrowUpRight className="h-5 w-5 text-green-500" />;
    if (value < 0) return <ArrowDownRight className="h-5 w-5 text-red-500" />;
    return <Minus className="h-5 w-5 text-muted-foreground" />;
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
    { metric: "Total", [periodALabel]: data.periodA.total_tickets, [periodBLabel]: data.periodB.total_tickets },
    { metric: "Resolvidos", [periodALabel]: data.periodA.resolved_tickets, [periodBLabel]: data.periodB.resolved_tickets },
    { metric: "Pendentes", [periodALabel]: data.periodA.pending_tickets, [periodBLabel]: data.periodB.pending_tickets },
    { metric: "SLA Cumprido", [periodALabel]: data.periodA.sla_met_count, [periodBLabel]: data.periodB.sla_met_count },
  ] : [];

  const priorityData = data ? [
    { priority: "P1", [periodALabel]: data.periodA.tickets_by_priority.P1, [periodBLabel]: data.periodB.tickets_by_priority.P1 },
    { priority: "P2", [periodALabel]: data.periodA.tickets_by_priority.P2, [periodBLabel]: data.periodB.tickets_by_priority.P2 },
    { priority: "P3", [periodALabel]: data.periodA.tickets_by_priority.P3, [periodBLabel]: data.periodB.tickets_by_priority.P3 },
    { priority: "P4", [periodALabel]: data.periodA.tickets_by_priority.P4, [periodBLabel]: data.periodB.tickets_by_priority.P4 },
  ] : [];

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
    const periodAClean = sanitizeForFilename(periodALabel);
    const periodBClean = sanitizeForFilename(periodBLabel);
    document.title = `Comparativo_${periodAClean}_vs_${periodBClean}`;
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
              <h1 className="text-2xl font-bold">Comparativo de Períodos</h1>
              <p className="text-muted-foreground">Compare métricas entre dois períodos</p>
            </div>
          </div>
          <Button onClick={exportToPDF}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>

        {/* Period Selectors - Hide on print */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
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

        {/* Report Content - Print Wrapper */}
        <div className="print:block print:overflow-visible">
          {/* PAGE 1: Cover */}
          <ReportCover 
            title="Comparativo de Períodos"
            subtitle={`${periodALabel} vs ${periodBLabel}`}
            periodLabel={`Análise comparativa de performance`}
          />

        {/* PAGE 2: Variation Cards */}
        {data && (
          <div className="print-section print-break-before space-y-6">
            <h2 className="text-2xl font-bold text-center mb-8">Análise de Variações</h2>
            
            <div className="text-center mb-8">
              <p className="text-lg text-muted-foreground">
                Comparando <span className="font-semibold text-primary">{periodALabel}</span> com <span className="font-semibold">{periodBLabel}</span>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="print-break-avoid">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Variação de Volume</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center gap-3 py-6">
                  {getVariationIcon(data.variations.total * -1)}
                  <span className={`text-4xl font-bold ${getVariationColor(data.variations.total, true)}`}>
                    {data.variations.total > 0 ? "+" : ""}{data.variations.total}%
                  </span>
                </CardContent>
              </Card>

              <Card className="print-break-avoid">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Variação de Resoluções</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center gap-3 py-6">
                  {getVariationIcon(data.variations.resolved)}
                  <span className={`text-4xl font-bold ${getVariationColor(data.variations.resolved)}`}>
                    {data.variations.resolved > 0 ? "+" : ""}{data.variations.resolved}%
                  </span>
                </CardContent>
              </Card>

              <Card className="print-break-avoid">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Variação de SLA</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center gap-3 py-6">
                  {getVariationIcon(data.variations.sla)}
                  <span className={`text-4xl font-bold ${getVariationColor(data.variations.sla)}`}>
                    {data.variations.sla > 0 ? "+" : ""}{data.variations.sla}pp
                  </span>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* PAGE 3: Comparison Charts */}
        <div className="print-section print-break-before space-y-6">
          <h2 className="text-2xl font-bold text-center mb-8">Análise Comparativa</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="print-break-avoid">
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
                    <Bar dataKey={periodALabel} fill="hsl(215, 65%, 45%)" />
                    <Bar dataKey={periodBLabel} fill="hsl(215, 15%, 65%)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="print-break-avoid">
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
                    <Bar dataKey={periodALabel} fill="hsl(215, 65%, 45%)" />
                    <Bar dataKey={periodBLabel} fill="hsl(215, 15%, 65%)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* PAGE 4: Detailed Table */}
        {data && (
          <div className="print-section print-break-before">
            <h2 className="text-2xl font-bold text-center mb-8">Detalhamento Comparativo</h2>
            
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Métrica</TableHead>
                      <TableHead className="text-center bg-primary/5">{periodALabel}</TableHead>
                      <TableHead className="text-center">{periodBLabel}</TableHead>
                      <TableHead className="text-center">Variação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="print-break-avoid">
                      <TableCell className="font-medium">Total de Tickets</TableCell>
                      <TableCell className="text-center bg-primary/5 font-bold">{data.periodA.total_tickets}</TableCell>
                      <TableCell className="text-center">{data.periodB.total_tickets}</TableCell>
                      <TableCell className={`text-center font-semibold ${getVariationColor(data.variations.total, true)}`}>
                        {data.variations.total > 0 ? "+" : ""}{data.variations.total}%
                      </TableCell>
                    </TableRow>
                    <TableRow className="print-break-avoid">
                      <TableCell className="font-medium">Tickets Resolvidos</TableCell>
                      <TableCell className="text-center bg-primary/5 font-bold text-green-600">{data.periodA.resolved_tickets}</TableCell>
                      <TableCell className="text-center">{data.periodB.resolved_tickets}</TableCell>
                      <TableCell className={`text-center font-semibold ${getVariationColor(data.variations.resolved)}`}>
                        {data.variations.resolved > 0 ? "+" : ""}{data.variations.resolved}%
                      </TableCell>
                    </TableRow>
                    <TableRow className="print-break-avoid">
                      <TableCell className="font-medium">Tickets Pendentes</TableCell>
                      <TableCell className="text-center bg-primary/5 font-bold text-yellow-600">{data.periodA.pending_tickets}</TableCell>
                      <TableCell className="text-center">{data.periodB.pending_tickets}</TableCell>
                      <TableCell className="text-center text-muted-foreground">-</TableCell>
                    </TableRow>
                    <TableRow className="print-break-avoid">
                      <TableCell className="font-medium">Taxa de SLA</TableCell>
                      <TableCell className="text-center bg-primary/5 font-bold">{data.periodA.sla_met_rate}%</TableCell>
                      <TableCell className="text-center">{data.periodB.sla_met_rate}%</TableCell>
                      <TableCell className={`text-center font-semibold ${getVariationColor(data.variations.sla)}`}>
                        {data.variations.sla > 0 ? "+" : ""}{data.variations.sla}pp
                      </TableCell>
                    </TableRow>
                    <TableRow className="print-break-avoid">
                      <TableCell className="font-medium">Tickets DB</TableCell>
                      <TableCell className="text-center bg-primary/5 font-bold">{data.periodA.tickets_by_segment.DB}</TableCell>
                      <TableCell className="text-center">{data.periodB.tickets_by_segment.DB}</TableCell>
                      <TableCell className="text-center text-muted-foreground">-</TableCell>
                    </TableRow>
                    <TableRow className="print-break-avoid">
                      <TableCell className="font-medium">Tickets APP</TableCell>
                      <TableCell className="text-center bg-primary/5 font-bold">{data.periodA.tickets_by_segment.APP}</TableCell>
                      <TableCell className="text-center">{data.periodB.tickets_by_segment.APP}</TableCell>
                      <TableCell className="text-center text-muted-foreground">-</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
        </div>
      </div>
    </AppLayout>
  );
};

export default PeriodComparisonReport;
