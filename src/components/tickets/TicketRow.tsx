import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useTicketAge } from "@/hooks/useTicketAge";
import { calculateSLAStatus, getPriorityColor, getStatusColor } from "@/lib/ticketUtils";
import { cn } from "@/lib/utils";
import { User, Lock } from "lucide-react";

interface TicketRowProps {
  ticket: any;
  isSelected: boolean;
  onToggleSelect: () => void;
}

export function TicketRow({ ticket, isSelected, onToggleSelect }: TicketRowProps) {
  const navigate = useNavigate();
  const age = useTicketAge(ticket.created_at, ticket.resolved_at);
  const slaStatus = calculateSLAStatus(ticket);
  
  const handleRowClick = (e: React.MouseEvent) => {
    // Não navegar se clicar no checkbox
    if ((e.target as HTMLElement).closest('button')) return;
    navigate(`/tickets/${ticket.id}`);
  };
  
  return (
    <TableRow 
      className={cn(
        "cursor-pointer hover:bg-muted/50",
        isSelected && "bg-primary/5 border-l-4 border-l-primary"
      )}
      onClick={handleRowClick}
    >
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Checkbox 
          checked={isSelected}
          onCheckedChange={onToggleSelect}
        />
      </TableCell>
      <TableCell className="font-mono font-semibold">
        {ticket.ticket_number}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {age}
      </TableCell>
      <TableCell className="max-w-md truncate">
        {ticket.title}
      </TableCell>
      <TableCell>
        {ticket.clients?.name}
      </TableCell>
      <TableCell className="text-muted-foreground">
        <div className="flex items-center gap-2">
          {ticket.profiles?.full_name ? (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {ticket.profiles.full_name}
            </span>
          ) : (
            <span className="text-yellow-600 italic text-sm">Não atribuído</span>
          )}
          {ticket.lock_status === 'locked' && (
            <Lock className="h-3 w-3 text-amber-600" />
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
          {ticket.priority}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge className={getStatusColor(ticket.status)}>
          {ticket.status}
        </Badge>
      </TableCell>
      <TableCell>
        {slaStatus.type !== 'not-applicable' && (
          <Badge variant="outline" className={`${slaStatus.color} flex items-center gap-1`}>
            {slaStatus.icon}
            <span className="text-xs">{slaStatus.label}</span>
          </Badge>
        )}
      </TableCell>
    </TableRow>
  );
}
