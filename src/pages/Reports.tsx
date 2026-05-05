import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileBarChart, TrendingUp, PieChart, GitCompare, History, Timer, Trophy, ListOrdered, Clock, ClipboardCheck, Star } from "lucide-react";
import MonthlyClientReport from "@/components/reports/MonthlyClientReport";
import AnalystPerformanceReport from "@/components/reports/AnalystPerformanceReport";
import CategoriesReport from "@/components/reports/CategoriesReport";
import PeriodComparisonReport from "@/components/reports/PeriodComparisonReport";
import ResolutionTimeReport from "@/components/reports/ResolutionTimeReport";
import ClosureRankingReport from "@/components/reports/ClosureRankingReport";
import QueueWorkloadReport from "@/components/reports/QueueWorkloadReport";
import ClientHoursReport from "@/components/reports/ClientHoursReport";
import AnalystHoursManagementReport from "@/components/reports/AnalystHoursManagementReport";
import CSATSatisfactionReport from "@/components/reports/CSATSatisfactionReport";
import ReportSendHistory from "@/components/reports/ReportSendHistory";
import { useReportSendHistory } from "@/hooks/useReportSendHistory";
import { useAuth } from "@/contexts/AuthContext";

const OTIMIZZO_TENANT_ID = "00000000-0000-0000-0000-000000000001";

type ReportType = "monthly" | "categories" | "performance" | "comparison" | "resolution-time" | "closure-ranking" | "queue-workload" | "client-hours" | "analyst-hours-management" | "csat-satisfaction" | null;

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
  {
    id: "closure-ranking" as const,
    title: "Ranking de Encerramento",
    description: "Ranking de analistas por volume e tempo de resolução de tickets",
    icon: Trophy,
    highlight: false,
  },
  {
    id: "csat-satisfaction" as const,
    title: "Satisfação dos Clientes (CSAT)",
    description: "Análise detalhada das avaliações: notas, comentários, NPS, detratores e correlação com SLA",
    icon: Star,
    highlight: false,
  },
  {
    id: "queue-workload" as const,
    title: "Distribuição por Filas",
    description: "Análise de carga de trabalho por fila de atendimento",
    icon: ListOrdered,
    highlight: false,
    internalOnly: true,
  },
  {
    id: "client-hours" as const,
    title: "Horas por Cliente",
    description: "Total de horas trabalhadas por cliente, analista, fila, time e tipo",
    icon: Clock,
    highlight: false,
    internalOnly: true,
  },
  {
    id: "analyst-hours-management" as const,
    title: "Gestão de Horas Analistas",
    description: "Compare horas de vida dos tickets com horas registradas pelos analistas",
    icon: ClipboardCheck,
    highlight: false,
    internalOnly: true,
  },
];

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState<ReportType>(null);
  const { data: sendHistory } = useReportSendHistory();
  const { isSuperAdmin, isOtimizzoUser, isViewer, profile, tenantId } = useAuth();

  // Check if user is a client (not internal)
  const isClient = profile?.client_id !== null && 
                   profile?.client_id !== OTIMIZZO_TENANT_ID &&
                   tenantId !== OTIMIZZO_TENANT_ID;

  // Filter reports based on user type
  const visibleReports = reportTypes.filter(report => {
    if ('internalOnly' in report && report.internalOnly) {
      return !isClient && (isSuperAdmin || isOtimizzoUser || isViewer);
    }
    return true;
  });

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

  if (selectedReport === "closure-ranking") {
    return <ClosureRankingReport onBack={() => setSelectedReport(null)} />;
  }

  if (selectedReport === "queue-workload") {
    return <QueueWorkloadReport onBack={() => setSelectedReport(null)} />;
  }

  if (selectedReport === "client-hours") {
    return <ClientHoursReport onBack={() => setSelectedReport(null)} />;
  }

  if (selectedReport === "analyst-hours-management") {
    return <AnalystHoursManagementReport onBack={() => setSelectedReport(null)} />;
  }

  if (selectedReport === "csat-satisfaction") {
    return <CSATSatisfactionReport onBack={() => setSelectedReport(null)} />;
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
              {visibleReports.map((report) => {
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
