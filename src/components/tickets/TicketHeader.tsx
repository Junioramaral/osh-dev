import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { calculateSLAStatus, getPriorityColor, getStatusColor } from "@/lib/ticketUtils";

interface TicketHeaderProps {
  ticket: any;
}

export default function TicketHeader({ ticket }: TicketHeaderProps) {
  const navigate = useNavigate();
  const slaStatus = calculateSLAStatus(ticket);

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/tickets')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{ticket.ticket_number}</h1>
            <p className="text-muted-foreground mt-1">{ticket.title}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
          <Badge className={getStatusColor(ticket.status)}>{ticket.status}</Badge>
          {slaStatus.type !== 'not-applicable' && (
            <Badge className={slaStatus.color}>
              {slaStatus.icon} {slaStatus.label}
            </Badge>
          )}
          {ticket.lock_status === 'locked' && ticket.lock_owner_id && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20">
              <Lock className="h-3 w-3 mr-1" />
              Assumido
            </Badge>
          )}
        </div>
      </div>
      
      <div className="flex gap-6 text-sm text-muted-foreground">
        <span>Cliente: <strong className="text-foreground">{ticket.clients?.name}</strong></span>
        <span>Criado: {format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm')}</span>
        <span>Contato: {ticket.contact_name} ({ticket.contact_email})</span>
      </div>
    </div>
  );
}
