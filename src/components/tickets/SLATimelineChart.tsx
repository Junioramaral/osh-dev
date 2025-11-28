import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Clock, AlertCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SLATimelineChartProps {
  ticket: any;
}

interface TimelineEvent {
  label: string;
  time: Date | null;
  deadline?: Date | null;
  status: 'completed' | 'pending' | 'warning' | 'overdue';
  description: string;
}

export default function SLATimelineChart({ ticket }: SLATimelineChartProps) {
  const createdAt = new Date(ticket.created_at);
  const firstResponseAt = ticket.first_response_at ? new Date(ticket.first_response_at) : null;
  const firstResponseDeadline = ticket.sla_first_response_deadline ? new Date(ticket.sla_first_response_deadline) : null;
  const resolvedAt = ticket.resolved_at ? new Date(ticket.resolved_at) : null;
  const resolutionDeadline = ticket.sla_resolution_deadline ? new Date(ticket.sla_resolution_deadline) : null;
  
  // Determinar status da primeira resposta
  let firstResponseStatus: 'completed' | 'pending' | 'warning' | 'overdue' = 'pending';
  if (firstResponseAt && firstResponseDeadline) {
    firstResponseStatus = firstResponseAt <= firstResponseDeadline ? 'completed' : 'overdue';
  } else if (!firstResponseAt && firstResponseDeadline) {
    const now = new Date();
    if (now > firstResponseDeadline) {
      firstResponseStatus = 'overdue';
    } else {
      const timeRemaining = (firstResponseDeadline.getTime() - now.getTime()) / (firstResponseDeadline.getTime() - createdAt.getTime());
      firstResponseStatus = timeRemaining < 0.25 ? 'warning' : 'pending';
    }
  }
  
  // Determinar status da resolução
  let resolutionStatus: 'completed' | 'pending' | 'warning' | 'overdue' = 'pending';
  if (resolvedAt && resolutionDeadline) {
    resolutionStatus = resolvedAt <= resolutionDeadline ? 'completed' : 'overdue';
  } else if (!resolvedAt && resolutionDeadline) {
    const now = new Date();
    if (now > resolutionDeadline) {
      resolutionStatus = 'overdue';
    } else {
      const timeRemaining = (resolutionDeadline.getTime() - now.getTime()) / (resolutionDeadline.getTime() - createdAt.getTime());
      resolutionStatus = timeRemaining < 0.25 ? 'warning' : 'pending';
    }
  }
  
  const events: TimelineEvent[] = [
    {
      label: "Criação",
      time: createdAt,
      status: 'completed',
      description: "Ticket aberto",
    },
    {
      label: "Primeira Resposta",
      time: firstResponseAt,
      deadline: firstResponseDeadline,
      status: firstResponseStatus,
      description: firstResponseAt 
        ? `Respondido em ${format(firstResponseAt, "dd/MM/yyyy HH:mm", { locale: ptBR })}`
        : "Aguardando primeira resposta",
    },
    {
      label: "Prazo 1ª Resposta",
      time: firstResponseDeadline,
      status: firstResponseStatus === 'completed' ? 'completed' : firstResponseStatus,
      description: firstResponseDeadline
        ? `Prazo: ${format(firstResponseDeadline, "dd/MM/yyyy HH:mm", { locale: ptBR })}`
        : "Sem prazo definido",
    },
    {
      label: "Resolução",
      time: resolvedAt,
      deadline: resolutionDeadline,
      status: resolutionStatus,
      description: resolvedAt
        ? `Resolvido em ${format(resolvedAt, "dd/MM/yyyy HH:mm", { locale: ptBR })}`
        : "Aguardando resolução",
    },
    {
      label: "Prazo Resolução",
      time: resolutionDeadline,
      status: resolutionStatus === 'completed' ? 'completed' : resolutionStatus,
      description: resolutionDeadline
        ? `Prazo: ${format(resolutionDeadline, "dd/MM/yyyy HH:mm", { locale: ptBR })}`
        : "Sem prazo definido",
    },
  ];
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-warning" />;
      case 'overdue':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success/20 border-success';
      case 'warning':
        return 'bg-warning/20 border-warning';
      case 'overdue':
        return 'bg-destructive/20 border-destructive';
      default:
        return 'bg-muted border-border';
    }
  };
  
  return (
    <div className="relative">
      {/* Linha vertical */}
      <div className="absolute left-[18px] top-8 bottom-8 w-0.5 bg-border" />
      
      {/* Eventos */}
      <div className="space-y-8">
        {events.map((event, index) => (
          <div key={index} className="relative flex gap-4">
            {/* Ícone */}
            <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 ${getStatusColor(event.status)}`}>
              {getStatusIcon(event.status)}
            </div>
            
            {/* Conteúdo */}
            <div className="flex-1 pb-8">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold">{event.label}</h4>
                {event.time && (
                  <Badge variant="outline" className="text-xs">
                    {format(event.time, "dd/MM HH:mm", { locale: ptBR })}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{event.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
