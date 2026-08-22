import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, UserPlus, MessageSquare, CheckCircle, Clock, Activity, Pencil, Trash2, AlertTriangle, Play, Timer, ChevronDown, ChevronUp } from "lucide-react";
import { useTicketHistory, useTicketComments, useTicketTimeLogs, useTicketRFCSteps } from "@/hooks/useTicketDetail";
import { useMemo } from "react";
import { formatSmartDate } from "@/lib/dateUtils";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { getTimeLogPermissions } from "@/lib/timeLogPermissions";
import { TimeLogEditDialog } from "./TimeLogEditDialog";
import { TimeLogDeleteDialog } from "./TimeLogDeleteDialog";

interface TimelineItemProps {
  event: any;
  ticketId: string;
  onEdit?: (log: any) => void;
  onDelete?: (log: any) => void;
  permissions?: { canEdit: boolean; canDelete: boolean; reason?: string };
}

function TimelineItem({ event, ticketId, onEdit, onDelete, permissions }: TimelineItemProps) {
  const [expanded, setExpanded] = useState(false);
  const isRFCEvent = event.type === 'rfc_step_started' || event.type === 'rfc_step_completed';
  const hasObservacao = isRFCEvent && event.observacao;

  const getIcon = () => {
    switch (event.type) {
      case 'created': return <Plus className="h-4 w-4" />;
      case 'status_changed': return <RefreshCw className="h-4 w-4" />;
      case 'assigned': return <UserPlus className="h-4 w-4" />;
      case 'commented': return <MessageSquare className="h-4 w-4" />;
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      case 'time_logged': return <Clock className="h-4 w-4" />;
      case 'rfc_step_started': return <Play className="h-4 w-4" />;
      case 'rfc_step_completed': return <Timer className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };
  
  const getLabel = () => {
    switch (event.type) {
      case 'created': return 'Ticket criado';
      case 'status_changed': return `Status alterado de "${event.old_value}" para "${event.new_value}"`;
      case 'assigned': return 'Ticket atribuído';
      case 'priority_changed': return `Prioridade alterada de "${event.old_value}" para "${event.new_value}"`;
      case 'first_response': return 'Primeira resposta registrada';
      case 'resolved': return 'Ticket resolvido';
      case 'commented': return 'Novo comentário adicionado';
      case 'time_logged': return `${event.hours}h registradas`;
      case 'rfc_step_started': return event.label;
      case 'rfc_step_completed': return event.label;
      default: return event.action_type || event.type;
    }
  };
  
  const getBgColor = () => {
    if (event.type === 'resolved' || event.type === 'first_response') return 'bg-green-100 border-green-500';
    if (event.type === 'commented') return 'bg-blue-100 border-blue-500';
    if (event.type === 'time_logged') return 'bg-orange-100 border-orange-500';
    if (event.type === 'rfc_step_started') return 'bg-amber-100 border-amber-500';
    if (event.type === 'rfc_step_completed') return 'bg-emerald-100 border-emerald-500';
    return 'bg-background border-border';
  };

  const isTimeLog = event.type === 'time_logged';
  const showActions = isTimeLog && permissions && (permissions.canEdit || permissions.canDelete);
  const showReasonMessage = isTimeLog && permissions && !permissions.canEdit && !permissions.canDelete && permissions.reason;
  
  return (
    <div className="relative flex gap-4 items-start">
      <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 ${getBgColor()}`}>
        {getIcon()}
      </div>
      
      <div className="flex-1 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <p className="font-medium text-sm">{getLabel()}</p>
            {hasObservacao && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {formatSmartDate(event.created_at || event.logged_at)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {event.profiles?.full_name || 'Sistema'}
        </p>
        {event.content && (
          <Card className="mt-2 p-3 text-sm bg-muted/50">
            {event.content}
          </Card>
        )}
        {event.description && (
          <Card className="mt-2 p-3 text-sm bg-muted/50">
            {event.description}
          </Card>
        )}
        {hasObservacao && expanded && (
          <Card className="mt-2 p-3 text-sm bg-muted/50">
            <p className="text-xs font-medium text-muted-foreground mb-1">Observação:</p>
            {event.observacao}
          </Card>
        )}
        
        {/* Actions for time logs */}
        {showActions && (
          <div className="flex items-center gap-2 mt-2">
            {permissions.canEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onEdit?.(event)}
              >
                <Pencil className="h-3 w-3 mr-1" />
                Editar
              </Button>
            )}
            {permissions.canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                onClick={() => onDelete?.(event)}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Excluir
              </Button>
            )}
          </div>
        )}
        
        {/* Reason message when cannot edit */}
        {showReasonMessage && (
          <div className="flex items-center gap-1 mt-2 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            {permissions.reason}
          </div>
        )}
      </div>
    </div>
  );
}

interface TicketTimelineProps {
  ticketId: string;
  clientId: string;
  recordType?: string;
}

export default function TicketTimeline({ ticketId, clientId, recordType }: TicketTimelineProps) {
  const { data: history } = useTicketHistory(ticketId);
  const { data: comments } = useTicketComments(ticketId);
  const { data: timeLogs } = useTicketTimeLogs(ticketId);
  const { data: rfcSteps } = useTicketRFCSteps(recordType === 'rfc' ? ticketId : undefined);
  const { profile } = useAuth();
  const { isTenantAdmin, isTenantStaff } = useTenant();
  
  const [editLog, setEditLog] = useState<any>(null);
  const [deleteLog, setDeleteLog] = useState<any>(null);
  
  const events = useMemo(() => {
    const allEvents: any[] = [
      ...(history || []).map(h => ({ ...h, type: h.action_type })),
      ...(comments || []).map(c => ({ ...c, type: 'commented' })),
      ...(timeLogs || []).map(t => ({ ...t, type: 'time_logged', created_at: t.logged_at }))
    ];

    // Add RFC step events
    if (rfcSteps) {
      rfcSteps.forEach(step => {
        if (step.started_at) {
          allEvents.push({
            id: `rfc-start-${step.id}`,
            type: 'rfc_step_started',
            created_at: step.started_at,
            label: `Passo ${step.ordem + 1} iniciado: ${step.descricao}`,
            profiles: step.started_by_name ? { full_name: step.started_by_name } : null,
          });
        }
        if (step.concluded_at && step.status_concluido) {
          const durationLabel = (() => {
            if (!step.started_at) return '';
            const diffMs = new Date(step.concluded_at).getTime() - new Date(step.started_at).getTime();
            if (diffMs < 0) return '';
            const totalMin = Math.round(diffMs / 60000);
            if (totalMin < 60) return ` (duração: ${totalMin}min)`;
            const h = Math.floor(totalMin / 60);
            const m = totalMin % 60;
            return m > 0 ? ` (duração: ${h}h ${m}min)` : ` (duração: ${h}h)`;
          })();
          allEvents.push({
            id: `rfc-done-${step.id}`,
            type: 'rfc_step_completed',
            created_at: step.concluded_at,
            label: `Passo ${step.ordem + 1} concluído: ${step.descricao}${durationLabel}`,
            observacao: step.observacao,
            profiles: step.concluded_by_name ? { full_name: step.concluded_by_name } : null,
          });
        }
      });
    }
    
    return allEvents.sort((a, b) => 
      new Date(b.created_at || b.logged_at).getTime() - new Date(a.created_at || a.logged_at).getTime()
    );
  }, [history, comments, timeLogs, rfcSteps]);

  const getPermissionsForLog = (log: any) => {
    if (log.type !== 'time_logged') return undefined;
    
    // Only show actions for tenant staff (analysts can only edit their own)
    if (!isTenantStaff && !isTenantAdmin) return { canEdit: false, canDelete: false };

    return getTimeLogPermissions(
      { analyst_id: log.analyst_id, logged_at: log.logged_at },
      profile?.id,
      isTenantAdmin
    );
  };

  const handleEdit = (log: any) => {
    setEditLog({
      id: log.id,
      hours: log.hours,
      description: log.description,
      logged_at: log.logged_at,
      ticketId,
      clientId,
      project_id: log.project_id,
      work_date: log.work_date,
      start_time: log.start_time,
      end_time: log.end_time,
    });
  };

  const handleDelete = (log: any) => {
    setDeleteLog({
      id: log.id,
      hours: log.hours,
      description: log.description,
      logged_at: log.logged_at,
      ticketId,
    });
  };
  
  return (
    <>
      <ScrollArea className="h-[600px]">
        <div className="relative space-y-4 p-6">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
          
          {events.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum evento registrado</p>
          ) : (
            events.map((event, index) => (
              <TimelineItem 
                key={event.id || index} 
                event={event}
                ticketId={ticketId}
                onEdit={handleEdit}
                onDelete={handleDelete}
                permissions={getPermissionsForLog(event)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Edit Dialog */}
      <TimeLogEditDialog
        open={!!editLog}
        onOpenChange={(open) => !open && setEditLog(null)}
        log={editLog}
      />

      {/* Delete Dialog */}
      <TimeLogDeleteDialog
        open={!!deleteLog}
        onOpenChange={(open) => !open && setDeleteLog(null)}
        log={deleteLog}
      />
    </>
  );
}
