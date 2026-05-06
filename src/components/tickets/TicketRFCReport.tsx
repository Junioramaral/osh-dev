import { useEffect, useState } from "react";
import { useTicketRFCSteps } from "@/hooks/useTicketDetail";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, CheckCircle2, Play, Loader2, Save, Send } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import RFCStepBuilder, { RFCStep } from "./RFCStepBuilder";

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

interface TicketRFCReportProps {
  ticket: any;
}

export default function TicketRFCReport({ ticket }: TicketRFCReportProps) {
  const ticketId = ticket.id;
  const { data: steps = [], isLoading } = useTicketRFCSteps(ticketId);
  const { isOtimizzoUser, isSuperAdmin, profile } = useAuth();
  const queryClient = useQueryClient();

  const isDraft = ticket.status === "rascunho" && (isOtimizzoUser || isSuperAdmin);

  const [editSteps, setEditSteps] = useState<RFCStep[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [submittingApproval, setSubmittingApproval] = useState(false);

  useEffect(() => {
    if (isDraft && steps.length > 0) {
      setEditSteps(
        steps.map((s: any) => ({
          id: s.id,
          descricao: s.descricao || "",
          procedimento: s.procedimento || "",
          scripts: s.scripts || "",
          ordem: s.ordem ?? 0,
        }))
      );
    } else if (isDraft) {
      setEditSteps([]);
    }
  }, [isDraft, steps]);

  const persistSteps = async () => {
    // Delete old steps then insert new ones
    const { error: delErr } = await supabase
      .from("rfc_steps" as any)
      .delete()
      .eq("ticket_id", ticketId);
    if (delErr) throw delErr;

    if (editSteps.length > 0) {
      const rows = editSteps.map((s, i) => ({
        ticket_id: ticketId,
        descricao: s.descricao,
        ordem: i,
        procedimento: s.procedimento || null,
        scripts: s.scripts || null,
      }));
      const { error: insErr } = await supabase.from("rfc_steps" as any).insert(rows);
      if (insErr) throw insErr;
    }
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["ticket-rfc-steps", ticketId] });
    queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
    queryClient.invalidateQueries({ queryKey: ["tickets"] });
  };

  const handleSave = async () => {
    if (editSteps.length === 0) {
      toast({ title: "Adicione ao menos um passo", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await persistSteps();
      toast({ title: "Passos atualizados com sucesso!" });
      invalidate();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestApproval = async () => {
    if (editSteps.length === 0) {
      toast({ title: "Adicione ao menos um passo", variant: "destructive" });
      return;
    }
    setSubmittingApproval(true);
    try {
      await persistSteps();

      const { data: { user } } = await supabase.auth.getUser();
      const { error: updErr } = await supabase
        .from("tickets")
        .update({ status: "aguardando_aprovacao" })
        .eq("id", ticketId);
      if (updErr) throw updErr;

      if (user) {
        await supabase.from("ticket_comments").insert({
          ticket_id: ticketId,
          author_id: user.id,
          content: `RFC enviada para aprovação por ${profile?.full_name || user.email}.`,
          is_internal: true,
        });
      }

      toast({ title: "RFC enviada para aprovação!" });
      invalidate();
    } catch (e: any) {
      toast({ title: "Erro ao solicitar aprovação", description: e.message, variant: "destructive" });
    } finally {
      setSubmittingApproval(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Draft editable mode for Otimizzo / Super admin
  if (isDraft) {
    return (
      <div className="space-y-4">
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Rascunho de RFC</p>
              <p className="text-xs text-muted-foreground">
                Edite os passos do plano de implementação. Quando estiver pronto, solicite aprovação.
              </p>
            </div>
            <Badge variant="outline">Rascunho</Badge>
          </div>
        </Card>

        <Card className="p-4">
          <RFCStepBuilder steps={editSteps} onStepsChange={setEditSteps} />
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={isSaving || submittingApproval || editSteps.length === 0}
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Alterações
          </Button>
          <Button
            onClick={handleRequestApproval}
            disabled={isSaving || submittingApproval || editSteps.length === 0}
          >
            {submittingApproval ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Solicitar Aprovação
          </Button>
        </div>
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">Nenhum passo RFC encontrado para este ticket.</p>
    );
  }

  const completedCount = steps.filter(s => s.status_concluido).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);
  const totalMinutes = steps.reduce((acc, s) => acc + getDurationMinutes(s.started_at, s.concluded_at), 0);

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <Card className="p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Progresso da RFC</span>
          <span className="text-muted-foreground">
            {completedCount}/{steps.length} passos ({progressPercent}%)
          </span>
        </div>
        <Progress value={progressPercent} className="h-2.5" />
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Tempo total de execução</span>
          <span className="font-semibold">{formatTotalDuration(totalMinutes)}</span>
        </div>
      </Card>

      {/* Time report table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Passo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-40">Início</TableHead>
              <TableHead className="w-40">Fim</TableHead>
              <TableHead className="w-24">Duração</TableHead>
              <TableHead className="w-36">Responsável</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {steps.map((step) => {
              const isDone = step.status_concluido;
              const isInProgress = !!step.started_at && !isDone;
              return (
                <TableRow key={step.id}>
                  <TableCell className="font-mono text-xs">
                    {String(step.ordem + 1).padStart(2, "0")}
                  </TableCell>
                  <TableCell className="text-sm">{step.descricao}</TableCell>
                  <TableCell>
                    {isDone ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-700 text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Concluído
                      </Badge>
                    ) : isInProgress ? (
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-700 text-xs">
                        <Play className="w-3 h-3 mr-1" />
                        Em andamento
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-700 text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        Pendente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {step.started_at
                      ? format(new Date(step.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {step.concluded_at
                      ? format(new Date(step.concluded_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {formatDuration(step.started_at, step.concluded_at)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {step.concluded_by_name || step.started_by_name || "—"}
                  </TableCell>
                </TableRow>
              );
            })}
            {/* Total row */}
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell colSpan={5} className="text-right text-sm">
                Tempo Total
              </TableCell>
              <TableCell className="text-sm">{formatTotalDuration(totalMinutes)}</TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
