import { useState } from "react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, FileDown, Trophy, Timer, Users, TrendingUp, TrendingDown, Minus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useClosureRankingData } from "@/hooks/useClosureRankingData";
import { useClosureRankingEvolution } from "@/hooks/useClosureRankingEvolution";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import ReportCover from "./ReportCover";
import PrintPage from "./PrintPage";
import ReportFooter from "./ReportFooter";

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

const ClosureRankingReport = ({ onBack }: ClosureRankingReportProps) => {
  const [period, setPeriod] = useState("current-month");
  const [segment, setSegment] = useState("all");
  const [clientId, setClientId] = useState("all");

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case "current-month":
        return {
          start: format(startOfMonth(now), "yyyy-MM-dd"),
          end: format(endOfMonth(now), "yyyy-MM-dd"),
          label: format(now, "MMMM 'de' yyyy", { locale: ptBR }),
        };
      case "last-month":
        const lastMonth = subMonths(now, 1);
        return {
          start: format(startOfMonth(lastMonth), "yyyy-MM-dd"),
          end: format(endOfMonth(lastMonth), "yyyy-MM-dd"),
          label: format(lastMonth, "MMMM 'de' yyyy", { locale: ptBR }),
        };
      case "last-3-months":
        return {
          start: format(startOfMonth(subMonths(now, 2)), "yyyy-MM-dd"),
          end: format(endOfMonth(now), "yyyy-MM-dd"),
          label: "Últimos 3 meses",
        };
      case "last-6-months":
        return {
          start: format(startOfMonth(subMonths(now, 5)), "yyyy-MM-dd"),
          end: format(endOfMonth(now), "yyyy-MM-dd"),
          label: "Últimos 6 meses",
        };
      default:
        return {
          start: format(startOfMonth(now), "yyyy-MM-dd"),
          end: format(endOfMonth(now), "yyyy-MM-dd"),
          label: format(now, "MMMM 'de' yyyy", { locale: ptBR }),
        };
    }
  };

  const dateRange = getDateRange();

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
  const showEvolution = period === "last-3-months" || period === "last-6-months";
  
  const { data: evolutionData } = useClosureRankingEvolution({
    startDate: dateRange.start,
    endDate: dateRange.end,
    segment: segment !== "all" ? segment : undefined,
    clientId: clientId !== "all" ? clientId : undefined,
    enabled: showEvolution,
  });

  const handlePrint = () => {
    const originalTitle = document.title;
    const periodLabel = sanitizeForFilename(dateRange.label);
    document.title = `Ranking_Encerramento_${periodLabel}`;
    
    const handleAfterPrint = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', handleAfterPrint);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    
    window.print();
  };

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
              Ranking de analistas por volume e tempo de resolução
            </p>
          </div>
        </div>
        <Button onClick={handlePrint} disabled={isLoading || !data}>
          <FileDown className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 print:hidden">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current-month">Mês atual</SelectItem>
            <SelectItem value="last-month">Mês anterior</SelectItem>
            <SelectItem value="last-3-months">Últimos 3 meses</SelectItem>
            <SelectItem value="last-6-months">Últimos 6 meses</SelectItem>
          </SelectContent>
        </Select>

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
    </div>
  );
};

export default ClosureRankingReport;
