import { useTicketRFCSteps } from "@/hooks/useTicketDetail";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, CheckCircle2, Play, Loader2 } from "lucide-react";
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

interface TicketRFCReportProps {
  ticketId: string;
}

export default function TicketRFCReport({ ticketId }: TicketRFCReportProps) {
  const { data: steps = [], isLoading } = useTicketRFCSteps(ticketId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
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
