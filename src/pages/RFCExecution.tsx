import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAnalystQueues } from "@/hooks/useAnalystQueues";
import AppLayout from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardCheck, ArrowLeft, CheckCircle2, Loader2, Calendar,
  Building2, Tag, ChevronDown, ChevronUp, Copy, PartyPopper, Clock, Play, Timer,
  AlertTriangle, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { useRFCStepActions } from "@/hooks/useRFCStepActions";
import { Link } from "react-router-dom";
import { RFCCompleteDialog } from "@/components/tickets/RFCCompleteDialog";

type RFC = {
  id: string;
  ticket_number: string;
  title: string;
  segment: string;
  status: string;
  created_at: string;
  clients: { name: string } | null;
  analyst_id: string | null;
  team_id: string | null;
  queue_id: string | null;
};

type RFCStep = {
  id: string;
  descricao: string;
  procedimento: string | null;
  scripts: string | null;
  ordem: number;
  status_concluido: boolean;
  concluded_at: string | null;
  concluded_by: string | null;
  started_at: string | null;
  started_by: string | null;
  observacao: string | null;
  ticket_id: string;
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast({ title: "Copiado!", description: "Conteúdo copiado para a área de transferência." });
};

const RFCExecution = () => {
  const [selectedRfcId, setSelectedRfcId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [localObservacoes, setLocalObservacoes] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const { user, isSuperAdmin, isOtimizzoUser } = useAuth();
  const { queueIds, shouldRestrictView } = useAnalystQueues();
  const { startStep, toggleStep, updateObservacao } = useRFCStepActions(selectedRfcId);

  const isAdmin = isSuperAdmin || isOtimizzoUser;

  const { data: rfcs = [], isLoading: rfcsLoading } = useQuery({
    queryKey: ["rfc-approved-list", user?.id, isAdmin, queueIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("id, ticket_number, title, segment, status, created_at, clients(name), analyst_id, team_id, queue_id")
        .eq("record_type", "rfc")
        .eq("status", "aprovado")
        .order("created_at", { ascending: false });

      if (error) throw error;
      let results = (data ?? []) as RFC[];

      // Filter for non-admin analysts: only show RFCs assigned to them or their queues
      if (shouldRestrictView && user?.id) {
        results = results.filter(rfc =>
          rfc.analyst_id === user.id ||
          (rfc.queue_id && queueIds.includes(rfc.queue_id))
        );
      }

      return results;
    },
    enabled: !!user,
  });

  const { data: steps = [], isLoading: stepsLoading } = useQuery({
    queryKey: ["rfc-steps", selectedRfcId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rfc_steps")
        .select("*")
        .eq("ticket_id", selectedRfcId!)
        .order("ordem");
      if (error) throw error;
      return (data ?? []) as RFCStep[];
    },
    enabled: !!selectedRfcId,
  });

  const { data: concludedByProfiles = {} } = useQuery({
    queryKey: ["rfc-step-profiles", selectedRfcId],
    queryFn: async () => {
      const userIds = steps.filter(s => s.concluded_by).map(s => s.concluded_by!);
      if (userIds.length === 0) return {};
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      const map: Record<string, string> = {};
      (data ?? []).forEach(p => { map[p.id] = p.full_name; });
      return map;
    },
    enabled: steps.some(s => s.concluded_by),
  });

  // Sync local observacoes when steps load
  useEffect(() => {
    const newLocal: Record<string, string> = {};
    steps.forEach(s => { newLocal[s.id] = s.observacao ?? ""; });
    setLocalObservacoes(newLocal);
  }, [steps]);

  const selectedRfc = rfcs.find((r) => r.id === selectedRfcId) ?? null;
  const canExecute = !!(selectedRfc?.analyst_id && selectedRfc?.team_id);
  const completedCount = steps.filter((s) => s.status_concluido).length;
  const totalCount = steps.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allDone = totalCount > 0 && completedCount === totalCount;

  const handleSelectRfc = (id: string) => {
    setSelectedRfcId(id);
    setShowDetails(true);
    setExpandedStepId(null);
  };

  const handleMarkConcluida = async (message: string) => {
    if (!selectedRfcId || !user) return;
    setIsCompleting(true);
    try {
      // 1. Fetch ticket data for email
      const { data: ticketData, error: ticketError } = await supabase
        .from("tickets")
        .select("contact_email, contact_name, created_at, ticket_number, title")
        .eq("id", selectedRfcId)
        .single();
      if (ticketError || !ticketData) throw new Error("Erro ao buscar dados do ticket");

      // 2. Fetch analyst profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      const analystName = profile?.full_name || "Analista";

      // 3. Update ticket status
      const resolvedAt = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("tickets")
        .update({ status: "resolvido", resolved_at: resolvedAt, resolved_by: analystName })
        .eq("id", selectedRfcId);
      if (updateError) throw updateError;

      // 4. Insert comment for history
      await supabase.from("ticket_comments").insert({
        ticket_id: selectedRfcId,
        author_id: user.id,
        content: `**RFC Concluída**\n\n${message}`,
        is_internal: false,
      });

      // 5. Send resolution email
      const { data: session } = await supabase.auth.getSession();
      await supabase.functions.invoke("send-resolution-notification", {
        body: {
          ticketId: selectedRfcId,
          ticketNumber: ticketData.ticket_number,
          ticketTitle: ticketData.title,
          contactEmail: ticketData.contact_email,
          contactName: ticketData.contact_name,
          resolutionReason: message,
          analystName,
          createdAt: ticketData.created_at,
          resolvedAt,
        },
      });

      toast({ title: "RFC concluída com sucesso!", description: "Email enviado ao cliente e registrado no histórico." });
      queryClient.invalidateQueries({ queryKey: ["rfc-approved-list"] });
      setSelectedRfcId(null);
      setShowDetails(false);
      setShowCompleteDialog(false);
    } catch (error: any) {
      toast({ title: "Erro ao concluir RFC", description: error.message, variant: "destructive" });
    } finally {
      setIsCompleting(false);
    }
  };

  const handleObservacaoChange = (stepId: string, text: string) => {
    setLocalObservacoes(prev => ({ ...prev, [stepId]: text }));
    updateObservacao(stepId, text);
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
            <ClipboardCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Execução de RFC</h1>
            <p className="text-sm text-muted-foreground">Gerencie e execute os passos das RFCs aprovadas</p>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-[300px_1fr] h-[calc(100vh-220px)] min-h-[500px]">
          {/* Left: RFC List */}
          <div className={`border-r border-border flex flex-col h-full ${showDetails ? "hidden md:flex" : "flex"}`}>
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">RFCs Aprovadas</h2>
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
                  <ClipboardCheck className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Nenhuma RFC aprovada</p>
                  <p className="text-xs text-muted-foreground mt-1">RFCs com status "Aprovado" aparecerão aqui.</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {rfcs.map((rfc) => (
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
                      <p className="text-sm font-medium text-foreground line-clamp-2 mb-1">{rfc.title}</p>
                      <p className="text-xs text-muted-foreground">{rfc.clients?.name ?? "—"}</p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right: Details + Checklist */}
          <div className={`flex flex-col h-full ${!showDetails && !selectedRfcId ? "hidden md:flex" : showDetails ? "flex" : "hidden md:flex"}`}>
            {!selectedRfc ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <ClipboardCheck className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-base font-medium text-muted-foreground">Selecione uma RFC</p>
                <p className="text-sm text-muted-foreground mt-1">Clique em uma RFC da lista para ver os detalhes e executar o checklist.</p>
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
                    {/* Header */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground">#{selectedRfc.ticket_number}</span>
                        {segmentBadge(selectedRfc.segment)}
                        <Badge variant="outline" className="text-xs border-primary/40 text-primary">Aprovado</Badge>
                      </div>
                      <h3 className="text-base font-semibold text-foreground leading-snug">{selectedRfc.title}</h3>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {selectedRfc.clients?.name ?? "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(selectedRfc.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    </div>

                    <Separator />

                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">Progresso</span>
                        <span className="text-muted-foreground">
                          {completedCount}/{totalCount} passos concluídos ({progressPercent}%)
                        </span>
                      </div>
                      <Progress value={progressPercent} className="h-2.5" />
                    </div>

                    {/* Prerequisites Alert */}
                    {!canExecute && (
                      <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                              Pré-requisitos não atendidos
                            </p>
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                              Para iniciar a execução desta RFC, é necessário atribuir:
                            </p>
                            <ul className="text-sm text-amber-700 dark:text-amber-300 list-disc list-inside space-y-0.5">
                              {!selectedRfc?.analyst_id && <li>Analista responsável</li>}
                              {!selectedRfc?.team_id && <li>Time responsável</li>}
                            </ul>
                            <Link
                              to={`/tickets/${selectedRfc?.id}`}
                              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline mt-2"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Abrir ticket para atribuir
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 100% Celebration Banner */}
                    {allDone && canExecute && (
                      <div className="relative overflow-hidden rounded-xl border-2 border-green-400 bg-green-50 dark:bg-green-950/30 p-4">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 via-green-400/20 to-green-400/10 animate-pulse" />
                        <div className="relative flex items-center gap-3">
                          <PartyPopper className="w-8 h-8 text-green-600 dark:text-green-400 shrink-0" />
                          <div className="flex-1">
                            <p className="text-base font-bold text-green-800 dark:text-green-200">
                              🎉 Todos os passos concluídos!
                            </p>
                            <p className="text-sm text-green-700 dark:text-green-300 mt-0.5">
                              A execução foi finalizada com sucesso. Marque a RFC como concluída.
                            </p>
                          </div>
                          <Button size="sm" onClick={() => setShowCompleteDialog(true)} className="shrink-0 bg-green-600 hover:bg-green-700 text-white">
                            Concluir RFC
                          </Button>
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Checklist */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        Passos de Execução
                      </p>
                      {stepsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : steps.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">Nenhum passo cadastrado para esta RFC.</p>
                      ) : (
                        <div className="space-y-2">
                          {steps.map((step) => {
                            const isStepExpanded = expandedStepId === step.id;
                            const hasDetails = !!(step.procedimento || step.scripts);
                            const isDone = step.status_concluido;
                            const isStarted = !!(step as any).started_at;
                            const isInProgress = isStarted && !isDone;

                            const calcDuration = () => {
                              const sa = (step as any).started_at;
                              if (!sa || !step.concluded_at) return null;
                              const diffMs = new Date(step.concluded_at).getTime() - new Date(sa).getTime();
                              if (diffMs < 0) return null;
                              const totalMin = Math.round(diffMs / 60000);
                              if (totalMin < 60) return `${totalMin}min`;
                              const h = Math.floor(totalMin / 60);
                              const m = totalMin % 60;
                              return m > 0 ? `${h}h ${m}min` : `${h}h`;
                            };

                            return (
                              <div
                                key={step.id}
                                className={`rounded-lg border transition-colors ${
                                  isDone ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800" 
                                  : isInProgress ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                                  : "bg-card border-border"
                                }`}
                              >
                                {/* Header row */}
                                <div className="flex items-start gap-3 p-3">
                                  <Checkbox
                                    checked={isDone}
                                    onCheckedChange={() => toggleStep(step.id, isDone)}
                                    className="mt-0.5 shrink-0"
                                    disabled={!canExecute}
                                  />
                                  <div
                                    className="flex items-start gap-2 min-w-0 flex-1 cursor-pointer"
                                    onClick={() => setExpandedStepId(isStepExpanded ? null : step.id)}
                                  >
                                    <span className="text-xs font-mono text-muted-foreground shrink-0 mt-0.5">
                                      {String(step.ordem + 1).padStart(2, "0")}.
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <span className={`text-sm leading-snug block ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                        {step.descricao}
                                      </span>
                                      {/* Concluded info with duration */}
                                      {isDone && step.concluded_at && (
                                        <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3" />
                                          Concluído {step.concluded_by && concludedByProfiles[step.concluded_by]
                                            ? `por ${concludedByProfiles[step.concluded_by]} `
                                            : ""}
                                          em {format(new Date(step.concluded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                          {calcDuration() && (
                                            <span className="ml-1 font-medium">
                                              <Timer className="w-3 h-3 inline mr-0.5" />
                                              {calcDuration()}
                                            </span>
                                          )}
                                        </p>
                                      )}
                                      {/* In progress info */}
                                      {isInProgress && (step as any).started_at && (
                                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                                          <Play className="w-3 h-3" />
                                          Iniciado em {format(new Date((step as any).started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {/* Status badge / Start button */}
                                  {isDone ? (
                                    <Badge className="shrink-0 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-700 text-xs">
                                      Concluído
                                    </Badge>
                                  ) : isInProgress ? (
                                    <Badge className="shrink-0 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-700 text-xs">
                                      <Play className="w-3 h-3 mr-1" />
                                      Em andamento
                                    </Badge>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="shrink-0 h-7 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10"
                                      onClick={(e) => { e.stopPropagation(); startStep(step.id); }}
                                      disabled={!canExecute}
                                    >
                                      <Play className="w-3 h-3" />
                                      Iniciar Atividade
                                    </Button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setExpandedStepId(isStepExpanded ? null : step.id)}
                                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    {isStepExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </button>
                                </div>

                                {/* Expanded detail */}
                                {isStepExpanded && (
                                  <div className="border-t border-border px-3 pb-3 pt-3 space-y-3 bg-muted/20">
                                    {step.procedimento && (
                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Procedimento Detalhado</p>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-xs gap-1"
                                            onClick={() => copyToClipboard(step.procedimento!)}
                                          >
                                            <Copy className="w-3 h-3" />
                                            Copiar
                                          </Button>
                                        </div>
                                        <p className="text-sm text-foreground whitespace-pre-wrap">{step.procedimento}</p>
                                      </div>
                                    )}
                                    {step.scripts && (
                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Scripts / Comandos</p>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-xs gap-1"
                                            onClick={() => copyToClipboard(step.scripts!)}
                                          >
                                            <Copy className="w-3 h-3" />
                                            Copiar
                                          </Button>
                                        </div>
                                        <pre className="text-sm font-mono p-3 rounded-md bg-zinc-900 text-green-400 overflow-x-auto whitespace-pre-wrap">
                                          {step.scripts}
                                        </pre>
                                      </div>
                                    )}
                                    {/* Observação */}
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Observação do Analista
                                      </p>
                                      <Textarea
                                        placeholder="Adicione observações sobre este passo... (salva automaticamente)"
                                        value={localObservacoes[step.id] ?? ""}
                                        onChange={(e) => handleObservacaoChange(step.id, e.target.value)}
                                        className="min-h-[60px] text-sm"
                                      />
                                      <p className="text-xs text-muted-foreground">Auto-save com debounce de 1.5s</p>
                                    </div>
                                  </div>
                                )}
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

      {selectedRfc && (
        <RFCCompleteDialog
          open={showCompleteDialog}
          onOpenChange={setShowCompleteDialog}
          ticket={{
            id: selectedRfc.id,
            ticket_number: selectedRfc.ticket_number,
            title: selectedRfc.title,
            clientName: selectedRfc.clients?.name ?? "—",
          }}
          onConfirm={handleMarkConcluida}
          isLoading={isCompleting}
        />
      )}
    </AppLayout>
  );
};

export default RFCExecution;
