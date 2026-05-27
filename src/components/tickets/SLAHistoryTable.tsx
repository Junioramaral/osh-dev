import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Pause, Sliders } from "lucide-react";
import { isBusinessHoursPriority, calculateBusinessMinutes, DEFAULT_BUSINESS_HOURS } from "@/lib/businessHours";
import { useTicketSLAPauses } from "@/hooks/useTicketSLAPauses";
import { getStatusLabel } from "@/lib/ticketUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface SLAHistoryTableProps {
  ticket: any;
}

export default function SLAHistoryTable({ ticket }: SLAHistoryTableProps) {
  const { data: pauses = [] } = useTicketSLAPauses(ticket.id);
  const createdAt = new Date(ticket.created_at);
  const firstResponseAt = ticket.first_response_at ? new Date(ticket.first_response_at) : null;
  const firstResponseDeadline = ticket.sla_first_response_deadline ? new Date(ticket.sla_first_response_deadline) : null;
  const resolvedAt = ticket.resolved_at ? new Date(ticket.resolved_at) : null;
  const resolutionDeadline = ticket.sla_resolution_deadline ? new Date(ticket.sla_resolution_deadline) : null;
  const useBusinessHours = isBusinessHoursPriority(ticket.priority);
  
  const calculateSLAUsage = (startTime: Date, actualTime: Date | null, deadlineTime: Date | null) => {
    if (!deadlineTime) return { time: "-", percentage: "-", status: "pending" };
    
    const endTime = actualTime || new Date();
    
    let elapsed: number, total: number;
    
    if (useBusinessHours) {
      elapsed = calculateBusinessMinutes(startTime, endTime, DEFAULT_BUSINESS_HOURS);
      total = calculateBusinessMinutes(startTime, deadlineTime, DEFAULT_BUSINESS_HOURS);
    } else {
      elapsed = endTime.getTime() - startTime.getTime();
      total = deadlineTime.getTime() - startTime.getTime();
      // Convert to minutes for display
      elapsed = Math.floor(elapsed / (1000 * 60));
      total = Math.floor(total / (1000 * 60));
    }
    
    const percentage = total > 0 ? ((elapsed / total) * 100).toFixed(1) : "0.0";
    
    const hours = Math.floor(elapsed / 60);
    const minutes = elapsed % 60;
    const timeStr = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
    
    let status = "pending";
    if (actualTime && deadlineTime) {
      status = actualTime <= deadlineTime ? "met" : "missed";
    } else if (!actualTime) {
      if (useBusinessHours) {
        status = elapsed > total ? "overdue" : "pending";
      } else {
        status = new Date() > deadlineTime ? "overdue" : "pending";
      }
    }
    
    return { time: timeStr, percentage: `${percentage}%`, status };
  };
  
  const firstResponseData = calculateSLAUsage(createdAt, firstResponseAt, firstResponseDeadline);
  const resolutionData = calculateSLAUsage(createdAt, resolvedAt, resolutionDeadline);
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "met":
        return (
          <Badge variant="outline" className="gap-1 border-success text-success">
            <CheckCircle2 className="h-3 w-3" />
            Atendido
          </Badge>
        );
      case "missed":
        return (
          <Badge variant="outline" className="gap-1 border-destructive text-destructive">
            <XCircle className="h-3 w-3" />
            Não Atendido
          </Badge>
        );
      case "overdue":
        return (
          <Badge variant="outline" className="gap-1 border-destructive text-destructive">
            <XCircle className="h-3 w-3" />
            Vencido
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Em Andamento
          </Badge>
        );
    }
  };
  
  const slaTypeLabel = useBusinessHours ? " (HU)" : "";

  const originalFR = ticket.sla_first_response_deadline_original
    ? format(new Date(ticket.sla_first_response_deadline_original), "dd/MM/yyyy HH:mm", { locale: ptBR })
    : null;
  const originalRes = ticket.sla_resolution_deadline_original
    ? format(new Date(ticket.sla_resolution_deadline_original), "dd/MM/yyyy HH:mm", { locale: ptBR })
    : null;

  const wasAdjusted = !!ticket.sla_adjusted_at;
  const pausedMinutes = ticket.sla_paused_total_minutes || 0;
  const currentlyPaused = !!ticket.sla_paused_at;
  
  const slaRows = [
    {
      type: `Primeira Resposta${slaTypeLabel}`,
      originalDeadline: firstResponseDeadline 
        ? format(firstResponseDeadline, "dd/MM/yyyy HH:mm", { locale: ptBR })
        : "-",
      actualTime: firstResponseAt 
        ? format(firstResponseAt, "dd/MM/yyyy HH:mm", { locale: ptBR })
        : "-",
      timeUsed: firstResponseData.time,
      percentageUsed: firstResponseData.percentage,
      status: firstResponseData.status,
    },
    {
      type: `Resolução${slaTypeLabel}`,
      originalDeadline: resolutionDeadline 
        ? format(resolutionDeadline, "dd/MM/yyyy HH:mm", { locale: ptBR })
        : "-",
      actualTime: resolvedAt 
        ? format(resolvedAt, "dd/MM/yyyy HH:mm", { locale: ptBR })
        : "-",
      timeUsed: resolutionData.time,
      percentageUsed: resolutionData.percentage,
      status: resolutionData.status,
    },
  ];
  
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
      {useBusinessHours && (
          <Badge variant="secondary" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            SLA em Horas Úteis (09:00-18:00, Seg-Sex)
          </Badge>
      )}
        {currentlyPaused && (
          <Badge variant="outline" className="text-xs gap-1 border-slate-400 text-slate-700">
            <Pause className="h-3 w-3" />
            SLA Pausado agora
          </Badge>
        )}
        {pausedMinutes > 0 && (
          <Badge variant="outline" className="text-xs gap-1">
            <Pause className="h-3 w-3" />
            Total pausado: {Math.floor(pausedMinutes / 60)}h {pausedMinutes % 60}min
          </Badge>
        )}
        {wasAdjusted && (
          <Badge variant="outline" className="text-xs gap-1 border-amber-500 text-amber-700">
            <Sliders className="h-3 w-3" />
            SLA Ajustado Manualmente
          </Badge>
        )}
      </div>

      {wasAdjusted && ticket.sla_adjustment_reason && (
        <div className="mb-3 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs">
          <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1">
            Motivo do ajuste:
          </p>
          <p className="text-amber-700 dark:text-amber-400 whitespace-pre-wrap">
            {ticket.sla_adjustment_reason}
          </p>
          {ticket.sla_adjusted_at && (
            <p className="text-amber-600 dark:text-amber-500 mt-1">
              Em {format(new Date(ticket.sla_adjusted_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </p>
          )}
          {(originalFR || originalRes) && (
            <p className="text-amber-600 dark:text-amber-500 mt-1">
              Prazo original: 1ª resp. {originalFR || "-"} / resolução {originalRes || "-"}
            </p>
          )}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo de SLA</TableHead>
            <TableHead>Prazo Original</TableHead>
            <TableHead>Tempo Real</TableHead>
            <TableHead>Tempo Usado</TableHead>
            <TableHead>% Usado</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {slaRows.map((row, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{row.type}</TableCell>
              <TableCell>{row.originalDeadline}</TableCell>
              <TableCell>{row.actualTime}</TableCell>
              <TableCell>{row.timeUsed}</TableCell>
              <TableCell>{row.percentageUsed}</TableCell>
              <TableCell>{getStatusBadge(row.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {pauses.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Pause className="h-4 w-4" />
            Histórico de Pausas do SLA
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  Para P3/P4 contamos apenas horário útil (09–18, dias úteis). Para P1/P2 o tempo é corrido (24x7).
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pausado em</TableHead>
                <TableHead>Status durante pausa</TableHead>
                <TableHead>Retomado em</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Descontado do SLA</TableHead>
                <TableHead>Pausado por</TableHead>
                <TableHead>Retomado por</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                let totalDiscounted = 0;
                const rows = pauses.map((p) => {
                const pausedAt = new Date(p.paused_at);
                const resumedAt = p.resumed_at ? new Date(p.resumed_at) : null;
                const minutes =
                  p.pause_minutes ??
                  (resumedAt
                    ? Math.max(0, Math.floor((resumedAt.getTime() - pausedAt.getTime()) / 60000))
                    : Math.max(0, Math.floor((Date.now() - pausedAt.getTime()) / 60000)));
                const h = Math.floor(minutes / 60);
                const m = minutes % 60;
                const durationStr = h > 0 ? `${h}h ${m}min` : `${m}min`;
                const endP = resumedAt || new Date();
                const discountedMin = useBusinessHours
                  ? calculateBusinessMinutes(pausedAt, endP, DEFAULT_BUSINESS_HOURS)
                  : minutes;
                totalDiscounted += discountedMin;
                const dh = Math.floor(discountedMin / 60);
                const dm = discountedMin % 60;
                const discountedStr = dh > 0 ? `${dh}h ${dm}min` : `${dm}min`;
                return (
                  <TableRow key={p.id}>
                    <TableCell>{format(pausedAt, "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getStatusLabel(p.status_during_pause)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {resumedAt ? (
                        format(resumedAt, "dd/MM/yyyy HH:mm", { locale: ptBR })
                      ) : (
                        <Badge variant="outline" className="text-xs gap-1 border-slate-400 text-slate-700">
                          <Pause className="h-3 w-3" />
                          Em pausa
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{durationStr}</TableCell>
                    <TableCell className="font-medium">
                      {discountedStr}
                      {!resumedAt && (
                        <span className="ml-2 text-xs text-muted-foreground">(em curso)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.paused_by_name || "Sistema"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {resumedAt ? (p.resumed_by_name || "Sistema") : "-"}
                    </TableCell>
                  </TableRow>
                );
                });
                const th = Math.floor(totalDiscounted / 60);
                const tm = totalDiscounted % 60;
                const totalStr = th > 0 ? `${th}h ${tm}min` : `${tm}min`;
                return (
                  <>
                    {rows}
                    <TableRow className="bg-muted/40">
                      <TableCell colSpan={4} className="text-right font-semibold">
                        Total descontado do SLA
                      </TableCell>
                      <TableCell className="font-semibold">{totalStr}</TableCell>
                      <TableCell colSpan={2} />
                    </TableRow>
                  </>
                );
              })()}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
