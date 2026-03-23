import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import {
  ClipboardList, ArrowLeft, CheckCircle2, Clock, Loader2,
  Calendar, ChevronDown, ChevronUp, PartyPopper, MessageSquare, Timer,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatDuration(startedAt: string | null, concludedAt: string | null): string {
  if (!startedAt || !concludedAt) return "—";
  const diffMs = new Date(concludedAt).getTime() - new Date(startedAt).getTime();
  if (diffMs < 0) return "—";
  const totalMinutes = Math.round(diffMs / 60000);
  if (totalMinutes < 60) return `${totalMinutes}min`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

function getDurationMinutes(startedAt: string | null, concludedAt: string | null): number {
  if (!startedAt || !concludedAt) return 0;
  const diffMs = new Date(concludedAt).getTime() - new Date(startedAt).getTime();
  return diffMs > 0 ? Math.round(diffMs / 60000) : 0;
}

function formatTotalDuration(totalMinutes: number): string {
  if (totalMinutes === 0) return "—";
  if (totalMinutes < 60) return `${totalMinutes}min`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

type RFC = {
  id: string;
  ticket_number: string;
  title: string;
  segment: string;
  status: string;
  created_at: string;
  rfc_progress: number;
  clients: { name: string } | null;
};

type RFCStep = {
  id: string;
  descricao: string;
  procedimento: string | null;
  ordem: number;
  status_concluido: boolean;
  started_at: string | null;
  concluded_at: string | null;
  observacao: string | null;
  ticket_id: string;
};

type StatusConfig = {
  label: string;
  colorClass: string;
  dotClass: string;
};

const getStatusConfig = (status: string): StatusConfig => {
  switch (status) {
    case "aguardando_aprovacao":
      return { label: "Aguardando Aprovação", colorClass: "bg-amber-50 border-amber-200 text-amber-800", dotClass: "bg-amber-500" };
    case "aprovado":
      return { label: "Manutenção Aprovada — Em Breve", colorClass: "bg-blue-50 border-blue-200 text-blue-800", dotClass: "bg-blue-500" };
    case "em_atendimento":
    case "novo":
      return { label: "Sua manutenção está em andamento", colorClass: "bg-green-50 border-green-200 text-green-800", dotClass: "bg-green-500" };
    case "resolvido":
      return { label: "Manutenção Concluída", colorClass: "bg-emerald-50 border-emerald-200 text-emerald-900", dotClass: "bg-emerald-600" };
    case "fechado":
      return { label: "RFC Encerrada", colorClass: "bg-muted border-border text-muted-foreground", dotClass: "bg-muted-foreground" };
    default:
      return { label: status, colorClass: "bg-muted border-border text-muted-foreground", dotClass: "bg-muted-foreground" };
  }
};

const ClientRFCPortal = () => {
  const [selectedRfcId, setSelectedRfcId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  const { data: rfcs = [], isLoading: rfcsLoading } = useQuery({
    queryKey: ["client-rfc-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("id, ticket_number, title, segment, status, created_at, rfc_progress, clients(name)")
        .eq("record_type", "rfc")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RFC[];
    },
  });

  const { data: steps = [], isLoading: stepsLoading } = useQuery({
    queryKey: ["client-rfc-steps", selectedRfcId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rfc_steps")
        .select("id, descricao, procedimento, ordem, status_concluido, started_at, concluded_at, observacao, ticket_id")
        .eq("ticket_id", selectedRfcId!)
        .order("ordem");
      if (error) throw error;
      return (data ?? []) as RFCStep[];
    },
    enabled: !!selectedRfcId,
  });

  const selectedRfc = rfcs.find((r) => r.id === selectedRfcId) ?? null;
  const progressPercent = selectedRfc?.rfc_progress ?? 0;
  const completedCount = steps.filter((s) => s.status_concluido).length;
  const totalCount = steps.length;
  const totalDurationMinutes = steps.reduce((acc, s) => acc + getDurationMinutes(s.started_at, s.concluded_at), 0);

  const handleSelectRfc = (id: string) => {
    setSelectedRfcId(id);
    setShowDetails(true);
  };

  const segmentBadge = (segment: string) =>
    segment === "DB" ? (
      <Badge variant="secondary" className="font-mono text-xs">DB</Badge>
    ) : (
      <Badge variant="outline" className="font-mono text-xs">APP</Badge>
    );

  return (
    <AppLayout>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Minhas RFCs</h1>
            <p className="text-sm text-muted-foreground">Acompanhe o progresso das suas manutenções</p>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-[340px_1fr] h-[calc(100vh-180px)] min-h-[500px]">
          {/* Left: RFC List */}
          <div className={`border-r border-border flex flex-col h-full ${showDetails ? "hidden md:flex" : "flex"}`}>
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">Minhas RFCs</h2>
                {rfcs.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">{rfcs.length}</Badge>
                )}
              </div>
            </div>
            <ScrollArea className="flex-1">
              {rfcsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : rfcs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <ClipboardList className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Nenhuma RFC encontrada</p>
                  <p className="text-xs text-muted-foreground mt-1">Suas solicitações de manutenção aparecerão aqui.</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {rfcs.map((rfc) => {
                    const statusConfig = getStatusConfig(rfc.status);
                    return (
                      <button
                        key={rfc.id}
                        onClick={() => handleSelectRfc(rfc.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-accent ${
                          selectedRfcId === rfc.id ? "bg-accent border-primary/30" : "bg-card border-border"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground">#{rfc.ticket_number}</span>
                          {segmentBadge(rfc.segment)}
                        </div>
                        <p className="text-sm font-medium text-foreground line-clamp-2 mb-2">{rfc.title}</p>
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-block w-2 h-2 rounded-full ${statusConfig.dotClass}`} />
                          <span className="text-xs text-muted-foreground">{statusConfig.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right: Detail Panel */}
          <div className={`flex flex-col h-full min-h-0 ${!showDetails && !selectedRfcId ? "hidden md:flex" : showDetails ? "flex" : "hidden md:flex"}`}>
            {!selectedRfc ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <ClipboardList className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-base font-medium text-muted-foreground">Selecione uma RFC</p>
                <p className="text-sm text-muted-foreground mt-1">Clique em uma RFC da lista para acompanhar o progresso.</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                {/* Mobile back button */}
                <div className="md:hidden p-3 border-b border-border">
                  <Button variant="ghost" size="sm" onClick={() => setShowDetails(false)} className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Voltar à lista
                  </Button>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    {/* Big status badge */}
                    {(() => {
                      const cfg = getStatusConfig(selectedRfc.status);
                      return (
                        <div className={`flex items-center gap-3 p-4 rounded-xl border-2 ${cfg.colorClass}`}>
                          <span className={`w-3 h-3 rounded-full shrink-0 ${cfg.dotClass}`} />
                          <div>
                            <p className="font-semibold text-base leading-tight">{cfg.label}</p>
                            <p className="text-xs mt-0.5 opacity-70">
                              RFC #{selectedRfc.ticket_number} · {selectedRfc.segment === "DB" ? "Banco de Dados" : "Aplicativo"}
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Header info */}
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-foreground leading-snug">{selectedRfc.title}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Aberta em {format(new Date(selectedRfc.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>

                    <Separator />

                    {/* Progress bar — from DB */}
                    {totalCount > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground">Progresso da execução</span>
                          <span className="text-muted-foreground text-xs">
                            {completedCount}/{totalCount} passos ({progressPercent}%)
                          </span>
                        </div>
                        <Progress value={progressPercent} className="h-2.5" />
                      </div>
                    )}

                    {/* 100% Celebration Banner */}
                    {progressPercent === 100 && totalCount > 0 && (
                      <div className="relative overflow-hidden rounded-xl border-2 border-green-400 bg-green-50 dark:bg-green-950/30 p-4">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 via-green-400/20 to-green-400/10 animate-pulse" />
                        <div className="relative flex items-center gap-3">
                          <PartyPopper className="w-8 h-8 text-green-600 dark:text-green-400 shrink-0" />
                          <div>
                            <p className="text-base font-bold text-green-800 dark:text-green-200">
                              🎉 Manutenção Concluída!
                            </p>
                            <p className="text-sm text-green-700 dark:text-green-300 mt-0.5">
                              Todos os passos foram executados com sucesso.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Vertical Timeline */}
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground mb-3">Passos de Execução</p>

                      {stepsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : steps.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          Nenhum passo cadastrado para esta RFC.
                        </p>
                      ) : (
                        <div className="relative">
                          {steps.map((step, index) => {
                            const isLast = index === steps.length - 1;
                            const isDone = step.status_concluido;
                            const isStepExpanded = expandedStepId === step.id;
                            const hasProcedimento = !!step.procedimento;
                            const hasObservacao = !!step.observacao;
                            const hasExpandable = hasProcedimento || hasObservacao;

                            return (
                              <div key={step.id} className="relative flex gap-4">
                                {/* Timeline line */}
                                {!isLast && (
                                  <div
                                    className={`absolute left-[15px] top-8 w-0.5 h-full -mb-1 ${
                                      isDone ? "bg-green-400" : "bg-border"
                                    }`}
                                  />
                                )}

                                {/* Icon */}
                                <div className="shrink-0 mt-0.5">
                                  {isDone ? (
                                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full border-2 border-blue-300 bg-background flex items-center justify-center">
                                      <Clock className="w-4 h-4 text-blue-500" />
                                    </div>
                                  )}
                                </div>

                                {/* Content */}
                                <div className={`flex-1 ${isLast ? "pb-2" : "pb-6"}`}>
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-mono text-muted-foreground shrink-0 mt-0.5">
                                      {String(step.ordem + 1).padStart(2, "0")}.
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <p className={`text-sm font-medium leading-snug ${isDone ? "text-muted-foreground line-through" : "text-foreground"}`}>
                                          {step.descricao}
                                        </p>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          {isDone ? (
                                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-700 text-xs">
                                              Concluído
                                            </Badge>
                                          ) : (
                                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-700 text-xs">
                                              Pendente
                                            </Badge>
                                          )}
                                          {hasExpandable && (
                                            <button
                                              type="button"
                                              onClick={() => setExpandedStepId(isStepExpanded ? null : step.id)}
                                              className="text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                              {isStepExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      {isDone && step.concluded_at && (
                                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3" />
                                          Concluído em {format(new Date(step.concluded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                        </p>
                                      )}
                                      {!isDone && (
                                        <p className="text-xs text-muted-foreground mt-1">Aguardando execução</p>
                                      )}
                                      {/* Expanded: procedimento + observacao (NO scripts for client) */}
                                      {isStepExpanded && (
                                        <div className="mt-2 space-y-2">
                                          {hasProcedimento && (
                                            <div className="p-3 rounded-md bg-muted/60 border border-border">
                                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Procedimento</p>
                                              <p className="text-sm text-foreground whitespace-pre-wrap">{step.procedimento}</p>
                                            </div>
                                          )}
                                          {hasObservacao && (
                                            <div className="p-3 rounded-md bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                                              <p className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-1 flex items-center gap-1">
                                                <MessageSquare className="w-3 h-3" />
                                                Observação do Analista
                                              </p>
                                              <p className="text-sm text-foreground whitespace-pre-wrap">{step.observacao}</p>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      </Card>
    </AppLayout>
  );
};

export default ClientRFCPortal;
