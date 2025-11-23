import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useTicketAge } from "@/hooks/useTicketAge";
import { calculateSLAStatus, getPriorityColor, getStatusColor } from "@/lib/ticketUtils";

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
      className="cursor-pointer hover:bg-muted/50"
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
