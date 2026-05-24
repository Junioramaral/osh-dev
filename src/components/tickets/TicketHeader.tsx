import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Trash2, Pause, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { calculateSLAStatus, getPriorityColor, getStatusColor } from "@/lib/ticketUtils";
import { useAuth } from "@/contexts/AuthContext";
import { useDeleteTickets } from "@/hooks/useDeleteTickets";
import { DeleteTicketDialog } from "@/components/tickets/DeleteTicketDialog";

interface TicketHeaderProps {
  ticket: any;
}

export default function TicketHeader({ ticket }: TicketHeaderProps) {
  const navigate = useNavigate();
  const { isSuperAdmin, isTenantAdmin } = useAuth();
  const deleteTickets = useDeleteTickets();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const slaStatus = calculateSLAStatus(ticket);
  const canDelete = isSuperAdmin || isTenantAdmin;

  const handleDelete = () => {
    deleteTickets.mutate([ticket.id], {
      onSuccess: () => {
        navigate('/tickets');
      },
    });
    setShowDeleteDialog(false);
  };

  return (
    <>
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
          <div className="flex gap-2 items-center">
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
            {ticket.sla_paused_at && (
              <Badge variant="outline" className="bg-slate-200 text-slate-800 border-slate-400">
                <Pause className="h-3 w-3 mr-1" />
                SLA Pausado
              </Badge>
            )}
            {ticket.sla_adjusted_at && (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                <Sliders className="h-3 w-3 mr-1" />
                SLA Ajustado
              </Badge>
            )}
            {canDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex gap-6 text-sm text-muted-foreground">
          <span>Cliente: <strong className="text-foreground">{ticket.clients?.name}</strong></span>
          <span>Criado: {format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm')}</span>
          <span>Contato: {ticket.contact_name} ({ticket.contact_email})</span>
        </div>
      </div>

      <DeleteTicketDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        ticketCount={1}
        onConfirm={handleDelete}
        isDeleting={deleteTickets.isPending}
      />
    </>
  );
}
