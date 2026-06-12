import { useMemo, useState } from "react";
import { ArrowLeft, Download, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import ReportPeriodFilter from "./ReportPeriodFilter";
import {
  ReportPeriodState,
  defaultReportPeriodState,
  rangeFromSingle,
} from "@/lib/reportPeriod";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyTimeLogsData } from "@/hooks/useMyTimeLogsData";

interface Props {
  onBack: () => void;
}

function fmtTime(t: string | null) {
  if (!t) return "-";
  return t.substring(0, 5);
}

function fmtHours(h: number) {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${hh}h${mm.toString().padStart(2, "0")}`;
}

const MyTimeLogsReport = ({ onBack }: Props) => {
  const { profile, isSuperAdmin } = useAuth();
  const [periodState, setPeriodState] = useState<ReportPeriodState>(defaultReportPeriodState());
  const [clientId, setClientId] = useState("all");
  const [projectId, setProjectId] = useState("all");
  const [analystId, setAnalystId] = useState("all");

  const range = useMemo(() => {
    if (periodState.mode === "single") return rangeFromSingle(periodState.period);
    return rangeFromSingle({ preset: "current-month" });
  }, [periodState]);

  // Clients dropdown
  const { data: clients } = useQuery({
    queryKey: ["report-clients-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Projects (filtered by client when specific)
  const { data: projects } = useQuery({
    queryKey: ["report-projects", clientId],
    queryFn: async () => {
      let q = supabase.from("client_projects").select("id, name, client_id").eq("is_active", true).order("name");
      if (clientId !== "all") q = q.eq("client_id", clientId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  // Analysts list — only used by super admin
  const { data: analysts } = useQuery({
    queryKey: ["report-analysts-all"],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .is("client_id", null)
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: rows, isLoading } = useMyTimeLogsData({
    startDate: range.start,
    endDate: range.end,
    analystId,
    clientId,
    projectId,
    isSuperAdmin,
    currentUserId: profile?.id,
  });

  const totalHours = useMemo(() => (rows ?? []).reduce((s, r) => s + r.hours, 0), [rows]);

  const byClient = useMemo(() => {
    const m = new Map<string, number>();
    (rows ?? []).forEach((r) => m.set(r.client_name, (m.get(r.client_name) ?? 0) + r.hours));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const exportCSV = () => {
    const header = [
      "Data",
      "Analista",
      "Cliente",
      "Ticket",
      "Projeto",
      "Início",
      "Fim",
      "Horas",
      "Descrição",
    ];
    const lines = [header.join(";")];
    (rows ?? []).forEach((r) => {
      lines.push(
        [
          format(parseISO(r.work_date), "dd/MM/yyyy"),
          r.analyst_name ?? "",
          r.client_name,
          r.ticket_number,
          r.project_name ?? "",
          fmtTime(r.start_time),
          fmtTime(r.end_time),
          r.hours.toFixed(2).replace(".", ","),
          (r.description ?? "").replace(/[\r\n;]/g, " "),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(";"),
      );
    });
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meus-lancamentos-${format(range.start, "yyyy-MM-dd")}_${format(range.end, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Clock className="h-6 w-6 text-primary" />
                {isSuperAdmin ? "Lançamentos de Horas (Geral)" : "Meus Lançamentos de Horas"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {isSuperAdmin
                  ? "Visualize lançamentos de qualquer analista e cliente."
                  : "Visualize seus próprios lançamentos por cliente, projeto e período."}
              </p>
            </div>
          </div>
          <Button onClick={exportCSV} disabled={!rows || rows.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ReportPeriodFilter value={periodState} onChange={setPeriodState} />
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Cliente</label>
                <Select
                  value={clientId}
                  onValueChange={(v) => {
                    setClientId(v);
                    setProjectId("all");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {(clients ?? []).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Projeto</label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os projetos</SelectItem>
                    {(projects ?? []).map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isSuperAdmin && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Analista</label>
                  <Select value={analystId} onValueChange={setAnalystId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os analistas</SelectItem>
                      {(analysts ?? []).map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total de horas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{fmtHours(totalHours)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Lançamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{rows?.length ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-base font-medium capitalize">{range.label}</div>
            </CardContent>
          </Card>
        </div>

        {byClient.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Totais por cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Horas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byClient.map(([name, h]) => (
                    <TableRow key={name}>
                      <TableCell>{name}</TableCell>
                      <TableCell className="text-right font-mono">{fmtHours(h)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lançamentos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : !rows || rows.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhum lançamento encontrado no período.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      {isSuperAdmin && <TableHead>Analista</TableHead>}
                      <TableHead>Cliente</TableHead>
                      <TableHead>Ticket</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Fim</TableHead>
                      <TableHead className="text-right">Horas</TableHead>
                      <TableHead>Descrição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(parseISO(r.work_date), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        {isSuperAdmin && <TableCell>{r.analyst_name ?? "-"}</TableCell>}
                        <TableCell>{r.client_name}</TableCell>
                        <TableCell className="font-mono">#{r.ticket_number}</TableCell>
                        <TableCell>{r.project_name ?? "-"}</TableCell>
                        <TableCell className="font-mono">{fmtTime(r.start_time)}</TableCell>
                        <TableCell className="font-mono">{fmtTime(r.end_time)}</TableCell>
                        <TableCell className="text-right font-mono">{fmtHours(r.hours)}</TableCell>
                        <TableCell className="max-w-xs truncate" title={r.description ?? ""}>
                          {r.description ?? "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default MyTimeLogsReport;