import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Plus, RefreshCw, UserPlus, MessageSquare, CheckCircle, Clock, Activity } from "lucide-react";
import { useTicketHistory, useTicketComments, useTicketTimeLogs } from "@/hooks/useTicketDetail";
import { useMemo } from "react";
import { formatSmartDate } from "@/lib/dateUtils";
interface TimelineItemProps {
  event: any;
}

function TimelineItem({ event }: TimelineItemProps) {
  const getIcon = () => {
    switch (event.type) {
      case 'created': return <Plus className="h-4 w-4" />;
      case 'status_changed': return <RefreshCw className="h-4 w-4" />;
      case 'assigned': return <UserPlus className="h-4 w-4" />;
      case 'commented': return <MessageSquare className="h-4 w-4" />;
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      case 'time_logged': return <Clock className="h-4 w-4" />;
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
      default: return event.action_type || event.type;
    }
  };
  
  const getBgColor = () => {
    if (event.type === 'resolved' || event.type === 'first_response') return 'bg-green-100 border-green-500';
    if (event.type === 'commented') return 'bg-blue-100 border-blue-500';
    return 'bg-background border-border';
  };
  
  return (
    <div className="relative flex gap-4 items-start">
      <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 ${getBgColor()}`}>
        {getIcon()}
      </div>
      
      <div className="flex-1 pb-6">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">{getLabel()}</p>
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
      </div>
    </div>
  );
}

interface TicketTimelineProps {
  ticketId: string;
}

export default function TicketTimeline({ ticketId }: TicketTimelineProps) {
  const { data: history } = useTicketHistory(ticketId);
  const { data: comments } = useTicketComments(ticketId);
  const { data: timeLogs } = useTicketTimeLogs(ticketId);
  
  const events = useMemo(() => {
    const allEvents: any[] = [
      ...(history || []).map(h => ({ ...h, type: h.action_type })),
      ...(comments || []).map(c => ({ ...c, type: 'commented' })),
      ...(timeLogs || []).map(t => ({ ...t, type: 'time_logged', created_at: t.logged_at }))
    ];
    
    return allEvents.sort((a, b) => 
      new Date(b.created_at || b.logged_at).getTime() - new Date(a.created_at || a.logged_at).getTime()
    );
  }, [history, comments, timeLogs]);
  
  return (
    <ScrollArea className="h-[600px]">
      <div className="relative space-y-4 p-6">
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
        
        {events.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum evento registrado</p>
        ) : (
          events.map((event, index) => (
            <TimelineItem key={event.id || index} event={event} />
          ))
        )}
      </div>
    </ScrollArea>
  );
}
