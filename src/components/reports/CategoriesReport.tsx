import { useState } from "react";
import { SegmentSelect } from "@/components/common/SegmentSelect";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FolderTree, Layers, FileText } from "lucide-react";
import { useCategoriesReportData } from "@/hooks/useCategoriesReportData";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ReportCover from "./ReportCover";
import ReportPeriodFilter from "./ReportPeriodFilter";
import { ReportPeriodState, defaultReportPeriodState, rangeFromSingle } from "@/lib/reportPeriod";

interface CategoriesReportProps {
  onBack: () => void;
}

const COLORS = ["#3b82f6", "#22c55e", "#eab308", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

const CategoriesReport = ({ onBack }: CategoriesReportProps) => {
  const [periodState, setPeriodState] = useState<ReportPeriodState>(defaultReportPeriodState());
  const [segment, setSegment] = useState("all");

  const range =
    periodState.mode === "single"
      ? rangeFromSingle(periodState.period)
      : rangeFromSingle({ preset: "current-month" });
  const startDate = range.start;
  const endDate = range.end;
  const periodLabel = range.label;

  const { data, isLoading } = useCategoriesReportData({
    startDate,
    endDate,
    segment: segment !== "all" ? segment : undefined,
  });

  const pieData = data?.categories.slice(0, 8).map(c => ({
    name: c.category.length > 15 ? c.category.substring(0, 15) + "..." : c.category,
    value: c.total_tickets,
  })) || [];

  const barData = data?.categories.slice(0, 10).map(c => ({
    name: c.category.length > 12 ? c.category.substring(0, 12) + "..." : c.category,
    total: c.total_tickets,
    resolved: c.resolved_tickets,
  })) || [];

  const totalTickets = data?.categories.reduce((sum, c) => sum + c.total_tickets, 0) || 0;

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
    document.title = `Relatorio_Categorias_${periodClean}`;
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
              <h1 className="text-2xl font-bold">Relatório por Categorias</h1>
              <p className="text-muted-foreground">Distribuição de tickets por categoria e subcategoria</p>
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
            title="Relatório por Categorias"
            subtitle="Análise de Distribuição de Tickets"
            periodLabel={periodLabel}
          />

        {/* PAGE 2: Summary + Pie Chart */}
        <div className="print-section print-break-before space-y-6">
          <h2 className="text-2xl font-bold text-center mb-8">Visão Geral</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="print-break-avoid">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FolderTree className="h-4 w-4" />
                  Total de Categorias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{data?.categories.length || 0}</p>
              </CardContent>
            </Card>
            <Card className="print-break-avoid">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Total de Tickets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalTickets}</p>
              </CardContent>
            </Card>
            <Card className="print-break-avoid">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Categoria Mais Comum
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold truncate">
                  {data?.categories[0]?.category || "-"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {data?.categories[0]?.total_tickets || 0} tickets
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="print-break-avoid">
            <CardHeader>
              <CardTitle className="text-base">Distribuição por Categoria</CardTitle>
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
        </div>

        {/* PAGE 3: Bar Chart */}
        <div className="print-section print-break-before space-y-6">
          <h2 className="text-2xl font-bold text-center mb-8">Top Categorias</h2>
          
          <Card className="print-break-avoid">
            <CardHeader>
              <CardTitle className="text-base">Top 10 Categorias por Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="hsl(215, 65%, 45%)" name="Total" />
                  <Bar dataKey="resolved" fill="hsl(142, 71%, 45%)" name="Resolvidos" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* PAGE 4+: Categories Table */}
        <div className="print-section print-break-before">
          <h2 className="text-2xl font-bold text-center mb-8">Detalhamento por Categoria</h2>
          
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Segmento</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Resolvidos</TableHead>
                    <TableHead className="text-center">SLA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.categories.map((cat, index) => (
                    <TableRow key={index} className="print-break-avoid">
                      <TableCell className="font-medium">{cat.category}</TableCell>
                      <TableCell>
                        <Badge variant={cat.segment === "DB" ? "default" : "secondary"}>
                          {cat.segment}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-semibold">{cat.total_tickets}</TableCell>
                      <TableCell className="text-center">{cat.resolved_tickets}</TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={cat.sla_met_rate >= 90 ? "default" : cat.sla_met_rate >= 70 ? "secondary" : "destructive"}
                        >
                          {cat.sla_met_rate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* PAGE 5+: Subcategories Table (if any) */}
        {data?.subcategories && data.subcategories.length > 0 && (
          <div className="print-section print-break-before">
            <h2 className="text-2xl font-bold text-center mb-8">Detalhamento por Subcategoria</h2>
            
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Subcategoria</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Resolvidos</TableHead>
                      <TableHead className="text-center">SLA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.subcategories.map((sub, index) => (
                      <TableRow key={index} className="print-break-avoid">
                        <TableCell className="text-muted-foreground">{sub.category}</TableCell>
                        <TableCell className="font-medium">{sub.subcategory}</TableCell>
                        <TableCell className="text-center">{sub.total_tickets}</TableCell>
                        <TableCell className="text-center">{sub.resolved_tickets}</TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={sub.sla_met_rate >= 90 ? "default" : sub.sla_met_rate >= 70 ? "secondary" : "destructive"}
                          >
                            {sub.sla_met_rate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
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

export default CategoriesReport;
