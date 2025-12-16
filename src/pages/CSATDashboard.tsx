import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Star, TrendingUp, Users, MessageSquare, AlertTriangle, Trophy } from "lucide-react";
import { useCSATData } from "@/hooks/useCSATData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

const CSATDashboard = () => {
  const [days, setDays] = useState("30");
  const [segment, setSegment] = useState("all");
  const [clientId, setClientId] = useState<string | undefined>();

  const { data: clients } = useQuery({
    queryKey: ["clients-csat"],
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

  const { data, isLoading } = useCSATData({
    days: parseInt(days),
    segment: segment !== "all" ? segment : undefined,
    clientId,
  });

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating 
                ? "fill-yellow-400 text-yellow-400" 
                : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return "text-green-600";
    if (rating >= 3.5) return "text-blue-600";
    if (rating >= 2.5) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500" />
            Dashboard CSAT
          </h1>
          <p className="text-muted-foreground">Satisfação do Cliente</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="60">Últimos 60 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>

          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Segmento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="DB">Banco de Dados</SelectItem>
              <SelectItem value="APP">Aplicação</SelectItem>
            </SelectContent>
          </Select>

          <Select value={clientId || "all"} onValueChange={(v) => setClientId(v === "all" ? undefined : v)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Clientes</SelectItem>
              {clients?.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    CSAT Médio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-1">
                    <p className={`text-3xl font-bold ${getRatingColor(data.overview.avg_rating)}`}>
                      {data.overview.avg_rating.toFixed(1)}
                    </p>
                    <span className="text-lg text-muted-foreground">/5</span>
                  </div>
                  {renderStars(Math.round(data.overview.avg_rating))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Total Respostas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{data.overview.total_responses}</p>
                  <p className="text-xs text-muted-foreground">
                    de {data.overview.total_resolved} resolvidos
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Taxa de Resposta
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{data.overview.response_rate.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">dos tickets avaliados</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Alertas Ativos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-orange-600">{data.alerts.length}</p>
                  <p className="text-xs text-muted-foreground">avaliações ≤2 estrelas</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Distribution Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Distribuição de Notas</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.distribution.some(d => d.count > 0) ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={data.distribution.filter(d => d.count > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="count"
                          nameKey="rating"
                          label={({ rating, count }) => `${rating}★: ${count}`}
                        >
                          {data.distribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Legend 
                          formatter={(value) => `${value} estrelas`}
                        />
                        <Tooltip 
                          formatter={(value, name) => [`${value} avaliações`, `${name} estrelas`]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      Sem dados de avaliação
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Evolution Line Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Evolução do CSAT</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.evolution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={data.evolution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => format(parseISO(value), "dd/MM")}
                        />
                        <YAxis domain={[0, 5]} />
                        <Tooltip 
                          labelFormatter={(value) => format(parseISO(value as string), "dd/MM/yyyy")}
                          formatter={(value: number) => [value.toFixed(2), "CSAT Médio"]}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="avg_rating" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--primary))" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      Sem dados de evolução
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Analyst Ranking */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Ranking de Analistas por Satisfação
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.by_analyst.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Analista</TableHead>
                        <TableHead className="text-center">CSAT</TableHead>
                        <TableHead className="text-center">Avaliações</TableHead>
                        <TableHead className="text-center">Tickets Resolvidos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.by_analyst.map((analyst, index) => (
                        <TableRow key={analyst.analyst_id}>
                          <TableCell>
                            {index < 3 ? (
                              <Badge variant={index === 0 ? "default" : "secondary"}>
                                {index + 1}º
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">{index + 1}</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{analyst.analyst_name}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className={`font-semibold ${getRatingColor(analyst.avg_rating)}`}>
                                {analyst.avg_rating.toFixed(1)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{analyst.total_ratings}</TableCell>
                          <TableCell className="text-center">{analyst.total_resolved}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma avaliação no período selecionado
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Alerts Section */}
            {data.alerts.length > 0 && (
              <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-orange-700 dark:text-orange-400">
                    <AlertTriangle className="h-5 w-5" />
                    Alertas de Avaliações Negativas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.alerts.map((alert) => (
                    <Alert key={alert.ticket_id} variant="destructive" className="bg-background">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle className="flex items-center gap-2">
                        <Link 
                          to={`/tickets/${alert.ticket_id}`} 
                          className="hover:underline"
                        >
                          Ticket #{alert.ticket_number}
                        </Link>
                        <span className="text-muted-foreground">•</span>
                        {renderStars(alert.rating)}
                        <span className="text-muted-foreground">•</span>
                        <span className="text-sm font-normal">{alert.analyst_name}</span>
                      </AlertTitle>
                      <AlertDescription>
                        {alert.comment ? (
                          <p className="mt-1 text-sm">"{alert.comment}"</p>
                        ) : (
                          <p className="mt-1 text-sm text-muted-foreground italic">Sem comentário</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Cliente: {alert.client_name} • {alert.submitted_at && formatDistanceToNow(parseISO(alert.submitted_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </AlertDescription>
                    </Alert>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Recent Feedback */}
            {data.recent_feedback.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Feedback Recente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.recent_feedback.map((feedback) => (
                    <div 
                      key={feedback.ticket_id} 
                      className="flex gap-4 p-4 rounded-lg border bg-muted/30"
                    >
                      <div className="flex-shrink-0">
                        {renderStars(feedback.rating)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link 
                            to={`/tickets/${feedback.ticket_id}`}
                            className="font-medium hover:underline"
                          >
                            #{feedback.ticket_number}
                          </Link>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground">{feedback.analyst_name}</span>
                        </div>
                        <p className="text-sm">{feedback.comment}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {feedback.client_name} • {feedback.submitted_at && formatDistanceToNow(parseISO(feedback.submitted_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </div>
    </AppLayout>
  );
};

export default CSATDashboard;