import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FolderTree, Layers } from "lucide-react";
import { useCategoriesReportData } from "@/hooks/useCategoriesReportData";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

interface CategoriesReportProps {
  onBack: () => void;
}

const COLORS = ["#3b82f6", "#22c55e", "#eab308", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

const CategoriesReport = ({ onBack }: CategoriesReportProps) => {
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
              <h1 className="text-2xl font-bold">Relatório por Categorias</h1>
              <p className="text-muted-foreground">Distribuição de tickets por categoria e subcategoria</p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FolderTree className="h-4 w-4" />
                Total de Categorias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data?.categories.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Total de Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalTickets}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Categoria Mais Comum
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold truncate">
                {data?.categories[0]?.category || "-"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top 10 Categorias</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="hsl(var(--primary))" name="Total" />
                  <Bar dataKey="resolved" fill="hsl(var(--chart-2))" name="Resolvidos" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Categories Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalhamento por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
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
                  <TableRow key={index}>
                    <TableCell className="font-medium">{cat.category}</TableCell>
                    <TableCell>
                      <Badge variant={cat.segment === "DB" ? "default" : "secondary"}>
                        {cat.segment}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{cat.total_tickets}</TableCell>
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

        {/* Subcategories Table */}
        {data?.subcategories && data.subcategories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalhamento por Subcategoria</CardTitle>
            </CardHeader>
            <CardContent>
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
                  {data.subcategories.slice(0, 20).map((sub, index) => (
                    <TableRow key={index}>
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
        )}
      </div>
    </AppLayout>
  );
};

export default CategoriesReport;
