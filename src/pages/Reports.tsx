import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileBarChart, Calendar, TrendingUp, PieChart, ListOrdered, Clock } from "lucide-react";
import MonthlyClientReport from "@/components/reports/MonthlyClientReport";

type ReportType = "monthly" | "sla" | "categories" | "performance" | "history" | null;

const reportTypes = [
  {
    id: "monthly" as const,
    title: "Relatório Mensal de Cliente",
    description: "Resumo executivo com SLA, métricas, gráficos e listagem completa de tickets",
    icon: FileBarChart,
    highlight: true,
  },
  {
    id: "sla" as const,
    title: "Relatório de SLA",
    description: "Análise detalhada de cumprimento de SLA por período e prioridade",
    icon: Clock,
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
    id: "performance" as const,
    title: "Performance de Analistas",
    description: "Métricas de produtividade e tempo de resolução por analista",
    icon: TrendingUp,
    highlight: false,
  },
  {
    id: "history" as const,
    title: "Histórico de Tickets",
    description: "Listagem detalhada de tickets com filtros avançados",
    icon: ListOrdered,
    highlight: false,
  },
];

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState<ReportType>(null);

  if (selectedReport === "monthly") {
    return <MonthlyClientReport onBack={() => setSelectedReport(null)} />;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">
            Selecione o tipo de relatório que deseja gerar
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              Agendamento de Relatórios
            </CardTitle>
            <CardDescription>
              Configure envio automático de relatórios mensais para clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Funcionalidade em desenvolvimento. Em breve você poderá agendar o envio automático de relatórios.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Reports;
