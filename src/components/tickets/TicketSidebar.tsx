import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculateSLAStatus, formatDuration, getStatusColor, getStatusLabel, getPriorityColor } from "@/lib/ticketUtils";
import { differenceInMinutes } from "date-fns";
import { BookOpen, ExternalLink, CheckCircle, Star, User, Clock, Timer, Pencil, Sliders } from "lucide-react";
import { TicketResolveDialog } from "./TicketResolveDialog";
import { RequiredFieldsBeforeResolveDialog, type RequiredFieldsValues } from "./RequiredFieldsBeforeResolveDialog";
import { TimeLogDialog } from "./TimeLogDialog";
import { SLAAdjustDialog } from "./SLAAdjustDialog";
import { SLARecalculatePromptDialog } from "./SLARecalculatePromptDialog";
import { useTicketActions } from "@/hooks/useTicketActions";
import { useTicketTimeLogs, useTicketHistory } from "@/hooks/useTicketDetail";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";

const OTIMIZZO_TENANT_ID = "00000000-0000-0000-0000-000000000001";

interface TicketSidebarProps {
  ticket: any;
}

function InfoRow({ label, value }: { label: string; value: any }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export default function TicketSidebar({ ticket }: TicketSidebarProps) {
  const [showFAQDialog, setShowFAQDialog] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [showTimeLogDialog, setShowTimeLogDialog] = useState(false);
  const [showRequiredFieldsDialog, setShowRequiredFieldsDialog] = useState(false);
  const [savingRequiredFields, setSavingRequiredFields] = useState(false);
  const [showSLAAdjustDialog, setShowSLAAdjustDialog] = useState(false);
  const [pendingPriority, setPendingPriority] = useState<string | null>(null);
  const { profile, isViewer, isOtimizzoUser, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { data: timeLogs } = useTicketTimeLogs(ticket.id);
  const { data: history } = useTicketHistory(ticket.id);
  const canAssignAnalyst = (isOtimizzoUser || isSuperAdmin) && !isViewer;
  const [editingAnalyst, setEditingAnalyst] = useState(false);
  const [assigningAnalyst, setAssigningAnalyst] = useState(false);
  const [pendingAnalystId, setPendingAnalystId] = useState<string>("");
  const [pendingTeamId, setPendingTeamId] = useState<string>("");

  const { data: assignableAnalysts } = useQuery({
    queryKey: ["sidebar-otimizzo-analysts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, team_id")
        .eq("client_id", OTIMIZZO_TENANT_ID)
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
    enabled: canAssignAnalyst,
  });

  const { data: analystTeams, isLoading: loadingAnalystTeams } = useQuery({
    queryKey: ["analyst-teams", pendingAnalystId],
    enabled: canAssignAnalyst && !!pendingAnalystId,
    queryFn: async () => {
      const teamMap = new Map<string, { id: string; name: string; segment: string | null }>();

      // 1) profiles.team_id
      const profile = assignableAnalysts?.find((a) => a.id === pendingAnalystId);
      if (profile?.team_id) {
        const { data: t } = await supabase
          .from("teams")
          .select("id, name, segment")
          .eq("id", profile.team_id)
          .maybeSingle();
        if (t) teamMap.set(t.id, t);
      }

      // 2) via user_queues -> teams_queues -> teams
      const { data: uq } = await supabase
        .from("user_queues")
        .select("queue_id")
        .eq("user_id", pendingAnalystId);
      const queueIds = (uq || []).map((q) => q.queue_id);
      if (queueIds.length > 0) {
        const { data: tq } = await supabase
          .from("teams_queues")
          .select("team_id, teams(id, name, segment)")
          .in("queue_id", queueIds);
        (tq || []).forEach((row: any) => {
          if (row.teams) teamMap.set(row.teams.id, row.teams);
        });
      }

      return Array.from(teamMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  // Auto-select team when only one option
  useEffect(() => {
    if (analystTeams && analystTeams.length === 1) {
      setPendingTeamId(analystTeams[0].id);
    } else if (analystTeams && analystTeams.length === 0) {
      setPendingTeamId("");
    }
  }, [analystTeams]);

  const handleAnalystChange = (analystId: string) => {
    setPendingAnalystId(analystId);
    setPendingTeamId("");
  };

  const handleConfirmAssignment = async () => {
    if (!pendingAnalystId) return;
    setAssigningAnalyst(true);
    try {
      const updates: Record<string, any> = {
        analyst_id: pendingAnalystId,
        lock_status: "locked",
        lock_owner_id: pendingAnalystId,
        lock_at: new Date().toISOString(),
        unlocked_at: null,
      };
      if (pendingTeamId) updates.team_id = pendingTeamId;
      const { error } = await supabase.from("tickets").update(updates).eq("id", ticket.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["ticket-detail"] });
      await queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Analista atribuído");

      // Best-effort notification (don't block UI on failure)
      supabase.functions
        .invoke("send-analyst-assignment-notification", { body: { ticketId: ticket.id } })
        .then(({ error: notifErr }) => {
          if (notifErr) console.warn("Notification error:", notifErr);
        });

      setEditingAnalyst(false);
      setPendingAnalystId("");
      setPendingTeamId("");
    } catch (e: any) {
      toast.error("Erro ao atribuir analista: " + e.message);
    } finally {
      setAssigningAnalyst(false);
    }
  };
  
  // Fallback: get resolver name from history if resolved_by is empty
  const resolvedByName = useMemo(() => {
    if (ticket.resolved_by) return ticket.resolved_by;
    if (!history) return "Não registrado";
    const resolvedEvent = history.find((h: any) => h.action_type === 'resolved' || h.action_type === 'status_changed' && h.new_value === 'resolvido');
    return (resolvedEvent as any)?.profiles?.full_name || "Não registrado";
  }, [ticket.resolved_by, history]);

  // Calculate total hours
  const totalHours = useMemo(() => {
    if (!timeLogs || timeLogs.length === 0) return 0;
    return timeLogs.reduce((sum, log) => sum + Number(log.hours), 0);
  }, [timeLogs]);

  const totalLogs = timeLogs?.length || 0;
  
  // Apenas analistas Otimizzo/SuperAdmin podem registrar horas (não clientes, não viewers)
  const canLogTime = (isOtimizzoUser || isSuperAdmin) && !isViewer;
  const { resolveTicketWithReason, updateTicketStatus, updateTicketPriority, adjustSLA } = useTicketActions();
  const canAdjustSLA = (isOtimizzoUser || isSuperAdmin) && !isViewer && ticket.record_type !== 'rfc';
  
  const slaStatus = calculateSLAStatus(ticket);
  const now = new Date();
  
  // Calculate resolution SLA if first response was given
  const resolutionSLA = ticket.first_response_at && ticket.sla_resolution_deadline ? (() => {
    const deadline = new Date(ticket.sla_resolution_deadline);
    const createdAt = new Date(ticket.created_at);
    const totalTime = differenceInMinutes(deadline, createdAt);
    const elapsed = differenceInMinutes(now, createdAt);
    const remaining = differenceInMinutes(deadline, now);
    const percentage = Math.min((elapsed / totalTime) * 100, 100);
    
    return {
      percentage,
      remaining,
      isOverdue: remaining < 0
    };
  })() : null;

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === "resolvido") {
      const missing = {
        analyst: !ticket.analyst_id,
        team: !ticket.team_id,
        queue: !ticket.queue_id,
      };
      if (missing.analyst || missing.team || missing.queue) {
        setShowRequiredFieldsDialog(true);
      } else {
        setShowResolveDialog(true);
      }
    } else {
      updateTicketStatus.mutate({
        ticketId: ticket.id,
        status: newStatus as any,
      });
    }
  };

  const handleResolveConfirm = async (reason: string, linkedTicketIds: string[]) => {
    if (!profile?.id) return;
    await resolveTicketWithReason.mutateAsync({
      ticketId: ticket.id,
      reason,
      userId: profile.id,
      linkedTicketIds,
    });
    setShowResolveDialog(false);
  };

  const handleRequiredFieldsConfirm = async (values: RequiredFieldsValues) => {
    setSavingRequiredFields(true);
    try {
      const updates: Record<string, any> = {};
      if (values.analystId) {
        updates.analyst_id = values.analystId;
        updates.lock_status = "locked";
        updates.lock_owner_id = values.analystId;
        updates.lock_at = new Date().toISOString();
        updates.unlocked_at = null;
      }
      if (values.teamId) updates.team_id = values.teamId;
      if (values.queueId) updates.queue_id = values.queueId;

      const { error } = await supabase
        .from("tickets")
        .update(updates)
        .eq("id", ticket.id);
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["ticket-detail"] });
      await queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setShowRequiredFieldsDialog(false);
      setShowResolveDialog(true);
    } catch (e: any) {
      toast.error("Erro ao salvar atribuições: " + e.message);
    } finally {
      setSavingRequiredFields(false);
    }
  };

  const isResolved = ticket.status === "resolvido" || ticket.status === "fechado";
  
  return (
    <div className="space-y-6">
      {/* Ticket Actions Card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Ações do Ticket</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Status Atual</Label>
            <Badge className={getStatusColor(ticket.status)}>
              {getStatusLabel(ticket.status)}
            </Badge>
          </div>

          {/* Closure Info - only show if resolved/closed */}
          {isResolved && ticket.resolved_at && (
            <div className="mt-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                  Ticket Resolvido
                </span>
              </div>
              
              <div className="space-y-1.5 text-sm">
                {/* Quem encerrou - DESTACADO */}
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Por:</span>
                  <span className="font-semibold text-foreground">
                    {resolvedByName}
                  </span>
                </div>
                
                {/* Data/hora */}
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Em:</span>
                  <span className="font-medium text-foreground">
                    {new Date(ticket.resolved_at).toLocaleString('pt-BR', {
                      timeZone: 'America/Sao_Paulo',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).replace(',', ' às')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Status Dropdown - only show if not resolved and not viewer */}
          {!isResolved && !isViewer && (
            <>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Alterar Status</Label>
                <Select
                  value={ticket.status}
                  onValueChange={handleStatusChange}
                  disabled={updateTicketStatus.isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                    <SelectItem value="aguardando_cliente">Aguardando Cliente</SelectItem>
                    <SelectItem value="aguardando_aprovacao">Aguardando Aprovação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Alterar Prioridade</Label>
                <Select
                  value={ticket.priority}
                  onValueChange={(value) => {
                    if (value !== ticket.priority) setPendingPriority(value);
                  }}
                  disabled={updateTicketPriority.isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      <Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P1"><Badge className={getPriorityColor("P1")}>P1</Badge> <span className="ml-2">Crítico</span></SelectItem>
                    <SelectItem value="P2"><Badge className={getPriorityColor("P2")}>P2</Badge> <span className="ml-2">Alta</span></SelectItem>
                    <SelectItem value="P3"><Badge className={getPriorityColor("P3")}>P3</Badge> <span className="ml-2">Média</span></SelectItem>
                    <SelectItem value="P4"><Badge className={getPriorityColor("P4")}>P4</Badge> <span className="ml-2">Baixa</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Resolve Button */}
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => setShowResolveDialog(true)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Resolver Ticket
              </Button>
            </>
          )}

          {/* Adjust SLA Button - analysts/admins only, not for resolved tickets */}
          {canAdjustSLA && !isResolved && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowSLAAdjustDialog(true)}
            >
              <Sliders className="h-4 w-4 mr-2" />
              Ajustar SLA
            </Button>
          )}

          {/* Log Time Button - visible for Otimizzo/SuperAdmin even on resolved tickets */}
          {canLogTime && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowTimeLogDialog(true)}
            >
              <Timer className="h-4 w-4 mr-2" />
              Registrar Horas
            </Button>
          )}

          {/* Viewer read-only message */}
          {isViewer && !isResolved && (
            <p className="text-xs text-purple-600 dark:text-purple-400 text-center">
              Modo somente leitura (Auditor)
            </p>
          )}
        </CardContent>
      </Card>

      {/* Hours Summary Card - visible for Otimizzo/SuperAdmin */}
      {(isOtimizzoUser || isSuperAdmin) && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Horas Trabalhadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {totalHours.toFixed(1)}h
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Registros</span>
              <span className="text-sm font-medium">{totalLogs}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resolve Dialog */}
      <TicketResolveDialog
        open={showResolveDialog}
        onOpenChange={setShowResolveDialog}
        ticket={{
          id: ticket.id,
          ticket_number: ticket.ticket_number,
          title: ticket.title,
          contact_name: ticket.contact_name,
          client_id: ticket.client_id,
        }}
        onConfirm={handleResolveConfirm}
        isLoading={resolveTicketWithReason.isPending}
      />

      <RequiredFieldsBeforeResolveDialog
        open={showRequiredFieldsDialog}
        onOpenChange={setShowRequiredFieldsDialog}
        ticketCount={1}
        missing={{
          analyst: !ticket.analyst_id,
          team: !ticket.team_id,
          queue: !ticket.queue_id,
        }}
        onConfirm={handleRequiredFieldsConfirm}
        isLoading={savingRequiredFields}
      />

      <SLAAdjustDialog
        open={showSLAAdjustDialog}
        onOpenChange={setShowSLAAdjustDialog}
        ticket={ticket}
        onConfirm={async (values) => {
          await adjustSLA.mutateAsync({
            ticketId: ticket.id,
            firstResponseDeadline: values.firstResponseDeadline,
            resolutionDeadline: values.resolutionDeadline,
            reason: values.reason,
          });
          setShowSLAAdjustDialog(false);
        }}
        isLoading={adjustSLA.isPending}
      />

      <SLARecalculatePromptDialog
        open={!!pendingPriority}
        onOpenChange={(o) => { if (!o) setPendingPriority(null); }}
        newPriority={pendingPriority || ""}
        onConfirm={(recalc, reason) => {
          if (!pendingPriority) return;
          updateTicketPriority.mutate({
            ticketId: ticket.id,
            priority: pendingPriority as any,
            recalculateSLA: recalc,
            reason,
          });
          setPendingPriority(null);
        }}
      />

      {/* Time Log Dialog */}
      <TimeLogDialog
        open={showTimeLogDialog}
        onOpenChange={setShowTimeLogDialog}
        ticket={{
          id: ticket.id,
          ticket_number: ticket.ticket_number,
          title: ticket.title,
          client_id: ticket.client_id,
        }}
      />

      {/* CSAT Rating Card */}
      {ticket.csat_rating && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              Avaliação do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-5 w-5",
                    star <= ticket.csat_rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground/30"
                  )}
                />
              ))}
              <span className="ml-2 font-semibold">{ticket.csat_rating}/5</span>
            </div>
            {ticket.csat_comment && (
              <p className="mt-2 text-sm text-muted-foreground italic">
                "{ticket.csat_comment}"
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* FAQ Relacionada */}
      {ticket.faq_articles && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              FAQ Relacionada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm font-medium line-clamp-2">{ticket.faq_articles.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {ticket.faq_articles.symptoms}
            </p>
            <Button 
              variant="link" 
              size="sm" 
              className="px-0 h-auto text-xs"
              onClick={() => setShowFAQDialog(true)}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Ver artigo completo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* FAQ Dialog */}
      <Dialog open={showFAQDialog} onOpenChange={setShowFAQDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{ticket.faq_articles?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Sintomas</Label>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                {ticket.faq_articles?.symptoms}
              </p>
            </div>
            {ticket.faq_articles?.problem && (
              <div>
                <Label className="text-sm font-semibold">Problema</Label>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                  {ticket.faq_articles?.problem}
                </p>
              </div>
            )}
            {ticket.faq_articles?.solution && (
              <div>
                <Label className="text-sm font-semibold">Solução</Label>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                  {ticket.faq_articles?.solution}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* SLA Card - hidden for RFCs */}
      {ticket.record_type !== 'rfc' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Status do SLA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">1ª Resposta</span>
                <Badge className={slaStatus.color} variant="outline">
                  {slaStatus.label}
                </Badge>
              </div>
              {slaStatus.percentage !== undefined && (
                <>
                  <Progress value={slaStatus.percentage} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{slaStatus.timeRemaining}</p>
                </>
              )}
            </div>
            
            {resolutionSLA && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Resolução</span>
                  <Badge 
                    className={resolutionSLA.isOverdue ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}
                    variant="outline"
                  >
                    {resolutionSLA.isOverdue ? 'Vencido' : 'No Prazo'}
                  </Badge>
                </div>
                <Progress value={resolutionSLA.percentage} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {resolutionSLA.isOverdue 
                    ? `Venceu há ${formatDuration(Math.abs(resolutionSLA.remaining))}`
                    : `${formatDuration(resolutionSLA.remaining)} restantes`
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Technical Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Informações Técnicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="Segmento" value={ticket.segment} />
          <InfoRow label="Ambiente" value={ticket.db_environment || ticket.app_environment} />
          {ticket.segment === 'DB' && (
            <>
              <InfoRow label="Engine" value={ticket.db_engine} />
              <InfoRow label="Instância" value={ticket.database_instances?.instance_name} />
            </>
          )}
          {ticket.segment === 'APP' && (
            <>
              <InfoRow label="Produto" value={ticket.application_products?.name} />
              <InfoRow label="Versão" value={ticket.app_version} />
              <InfoRow label="Módulo" value={ticket.app_module} />
            </>
          )}
          <InfoRow label="Máquina" value={ticket.db_machine?.hostname || ticket.app_machine?.hostname} />
        </CardContent>
      </Card>
      
      {/* People */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pessoas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Analista</Label>
            {canAssignAnalyst && (editingAnalyst || !ticket.analyst_id) ? (
              <div className="mt-1 space-y-2">
                <Select
                  value={pendingAnalystId || ticket.analyst_id || ""}
                  onValueChange={handleAnalystChange}
                  disabled={assigningAnalyst}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione um analista" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableAnalysts?.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {pendingAnalystId && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Time</Label>
                    <Select
                      value={pendingTeamId}
                      onValueChange={setPendingTeamId}
                      disabled={assigningAnalyst || loadingAnalystTeams || (analystTeams?.length ?? 0) === 0}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue
                          placeholder={
                            loadingAnalystTeams
                              ? "Carregando times..."
                              : (analystTeams?.length ?? 0) === 0
                                ? "Sem times associados"
                                : "Selecione um time"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {analystTeams?.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}{t.segment ? ` · ${t.segment}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={handleConfirmAssignment}
                    disabled={assigningAnalyst || !pendingAnalystId}
                  >
                    {assigningAnalyst ? "Salvando..." : "Confirmar"}
                  </Button>
                  {ticket.analyst_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={() => {
                        setEditingAnalyst(false);
                        setPendingAnalystId("");
                        setPendingTeamId("");
                      }}
                      disabled={assigningAnalyst}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {ticket.profiles?.full_name?.[0] || 'N'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col flex-1">
                  <span className="text-sm">{ticket.profiles?.full_name || 'Não atribuído'}</span>
                  {ticket.analyst_email && (
                    <span className="text-xs text-muted-foreground">{ticket.analyst_email}</span>
                  )}
                </div>
                {canAssignAnalyst && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setEditingAnalyst(true)}
                    title="Alterar analista"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
          
          <div>
            <Label className="text-xs text-muted-foreground">Time</Label>
            <p className="text-sm mt-1">{ticket.teams?.name || 'Não atribuído'}</p>
          </div>
          
          <Separator />
          
          <div>
            <Label className="text-xs text-muted-foreground">Contato</Label>
            <p className="text-sm mt-1">{ticket.contact_name}</p>
            <p className="text-xs text-muted-foreground">{ticket.contact_email}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
