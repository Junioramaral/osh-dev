import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileBarChart, TrendingUp, PieChart, GitCompare, Clock, History, Timer } from "lucide-react";
import MonthlyClientReport from "@/components/reports/MonthlyClientReport";
import AnalystPerformanceReport from "@/components/reports/AnalystPerformanceReport";
import CategoriesReport from "@/components/reports/CategoriesReport";
import PeriodComparisonReport from "@/components/reports/PeriodComparisonReport";
import ResolutionTimeReport from "@/components/reports/ResolutionTimeReport";
import ReportSendHistory from "@/components/reports/ReportSendHistory";
import { useReportSendHistory } from "@/hooks/useReportSendHistory";

type ReportType = "monthly" | "categories" | "performance" | "comparison" | "resolution-time" | null;

const reportTypes = [
  {
    id: "monthly" as const,
    title: "Relatório Mensal de Cliente",
    description: "Resumo executivo com SLA, métricas, gráficos e listagem completa de tickets",
    icon: FileBarChart,
    highlight: true,
  },
  {
    id: "performance" as const,
    title: "Performance de Analistas",
    description: "Métricas de produtividade e tempo de resolução por analista",
    icon: TrendingUp,
    highlight: false,
  },
  {
    id: "categories" as const,
    title: "Relatório por Categorias",
    description: "Distribuição de tickets por categorias e subcategorias",
    icon: PieChart,
    highlight: false,
  },
  {
    id: "comparison" as const,
    title: "Comparativo de Períodos",
    description: "Compare métricas entre dois períodos diferentes",
    icon: GitCompare,
    highlight: false,
  },
  {
    id: "resolution-time" as const,
    title: "Tempo de Resolução",
    description: "Análise detalhada de tempo médio de resolução por analista, categoria e prioridade",
    icon: Timer,
    highlight: false,
  },
];

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState<ReportType>(null);
  const { data: sendHistory } = useReportSendHistory();

  if (selectedReport === "monthly") {
    return <MonthlyClientReport onBack={() => setSelectedReport(null)} />;
  }

  if (selectedReport === "performance") {
    return <AnalystPerformanceReport onBack={() => setSelectedReport(null)} />;
  }

  if (selectedReport === "categories") {
    return <CategoriesReport onBack={() => setSelectedReport(null)} />;
  }

  if (selectedReport === "comparison") {
    return <PeriodComparisonReport onBack={() => setSelectedReport(null)} />;
  }

  if (selectedReport === "resolution-time") {
    return <ResolutionTimeReport onBack={() => setSelectedReport(null)} />;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">
            Gere relatórios e acompanhe o histórico de envios
          </p>
        </div>

        <Tabs defaultValue="types" className="space-y-4">
          <TabsList>
            <TabsTrigger value="types" className="flex items-center gap-2">
              <FileBarChart className="h-4 w-4" />
              Tipos de Relatório
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico de Envios
              {sendHistory && sendHistory.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {sendHistory.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="types">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
              {reportTypes.map((report) => {
                const Icon = report.icon;
                return (
                  <Card
                    key={report.id}
                    className={`cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 ${
                      report.highlight ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => setSelectedReport(report.id)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Icon className={`h-5 w-5 ${report.highlight ? "text-primary" : "text-muted-foreground"}`} />
                        {report.title}
                        {report.highlight && (
                          <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                            Recomendado
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription>{report.description}</CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <ReportSendHistory />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Reports;
