import { useState } from "react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, FileDown, Trophy, Timer, Users, TrendingUp, TrendingDown, Minus, Star, ArrowLeftRight, UserMinus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useClosureRankingData } from "@/hooks/useClosureRankingData";
import { useClosureRankingEvolution } from "@/hooks/useClosureRankingEvolution";
import { useClosureRankingComparison } from "@/hooks/useClosureRankingComparison";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import ReportCover from "./ReportCover";
import PrintPage from "./PrintPage";
import ReportFooter from "./ReportFooter";
import AppLayout from "@/components/layout/AppLayout";
import ReportPeriodFilter from "./ReportPeriodFilter";
import { ReportPeriodState, defaultReportPeriodState, rangeFromSingle } from "@/lib/reportPeriod";

interface ClosureRankingReportProps {
  onBack: () => void;
}

const formatMinutesToHuman = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
};

const sanitizeForFilename = (text: string): string => {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "_");
};

const getMedalEmoji = (rank: number): string => {
  switch (rank) {
    case 1: return "🥇";
    case 2: return "🥈";
    case 3: return "🥉";
    default: return "";
  }
};

const getMedalColor = (rank: number): string => {
  switch (rank) {
    case 1: return "bg-yellow-500/20 text-yellow-700 border-yellow-500";
    case 2: return "bg-gray-300/30 text-gray-600 border-gray-400";
    case 3: return "bg-orange-400/20 text-orange-700 border-orange-400";
    default: return "bg-muted text-muted-foreground";
  }
};

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.85)",
  "hsl(var(--primary) / 0.7)",
  "hsl(var(--primary) / 0.55)",
  "hsl(var(--primary) / 0.4)",
];

const LINE_COLORS = [
  "hsl(221, 83%, 53%)",    // Blue
  "hsl(142, 71%, 45%)",    // Green
  "hsl(262, 83%, 58%)",    // Purple
  "hsl(25, 95%, 53%)",     // Orange
  "hsl(346, 77%, 50%)",    // Red/Pink
];

const TrendIcon = ({ trend }: { trend: "improving" | "declining" | "stable" }) => {
  switch (trend) {
    case "improving":
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case "declining":
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
};

const formatVariation = (value: number): string => {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(0)}%`;
};

const getVariationColor = (value: number, invertColors: boolean = false): string => {
  const isPositive = invertColors ? value < 0 : value > 0;
  const isNegative = invertColors ? value > 0 : value < 0;
  if (isPositive) return "text-green-600";
  if (isNegative) return "text-red-600";
  return "text-muted-foreground";
};

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

const ClosureRankingReport = ({ onBack }: ClosureRankingReportProps) => {
  const [viewMode, setViewMode] = useState<"ranking" | "comparison">("ranking");
  const [periodState, setPeriodState] = useState<ReportPeriodState>(defaultReportPeriodState());
  const [segment, setSegment] = useState("all");
  const [clientId, setClientId] = useState("all");
  
  // Comparison mode state
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const prevMonth = currentMonth > 1 ? currentMonth - 1 : 12;
  const prevMonthYear = currentMonth > 1 ? currentYear : currentYear - 1;
  
  const [periodAMonth, setPeriodAMonth] = useState(currentMonth.toString());
  const [periodAYear, setPeriodAYear] = useState(currentYear.toString());
  const [periodBMonth, setPeriodBMonth] = useState(prevMonth.toString());
  const [periodBYear, setPeriodBYear] = useState(prevMonthYear.toString());
  
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  const _range =
    periodState.mode === "single"
      ? rangeFromSingle(periodState.period)
      : rangeFromSingle({ preset: "current-month" });
  const dateRange = {
    start: format(_range.start, "yyyy-MM-dd"),
    end: format(_range.end, "yyyy-MM-dd"),
    label: _range.label,
  };

  const { data: clients } = useQuery({
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

  const { data, isLoading } = useClosureRankingData({
    startDate: dateRange.start,
    endDate: dateRange.end,
    segment: segment !== "all" ? segment : undefined,
    clientId: clientId !== "all" ? clientId : undefined,
  });

  // Evolution data - only for multi-month periods
  const showEvolution =
    periodState.mode === "single" &&
    (periodState.period.preset === "last-3-months" ||
      periodState.period.preset === "last-6-months");
  
  const { data: evolutionData } = useClosureRankingEvolution({
    startDate: dateRange.start,
    endDate: dateRange.end,
    segment: segment !== "all" ? segment : undefined,
    clientId: clientId !== "all" ? clientId : undefined,
    enabled: showEvolution && viewMode === "ranking",
  });
  
  // Comparison data
  const { data: comparisonData, isLoading: isComparisonLoading } = useClosureRankingComparison({
    periodAMonth: parseInt(periodAMonth),
    periodAYear: parseInt(periodAYear),
    periodBMonth: parseInt(periodBMonth),
    periodBYear: parseInt(periodBYear),
    segment: segment !== "all" ? segment : undefined,
    clientId: clientId !== "all" ? clientId : undefined,
    enabled: viewMode === "comparison",
  });

  const handlePrint = () => {
    const originalTitle = document.title;
    const periodLabel = viewMode === "comparison"
      ? `Comparativo_${sanitizeForFilename(comparisonData?.periodA.label || "")}_vs_${sanitizeForFilename(comparisonData?.periodB.label || "")}`
      : sanitizeForFilename(dateRange.label);
    document.title = `Ranking_Encerramento_${periodLabel}`;
    
    const handleAfterPrint = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', handleAfterPrint);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    
    window.print();
  };

  // Prepare comparison chart data
  const comparisonChartData = comparisonData?.analysts
    .filter(a => a.periodA || a.periodB)
    .slice(0, 10)
    .map(analyst => ({
      name: analyst.analyst_name.split(" ")[0],
      fullName: analyst.analyst_name,
      periodA: analyst.periodA?.total_resolved || 0,
      periodB: analyst.periodB?.total_resolved || 0,
    })) || [];

  // Prepare chart data
  const volumeChartData = (data?.rankings || [])
    .slice(0, 10)
    .map((analyst, index) => ({
      name: analyst.analyst_name.split(" ")[0],
      fullName: analyst.analyst_name,
      value: analyst.total_resolved,
      rank: index + 1,
    }));

  const speedChartData = (data?.rankings || [])
    .sort((a, b) => a.avg_resolution_minutes - b.avg_resolution_minutes)
    .slice(0, 10)
    .map((analyst, index) => ({
      name: analyst.analyst_name.split(" ")[0],
      fullName: analyst.analyst_name,
      value: analyst.avg_resolution_minutes,
      valueFormatted: formatMinutesToHuman(analyst.avg_resolution_minutes),
      rank: index + 1,
    }));

  const csatChartData = (data?.rankings || [])
    .filter(a => a.csat_total_ratings > 0)
    .sort((a, b) => b.csat_avg_rating - a.csat_avg_rating)
    .slice(0, 10)
    .map((analyst, index) => ({
      name: analyst.analyst_name.split(" ")[0],
      fullName: analyst.analyst_name,
      value: analyst.csat_avg_rating,
      valueFormatted: analyst.csat_avg_rating.toFixed(1),
      ratings: analyst.csat_total_ratings,
      rank: index + 1,
    }));

  // Prepare evolution chart data (top 5 analysts by volume)
  const evolutionVolumeChartData = evolutionData?.monthLabels.map((monthLabel, monthIndex) => {
    const month = evolutionData.months[monthIndex];
    const dataPoint: Record<string, any> = { month: monthLabel };
    
    evolutionData.analysts.slice(0, 5).forEach(analyst => {
      const monthData = analyst.monthly_data.find(m => m.month === month);
      dataPoint[analyst.analyst_id] = monthData?.total_resolved || 0;
    });
    
    return dataPoint;
  }) || [];

  const evolutionSpeedChartData = evolutionData?.monthLabels.map((monthLabel, monthIndex) => {
    const month = evolutionData.months[monthIndex];
    const dataPoint: Record<string, any> = { month: monthLabel };
    
    evolutionData.analysts.slice(0, 5).forEach(analyst => {
      const monthData = analyst.monthly_data.find(m => m.month === month);
      dataPoint[analyst.analyst_id] = monthData?.avg_resolution_minutes || 0;
    });
    
    return dataPoint;
  }) || [];

  const topAnalystsForChart = evolutionData?.analysts.slice(0, 5) || [];

  // Create trend map for ranking table
  const trendMap = new Map(evolutionData?.analysts.map(a => [a.analyst_id, a.trends]) || []);

  return (
    <AppLayout>
    <div className="print-container">
      {/* Screen Header */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Ranking de Encerramento</h1>
            <p className="text-muted-foreground">
              {viewMode === "ranking" 
                ? "Ranking de analistas por volume e tempo de resolução"
                : "Comparativo de períodos lado a lado"
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            <Button
              variant={viewMode === "ranking" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("ranking")}
            >
              <Trophy className="h-4 w-4 mr-1" />
              Ranking
            </Button>
            <Button
              variant={viewMode === "comparison" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("comparison")}
            >
              <ArrowLeftRight className="h-4 w-4 mr-1" />
              Comparativo
            </Button>
          </div>
          <Button 
            onClick={handlePrint} 
            disabled={viewMode === "ranking" ? (isLoading || !data) : (isComparisonLoading || !comparisonData)}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Filters for Ranking mode */}
      {viewMode === "ranking" && (
        <div className="flex gap-4 mb-6 print:hidden flex-wrap items-end">
          <ReportPeriodFilter value={periodState} onChange={setPeriodState} allowComparison={false} />

          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Segmento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="DB">Database</SelectItem>
              <SelectItem value="APP">Aplicação</SelectItem>
            </SelectContent>
          </Select>

          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients?.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Filters for Comparison mode */}
      {viewMode === "comparison" && (
        <div className="space-y-4 mb-6 print:hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  Período A (Atual)
                </CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Select value={periodAMonth} onValueChange={setPeriodAMonth}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={periodAYear} onValueChange={setPeriodAYear}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground/50" />
                  Período B (Comparação)
                </CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Select value={periodBMonth} onValueChange={setPeriodBMonth}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={periodBYear} onValueChange={setPeriodBYear}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
          
          <div className="flex gap-4">
            <Select value={segment} onValueChange={setSegment}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Segmento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="DB">Database</SelectItem>
                <SelectItem value="APP">Aplicação</SelectItem>
              </SelectContent>
            </Select>

            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* RANKING MODE */}
      {viewMode === "ranking" && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Carregando dados...</p>
            </div>
          ) : !data || data.rankings.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">
                  Nenhum ticket resolvido no período selecionado.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
          {/* Cover Page */}
          <PrintPage>
            <ReportCover
              title="Ranking de Encerramento"
              subtitle="Performance dos analistas por volume e velocidade"
              periodLabel={dateRange.label}
            />
          </PrintPage>

          {/* Highlight Cards */}
          <PrintPage>
            <div className="space-y-6">
              <h2 className="text-xl font-semibold print:text-lg">Destaques do Período</h2>
              
              {/* Champions */}
              <div className="grid gap-4 md:grid-cols-3">
                {data.top_volume && (
                  <Card className="border-primary/50 bg-primary/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-primary" />
                        Campeão de Volume
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">🥇</span>
                        <div>
                          <p className="text-xl font-bold">{data.top_volume.analyst_name}</p>
                          <p className="text-muted-foreground">
                            {data.top_volume.total_resolved} tickets resolvidos
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {data.top_speed && (
                  <Card className="border-accent/50 bg-accent/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Timer className="h-4 w-4 text-accent-foreground" />
                        Mais Rápido
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">⚡</span>
                        <div>
                          <p className="text-xl font-bold">{data.top_speed.analyst_name}</p>
                          <p className="text-muted-foreground">
                            Tempo médio: {formatMinutesToHuman(data.top_speed.avg_resolution_minutes)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {data.top_csat && data.top_csat.csat_total_ratings > 0 && (
                  <Card className="border-green-500/50 bg-green-500/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Star className="h-4 w-4 text-green-600" />
                        Melhor Avaliado
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">⭐</span>
                        <div>
                          <p className="text-xl font-bold">{data.top_csat.analyst_name}</p>
                          <p className="text-muted-foreground">
                            {data.top_csat.csat_avg_rating.toFixed(1)} estrelas ({data.top_csat.csat_total_ratings} aval.)
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Overall Stats */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      Total Resolvidos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{data.overall.total_resolved}</p>
                    <p className="text-sm text-muted-foreground">tickets no período</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      Tempo Médio Geral
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">
                      {formatMinutesToHuman(data.overall.avg_resolution_minutes)}
                    </p>
                    <p className="text-sm text-muted-foreground">para resolução</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      Analistas Ativos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{data.overall.total_analysts}</p>
                    <p className="text-sm text-muted-foreground">com tickets resolvidos</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Star className="h-4 w-4 text-muted-foreground" />
                      CSAT Médio
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">
                      {data.overall.avg_csat > 0 ? data.overall.avg_csat.toFixed(1) : "-"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {data.overall.total_csat_responses} avaliações
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
            <ReportFooter />
          </PrintPage>

          {/* Charts */}
          <PrintPage>
            <div className="space-y-6">
              <h2 className="text-xl font-semibold print:text-lg">Top 10 por Volume</h2>
              <Card>
                <CardContent className="pt-6">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={volumeChartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={80} />
                        <Tooltip
                          formatter={(value: number, name: string, props: any) => [
                            `${value} tickets`,
                            props.payload.fullName,
                          ]}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {volumeChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={CHART_COLORS[Math.min(index, CHART_COLORS.length - 1)]} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <h2 className="text-xl font-semibold print:text-lg">Top 10 por Velocidade</h2>
              <Card>
                <CardContent className="pt-6">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={speedChartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis 
                          type="number" 
                          tickFormatter={(value) => formatMinutesToHuman(value)}
                        />
                        <YAxis dataKey="name" type="category" width={80} />
                        <Tooltip
                          formatter={(value: number, name: string, props: any) => [
                            props.payload.valueFormatted,
                            props.payload.fullName,
                          ]}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {speedChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={CHART_COLORS[Math.min(index, CHART_COLORS.length - 1)]} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {csatChartData.length > 0 && (
                <>
                  <h2 className="text-xl font-semibold print:text-lg">Top 10 por Satisfação (CSAT)</h2>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={csatChartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis 
                              type="number" 
                              domain={[0, 5]}
                              tickFormatter={(value) => value.toFixed(1)}
                            />
                            <YAxis dataKey="name" type="category" width={80} />
                            <Tooltip
                              formatter={(value: number, name: string, props: any) => [
                                `${props.payload.valueFormatted} ⭐ (${props.payload.ratings} aval.)`,
                                props.payload.fullName,
                              ]}
                            />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="hsl(142, 71%, 45%)">
                              {csatChartData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={`hsl(142, 71%, ${45 - index * 3}%)`}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
            <ReportFooter />
          </PrintPage>

          {/* Evolution Section - Only for multi-month periods */}
          {showEvolution && evolutionData && evolutionData.months.length >= 2 && (
            <PrintPage>
              <div className="space-y-6">
                <h2 className="text-xl font-semibold print:text-lg">Evolução Mensal</h2>
                
                {/* Evolution Highlights */}
                <div className="grid gap-4 md:grid-cols-3">
                  {evolutionData.highlights.top_volume_growth && (
                    <Card className="border-green-500/50 bg-green-500/5">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          Maior Crescimento
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg font-bold">{evolutionData.highlights.top_volume_growth.analyst_name}</p>
                        <p className="text-sm text-muted-foreground">
                          +{Math.round(evolutionData.highlights.top_volume_growth.growth.volume_change * 100)}% em volume
                        </p>
                      </CardContent>
                    </Card>
                  )}
                  
                  {evolutionData.highlights.top_speed_improvement && (
                    <Card className="border-blue-500/50 bg-blue-500/5">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Timer className="h-4 w-4 text-blue-600" />
                          Mais Melhorou Velocidade
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg font-bold">{evolutionData.highlights.top_speed_improvement.analyst_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {Math.round(evolutionData.highlights.top_speed_improvement.growth.speed_change * 100)}% mais rápido
                        </p>
                      </CardContent>
                    </Card>
                  )}
                  
                  {evolutionData.highlights.top_csat_improvement && (
                    <Card className="border-yellow-500/50 bg-yellow-500/5">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-600" />
                          Mais Melhorou CSAT
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg font-bold">{evolutionData.highlights.top_csat_improvement.analyst_name}</p>
                        <p className="text-sm text-muted-foreground">
                          +{Math.round(evolutionData.highlights.top_csat_improvement.growth.csat_change * 100)}% em satisfação
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Volume Evolution Chart */}
                {topAnalystsForChart.length > 0 && evolutionVolumeChartData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Tickets Resolvidos por Mês (Top 5)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={evolutionVolumeChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            {topAnalystsForChart.map((analyst, index) => (
                              <Line
                                key={analyst.analyst_id}
                                type="monotone"
                                dataKey={analyst.analyst_id}
                                name={analyst.analyst_name.split(" ")[0]}
                                stroke={LINE_COLORS[index % LINE_COLORS.length]}
                                strokeWidth={2}
                                dot={{ r: 4 }}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Speed Evolution Chart */}
                {topAnalystsForChart.length > 0 && evolutionSpeedChartData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Tempo Médio de Resolução por Mês (Top 5)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={evolutionSpeedChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis tickFormatter={(value) => formatMinutesToHuman(value)} />
                            <Tooltip formatter={(value: number) => formatMinutesToHuman(value)} />
                            <Legend />
                            {topAnalystsForChart.map((analyst, index) => (
                              <Line
                                key={analyst.analyst_id}
                                type="monotone"
                                dataKey={analyst.analyst_id}
                                name={analyst.analyst_name.split(" ")[0]}
                                stroke={LINE_COLORS[index % LINE_COLORS.length]}
                                strokeWidth={2}
                                dot={{ r: 4 }}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              <ReportFooter />
            </PrintPage>
          )}

          {/* Full Ranking Table */}
          <PrintPage pageBreakAfter={false}>
            <div className="space-y-4">
              <h2 className="text-xl font-semibold print:text-lg">Ranking Completo</h2>
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>Analista</TableHead>
                        <TableHead className="text-center">Tickets</TableHead>
                        <TableHead className="text-center">Tempo Médio</TableHead>
                        <TableHead className="text-center">CSAT</TableHead>
                        <TableHead className="text-center">Aval.</TableHead>
                        <TableHead className="text-center">R. Vol</TableHead>
                        <TableHead className="text-center">R. Tmp</TableHead>
                        <TableHead className="text-center">R. CSAT</TableHead>
                        {showEvolution && <TableHead className="text-center">Tendência</TableHead>}
                        <TableHead className="text-center">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.rankings.map((analyst, index) => (
                        <TableRow key={analyst.analyst_id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1">
                              {index < 3 ? (
                                <span className="text-lg">{getMedalEmoji(index + 1)}</span>
                              ) : (
                                <span className="text-muted-foreground w-5 text-center text-sm">
                                  {index + 1}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{analyst.analyst_name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{analyst.total_resolved}</Badge>
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {formatMinutesToHuman(analyst.avg_resolution_minutes)}
                          </TableCell>
                          <TableCell className="text-center">
                            {analyst.csat_total_ratings > 0 ? (
                              <div className="flex items-center justify-center gap-1">
                                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                <span className="text-sm">{analyst.csat_avg_rating.toFixed(1)}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground text-sm">
                            {analyst.csat_total_ratings || "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={getMedalColor(analyst.volume_rank)} variant="outline">
                              {analyst.volume_rank}º
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={getMedalColor(analyst.speed_rank)} variant="outline">
                              {analyst.speed_rank}º
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {analyst.csat_rank > 0 ? (
                              <Badge className={getMedalColor(analyst.csat_rank)} variant="outline">
                                {analyst.csat_rank}º
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          {showEvolution && (
                            <TableCell className="text-center">
                              {trendMap.has(analyst.analyst_id) ? (
                                <div className="flex items-center justify-center gap-1">
                                  <TrendIcon trend={trendMap.get(analyst.analyst_id)!.volume} />
                                  <TrendIcon trend={trendMap.get(analyst.analyst_id)!.speed} />
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                          )}
                          <TableCell className="text-center">
                            <Badge variant="outline" className="font-bold">
                              {analyst.combined_score}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
            <ReportFooter />
          </PrintPage>
        </div>
          )}
        </>
      )}

      {/* COMPARISON MODE */}
      {viewMode === "comparison" && (
        <>
          {isComparisonLoading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Carregando dados comparativos...</p>
            </div>
          ) : !comparisonData || comparisonData.analysts.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">
                  Nenhum dado encontrado para os períodos selecionados.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Cover Page */}
              <PrintPage>
                <ReportCover
                  title="Comparativo de Ranking"
                  subtitle={`${comparisonData.periodA.label} vs ${comparisonData.periodB.label}`}
                  periodLabel="Análise comparativa"
                />
              </PrintPage>

              {/* Overall Variation Cards */}
              <PrintPage>
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold print:text-lg">Variação Entre Períodos</h2>
                  
                  <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Volume Total</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-2xl font-bold">{comparisonData.periodA.overall.total_resolved}</p>
                            <p className="text-xs text-muted-foreground">vs {comparisonData.periodB.overall.total_resolved}</p>
                          </div>
                          <div className={`text-lg font-semibold ${getVariationColor(comparisonData.overallVariation.volume)}`}>
                            {formatVariation(comparisonData.overallVariation.volume)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-2xl font-bold">{formatMinutesToHuman(comparisonData.periodA.overall.avg_resolution_minutes)}</p>
                            <p className="text-xs text-muted-foreground">vs {formatMinutesToHuman(comparisonData.periodB.overall.avg_resolution_minutes)}</p>
                          </div>
                          <div className={`text-lg font-semibold ${getVariationColor(comparisonData.overallVariation.speed, true)}`}>
                            {formatVariation(comparisonData.overallVariation.speed)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">CSAT Médio</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-2xl font-bold">{comparisonData.periodA.overall.avg_csat > 0 ? comparisonData.periodA.overall.avg_csat.toFixed(1) : "-"}</p>
                            <p className="text-xs text-muted-foreground">vs {comparisonData.periodB.overall.avg_csat > 0 ? comparisonData.periodB.overall.avg_csat.toFixed(1) : "-"}</p>
                          </div>
                          <div className={`text-lg font-semibold ${getVariationColor(comparisonData.overallVariation.csat)}`}>
                            {comparisonData.overallVariation.csat > 0 ? "+" : ""}{comparisonData.overallVariation.csat.toFixed(1)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Analistas Ativos</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-2xl font-bold">{comparisonData.periodA.overall.total_analysts}</p>
                            <p className="text-xs text-muted-foreground">vs {comparisonData.periodB.overall.total_analysts}</p>
                          </div>
                          <div className={`text-lg font-semibold ${getVariationColor(comparisonData.overallVariation.analysts)}`}>
                            {comparisonData.overallVariation.analysts > 0 ? "+" : ""}{comparisonData.overallVariation.analysts}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Highlights Cards */}
                  <div className="grid gap-4 md:grid-cols-3">
                    {comparisonData.highlights.most_improved && (
                      <Card className="border-green-500/50 bg-green-500/5">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            Maior Melhoria
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-lg font-bold">{comparisonData.highlights.most_improved.name}</p>
                          <p className="text-sm text-muted-foreground">
                            +{comparisonData.highlights.most_improved.change.toFixed(0)}% em volume
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {comparisonData.highlights.fastest_improvement && (
                      <Card className="border-blue-500/50 bg-blue-500/5">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Timer className="h-4 w-4 text-blue-600" />
                            Mais Rápido
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-lg font-bold">{comparisonData.highlights.fastest_improvement.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {comparisonData.highlights.fastest_improvement.change.toFixed(0)}% mais rápido
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {comparisonData.highlights.new_analysts.length > 0 && (
                      <Card className="border-purple-500/50 bg-purple-500/5">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <UserPlus className="h-4 w-4 text-purple-600" />
                            Novos Analistas
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-lg font-bold">{comparisonData.highlights.new_analysts.length}</p>
                          <p className="text-sm text-muted-foreground">
                            entraram em {comparisonData.periodA.label}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {!comparisonData.highlights.most_improved && !comparisonData.highlights.fastest_improvement && comparisonData.highlights.new_analysts.length === 0 && (
                      <Card className="md:col-span-3">
                        <CardContent className="flex items-center justify-center py-8">
                          <p className="text-muted-foreground">
                            Não há destaques significativos entre os períodos.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
                <ReportFooter />
              </PrintPage>

              {/* Comparison Chart */}
              <PrintPage>
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold print:text-lg">Comparativo de Volume por Analista</h2>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={comparisonChartData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={80} />
                            <Tooltip
                              formatter={(value: number, name: string) => [
                                `${value} tickets`,
                                name === "periodA" ? comparisonData.periodA.label : comparisonData.periodB.label,
                              ]}
                              labelFormatter={(label) => {
                                const analyst = comparisonChartData.find((a) => a.name === label);
                                return analyst?.fullName || label;
                              }}
                            />
                            <Legend
                              formatter={(value) =>
                                value === "periodA" ? comparisonData.periodA.label : comparisonData.periodB.label
                              }
                            />
                            <Bar dataKey="periodA" name="periodA" fill="hsl(var(--primary))" />
                            <Bar dataKey="periodB" name="periodB" fill="hsl(var(--muted-foreground) / 0.5)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <ReportFooter />
              </PrintPage>

              {/* Comparison Table */}
              <PrintPage>
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold print:text-lg">Tabela Comparativa Detalhada</h2>
                  <Card>
                    <CardContent className="pt-6 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead rowSpan={2} className="align-middle">Analista</TableHead>
                            <TableHead colSpan={3} className="text-center bg-primary/10 border-x">
                              {comparisonData.periodA.label}
                            </TableHead>
                            <TableHead colSpan={3} className="text-center bg-muted/50 border-x">
                              {comparisonData.periodB.label}
                            </TableHead>
                            <TableHead colSpan={2} className="text-center">Variação</TableHead>
                          </TableRow>
                          <TableRow>
                            <TableHead className="text-center bg-primary/10">Tickets</TableHead>
                            <TableHead className="text-center bg-primary/10">Tempo</TableHead>
                            <TableHead className="text-center bg-primary/10 border-r">CSAT</TableHead>
                            <TableHead className="text-center bg-muted/50">Tickets</TableHead>
                            <TableHead className="text-center bg-muted/50">Tempo</TableHead>
                            <TableHead className="text-center bg-muted/50 border-r">CSAT</TableHead>
                            <TableHead className="text-center">Volume</TableHead>
                            <TableHead className="text-center">Rank</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {comparisonData.analysts.map((analyst) => (
                            <TableRow key={analyst.analyst_id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {analyst.analyst_name}
                                  {analyst.trend === "new" && (
                                    <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">NOVO</Badge>
                                  )}
                                  {analyst.trend === "inactive" && (
                                    <Badge variant="outline" className="text-xs bg-gray-100 text-gray-500 border-gray-300">INATIVO</Badge>
                                  )}
                                </div>
                              </TableCell>
                              
                              {/* Period A */}
                              <TableCell className="text-center bg-primary/5">
                                {analyst.periodA?.total_resolved ?? "-"}
                              </TableCell>
                              <TableCell className="text-center bg-primary/5">
                                {analyst.periodA ? formatMinutesToHuman(analyst.periodA.avg_resolution_minutes) : "-"}
                              </TableCell>
                              <TableCell className="text-center bg-primary/5 border-r">
                                {analyst.periodA?.csat_avg_rating ? analyst.periodA.csat_avg_rating.toFixed(1) : "-"}
                              </TableCell>
                              
                              {/* Period B */}
                              <TableCell className="text-center bg-muted/30">
                                {analyst.periodB?.total_resolved ?? "-"}
                              </TableCell>
                              <TableCell className="text-center bg-muted/30">
                                {analyst.periodB ? formatMinutesToHuman(analyst.periodB.avg_resolution_minutes) : "-"}
                              </TableCell>
                              <TableCell className="text-center bg-muted/30 border-r">
                                {analyst.periodB?.csat_avg_rating ? analyst.periodB.csat_avg_rating.toFixed(1) : "-"}
                              </TableCell>
                              
                              {/* Variations */}
                              <TableCell className="text-center">
                                {analyst.trend === "new" || analyst.trend === "inactive" ? (
                                  "-"
                                ) : (
                                  <span className={getVariationColor(analyst.variations.volume)}>
                                    {formatVariation(analyst.variations.volume)}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {analyst.variations.rank !== 0 && analyst.periodA && analyst.periodB ? (
                                  <span className={analyst.variations.rank > 0 ? "text-green-600" : "text-red-600"}>
                                    {analyst.variations.rank > 0 ? "↑" : "↓"}{Math.abs(analyst.variations.rank)}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
                <ReportFooter />
              </PrintPage>
            </div>
          )}
        </>
      )}
    </div>
    </AppLayout>
  );
};

export default ClosureRankingReport;
