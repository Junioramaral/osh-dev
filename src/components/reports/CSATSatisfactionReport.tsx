import { useState, useMemo } from "react";
import { SegmentSelect } from "@/components/common/SegmentSelect";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Download,
  FileText,
  Star,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import PrintPage from "./PrintPage";
import ReportCover from "./ReportCover";
import ReportFooter from "./ReportFooter";
import ReportPeriodFilter from "./ReportPeriodFilter";
import {
  ReportPeriodState,
  defaultReportPeriodState,
  rangeFromSingle,
} from "@/lib/reportPeriod";
import { useCSATSatisfactionReport } from "@/hooks/useCSATSatisfactionReport";

interface Props {
  onBack: () => void;
}

const RATING_COLORS: Record<number, string> = {
  5: "hsl(142, 71%, 45%)",
  4: "hsl(215, 65%, 55%)",
  3: "hsl(45, 93%, 47%)",
  2: "hsl(24, 95%, 53%)",
  1: "hsl(0, 72%, 51%)",
};

function formatMinutes(mins: number | null): string {
  if (mins === null) return "—";
  if (mins < 60) return `${mins}min`;
  if (mins < 1440) return `${Math.round(mins / 60)}h`;
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  return `${d}d ${h}h`;
}

function ratingColor(r: number) {
  if (r >= 4.5) return "text-green-600";
  if (r >= 3.5) return "text-blue-600";
  if (r >= 2.5) return "text-yellow-600";
  return "text-red-600";
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${
            s <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

export default function CSATSatisfactionReport({ onBack }: Props) {
  const [periodState, setPeriodState] = useState<ReportPeriodState>(defaultReportPeriodState());
  const [segment, setSegment] = useState("all");
  const [clientId, setClientId] = useState<string | undefined>();
  const [analystId, setAnalystId] = useState<string | undefined>();
  const [ratingBucket, setRatingBucket] = useState<"all" | "promoters" | "neutrals" | "detractors">(
    "all"
  );

  const range =
    periodState.mode === "single"
      ? rangeFromSingle(periodState.period)
      : rangeFromSingle({ preset: "current-month" });

  const { data: clients } = useQuery({
    queryKey: ["clients-csat-report"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
  });

  const { data: analysts } = useQuery({
    queryKey: ["analysts-csat-report"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      return data || [];
    },
  });

  const { data, isLoading } = useCSATSatisfactionReport({
    startDate: range.start,
    endDate: range.end,
    segment: segment !== "all" ? segment : undefined,
    clientId,
    analystId,
    ratingBucket,
  });

  const exportPDF = () => {
    const t = `Satisfacao_${range.label.replace(/\s+/g, "_")}`;
    const orig = document.title;
    document.title = t;
    const after = () => {
      document.title = orig;
      window.removeEventListener("afterprint", after);
    };
    window.addEventListener("afterprint", after);
    window.print();
  };

  const exportCSV = () => {
    if (!data) return;
    const headers = [
      "Numero",
      "Avaliado em",
      "Cliente",
      "Segmento",
      "Prioridade",
      "Categoria",
      "Subcategoria",
      "Analista",
      "Quem abriu",
      "Email",
      "Tempo resolucao (min)",
      "SLA 1a resposta",
      "SLA resolucao",
      "Nota",
      "Comentario",
    ];
    const rows = data.tickets.map((t) => [
      t.ticket_number,
      t.csat_submitted_at ? format(parseISO(t.csat_submitted_at), "dd/MM/yyyy HH:mm") : "",
      t.client_name,
      t.segment,
      t.priority,
      t.category || "",
      t.subcategory || "",
      t.analyst_name,
      t.contact_name,
      t.contact_email,
      t.resolution_minutes ?? "",
      t.sla_first_response_met === null ? "" : t.sla_first_response_met ? "Sim" : "Nao",
      t.sla_resolution_met === null ? "" : t.sla_resolution_met ? "Sim" : "Nao",
      t.csat_rating,
      (t.csat_comment || "").replace(/"/g, '""'),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v ?? "")}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `satisfacao_${range.label.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const distributionData = useMemo(() => {
    if (!data) return [];
    const map: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    data.tickets.forEach((t) => {
      if (t.csat_rating >= 1 && t.csat_rating <= 5) map[t.csat_rating]++;
    });
    return [5, 4, 3, 2, 1].map((r) => ({
      rating: `${r}★`,
      count: map[r],
      color: RATING_COLORS[r],
    }));
  }, [data]);

  const evolutionData = useMemo(() => {
    if (!data) return [];
    const span =
      (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24);
    const useMonthly = span > 62;
    const map = new Map<string, { sum: number; count: number }>();
    data.tickets.forEach((t) => {
      if (!t.csat_submitted_at) return;
      const d = parseISO(t.csat_submitted_at);
      const key = useMonthly ? format(d, "yyyy-MM-01") : format(d, "yyyy-MM-dd");
      const e = map.get(key) || { sum: 0, count: 0 };
      e.sum += t.csat_rating;
      e.count++;
      map.set(key, e);
    });
    return Array.from(map.entries())
      .map(([date, v]) => ({
        date,
        avg: v.count > 0 ? Number((v.sum / v.count).toFixed(2)) : 0,
        count: v.count,
        label: useMonthly
          ? format(parseISO(date), "MMM/yy", { locale: ptBR })
          : format(parseISO(date), "dd/MM"),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data, range]);

  const ratingDelta = data
    ? data.overview.avg_rating - data.prev_overview.avg_rating
    : 0;

  return (
    <AppLayout>
      <div className="space-y-6 print:space-y-0">
        {/* Header */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Star className="h-6 w-6 text-yellow-500" />
                Satisfação dos Clientes
              </h1>
              <p className="text-muted-foreground">
                Análise detalhada das avaliações CSAT
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV} disabled={isLoading || !data?.tickets.length}>
              <FileText className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button onClick={exportPDF} disabled={isLoading}>
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="print:hidden">
          <CardContent className="pt-6 space-y-3">
            <ReportPeriodFilter value={periodState} onChange={setPeriodState} allowComparison={false} />
            <div className="flex gap-3 flex-wrap">
              <SegmentSelect
                value={segment}
                onValueChange={setSegment}
                clientId={clientId}
                className="w-44"
              />
              <Select value={clientId || "all"} onValueChange={(v) => setClientId(v === "all" ? undefined : v)}>
                <SelectTrigger className="w-56"><SelectValue placeholder="Cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Clientes</SelectItem>
                  {clients?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={analystId || "all"} onValueChange={(v) => setAnalystId(v === "all" ? undefined : v)}>
                <SelectTrigger className="w-56"><SelectValue placeholder="Analista" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Analistas</SelectItem>
                  {analysts?.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={ratingBucket} onValueChange={(v) => setRatingBucket(v as any)}>
                <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as notas</SelectItem>
                  <SelectItem value="promoters">Promotores (4–5★)</SelectItem>
                  <SelectItem value="neutrals">Neutros (3★)</SelectItem>
                  <SelectItem value="detractors">Detratores (1–2★)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : data ? (
          <div className="print:block">
            <PrintPage pageBreakBefore={false}>
              <ReportCover
                title="Relatório de Satisfação dos Clientes"
                periodLabel={range.label}
                subtitle={`${data.overview.total_responses} avaliações de ${data.resolved_count} resolvidos`}
              />
            </PrintPage>

            {/* KPIs */}
            <PrintPage>
              <h2 className="text-xl font-bold mb-6 print:text-lg">Resumo Executivo</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">CSAT Médio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-3xl font-bold ${ratingColor(data.overview.avg_rating)}`}>
                      {data.overview.avg_rating.toFixed(2)}
                      <span className="text-lg text-muted-foreground">/5</span>
                    </p>
                    {data.prev_overview.total_responses > 0 && (
                      <p className={`text-xs flex items-center gap-1 mt-1 ${ratingDelta >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {ratingDelta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {ratingDelta >= 0 ? "+" : ""}{ratingDelta.toFixed(2)} vs período anterior
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Total de Avaliações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{data.overview.total_responses}</p>
                    <p className="text-xs text-muted-foreground">
                      Taxa de resposta: {data.overview.response_rate.toFixed(0)}%
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Distribuição</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Promotores</span>
                      <span className="font-medium">{data.overview.promoters_pct.toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-yellow-600">Neutros</span>
                      <span className="font-medium">{data.overview.neutrals_pct.toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-red-600">Detratores</span>
                      <span className="font-medium">{data.overview.detractors_pct.toFixed(0)}%</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">NPS Simplificado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-3xl font-bold ${data.overview.nps >= 50 ? "text-green-600" : data.overview.nps >= 0 ? "text-blue-600" : "text-red-600"}`}>
                      {data.overview.nps.toFixed(0)}
                    </p>
                    <p className="text-xs text-muted-foreground">% promotores − % detratores</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid gap-4 md:grid-cols-2 mt-6">
                <Card>
                  <CardHeader><CardTitle className="text-base">Distribuição de Notas</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={distributionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="rating" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" name="Avaliações">
                          {distributionData.map((d, i) => (
                            <Cell key={i} fill={d.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Evolução do CSAT Médio</CardTitle></CardHeader>
                  <CardContent>
                    {evolutionData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={evolutionData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" />
                          <YAxis domain={[0, 5]} />
                          <Tooltip />
                          <Line type="monotone" dataKey="avg" name="CSAT" stroke="hsl(var(--primary))" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-center text-muted-foreground py-12">Sem dados</p>
                    )}
                  </CardContent>
                </Card>
              </div>
              <ReportFooter />
            </PrintPage>

            {/* Breakdown */}
            <PrintPage>
              <h2 className="text-xl font-bold mb-6 print:text-lg">Análise por Segmento, Prioridade e SLA</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Por Segmento</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>Segmento</TableHead><TableHead className="text-center">CSAT</TableHead><TableHead className="text-center">Avaliações</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {data.by_segment.map((s) => (
                          <TableRow key={s.segment}>
                            <TableCell>{s.segment}</TableCell>
                            <TableCell className={`text-center font-semibold ${ratingColor(s.avg)}`}>{s.avg.toFixed(2)}</TableCell>
                            <TableCell className="text-center">{s.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Por Prioridade</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>Prioridade</TableHead><TableHead className="text-center">CSAT</TableHead><TableHead className="text-center">Avaliações</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {data.by_priority.map((s) => (
                          <TableRow key={s.priority}>
                            <TableCell>{s.priority}</TableCell>
                            <TableCell className={`text-center font-semibold ${ratingColor(s.avg)}`}>{s.avg.toFixed(2)}</TableCell>
                            <TableCell className="text-center">{s.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">CSAT × SLA</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">SLA Cumprido</p>
                        <p className={`text-2xl font-bold ${ratingColor(data.sla_correlation.sla_met_avg)}`}>
                          {data.sla_correlation.sla_met_avg > 0 ? data.sla_correlation.sla_met_avg.toFixed(2) : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">SLA Violado</p>
                        <p className={`text-2xl font-bold ${ratingColor(data.sla_correlation.sla_breached_avg)}`}>
                          {data.sla_correlation.sla_breached_avg > 0 ? data.sla_correlation.sla_breached_avg.toFixed(2) : "—"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2 mt-6">
                <Card>
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-600" />Top 5 Clientes</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead className="text-center">CSAT</TableHead><TableHead className="text-center">Aval.</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {data.by_client_top.map((c) => (
                          <TableRow key={c.client_name}><TableCell>{c.client_name}</TableCell><TableCell className={`text-center font-semibold ${ratingColor(c.avg)}`}>{c.avg.toFixed(2)}</TableCell><TableCell className="text-center">{c.count}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-600" />Bottom 5 Clientes</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead className="text-center">CSAT</TableHead><TableHead className="text-center">Aval.</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {data.by_client_bottom.map((c) => (
                          <TableRow key={c.client_name}><TableCell>{c.client_name}</TableCell><TableCell className={`text-center font-semibold ${ratingColor(c.avg)}`}>{c.avg.toFixed(2)}</TableCell><TableCell className="text-center">{c.count}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-green-600" />Top 5 Analistas</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>Analista</TableHead><TableHead className="text-center">CSAT</TableHead><TableHead className="text-center">Aval.</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {data.by_analyst_top.map((c) => (
                          <TableRow key={c.analyst_name}><TableCell>{c.analyst_name}</TableCell><TableCell className={`text-center font-semibold ${ratingColor(c.avg)}`}>{c.avg.toFixed(2)}</TableCell><TableCell className="text-center">{c.count}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-600" />Categorias com Pior CSAT</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>Categoria</TableHead><TableHead className="text-center">CSAT</TableHead><TableHead className="text-center">Aval.</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {data.by_category_worst.map((c) => (
                          <TableRow key={c.category}><TableCell>{c.category}</TableCell><TableCell className={`text-center font-semibold ${ratingColor(c.avg)}`}>{c.avg.toFixed(2)}</TableCell><TableCell className="text-center">{c.count}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
              <ReportFooter />
            </PrintPage>

            {/* Detailed table */}
            <PrintPage>
              <h2 className="text-xl font-bold mb-4 print:text-lg">Tabela Detalhada de Avaliações</h2>
              <Card>
                <CardContent className="pt-6 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticket</TableHead>
                        <TableHead>Avaliado</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Seg.</TableHead>
                        <TableHead>Pri.</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Analista</TableHead>
                        <TableHead>Quem abriu</TableHead>
                        <TableHead className="text-center">Tempo</TableHead>
                        <TableHead className="text-center">SLA</TableHead>
                        <TableHead className="text-center">Nota</TableHead>
                        <TableHead>Comentário</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.tickets.length === 0 ? (
                        <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-8">Nenhuma avaliação no período</TableCell></TableRow>
                      ) : (
                        data.tickets.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell>
                              <Link to={`/tickets/${t.id}`} className="font-medium hover:underline text-primary">
                                #{t.ticket_number}
                              </Link>
                            </TableCell>
                            <TableCell className="text-xs whitespace-nowrap">
                              {t.csat_submitted_at ? format(parseISO(t.csat_submitted_at), "dd/MM/yy HH:mm") : "—"}
                            </TableCell>
                            <TableCell className="text-xs">{t.client_name}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{t.segment}</Badge></TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{t.priority}</Badge></TableCell>
                            <TableCell className="text-xs">{t.category}{t.subcategory ? ` / ${t.subcategory}` : ""}</TableCell>
                            <TableCell className="text-xs">{t.analyst_name}</TableCell>
                            <TableCell className="text-xs">{t.contact_name}</TableCell>
                            <TableCell className="text-center text-xs">{formatMinutes(t.resolution_minutes)}</TableCell>
                            <TableCell className="text-center text-xs">
                              {t.sla_resolution_met === null ? "—" : t.sla_resolution_met ? (
                                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-[10px]">OK</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300 text-[10px]">Falha</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <span className={`font-semibold ${ratingColor(t.csat_rating)}`}>{t.csat_rating}</span>
                                <Stars rating={t.csat_rating} />
                              </div>
                            </TableCell>
                            <TableCell className="text-xs max-w-xs truncate" title={t.csat_comment || ""}>
                              {t.csat_comment || <span className="text-muted-foreground italic">sem comentário</span>}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <ReportFooter />
            </PrintPage>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
