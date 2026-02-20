import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { useTicketAge } from "@/hooks/useTicketAge";
import { calculateSLAStatus, getPriorityColor, getStatusColor } from "@/lib/ticketUtils";
import { cn } from "@/lib/utils";
import { User, Lock, Users, ListOrdered, Clock } from "lucide-react";

const formatBrazilDateTime = (isoString: string): string => {
  return new Date(isoString).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).replace(',', ' às');
};

interface TicketRowProps {
  ticket: any;
  isSelected: boolean;
  onToggleSelect: () => void;
  showClientColumn?: boolean;
}

export function TicketRow({ ticket, isSelected, onToggleSelect, showClientColumn = true }: TicketRowProps) {
  const navigate = useNavigate();
  const age = useTicketAge(ticket.created_at, ticket.resolved_at);
  const slaStatus = calculateSLAStatus(ticket);
  
  // Verificar se o ticket está resolvido ou fechado para aplicar estilo diferenciado
  const isClosedTicket = ticket.status === 'resolvido' || ticket.status === 'fechado';
  
  // Verificar se o ticket foi desbloqueado por inatividade
  const wasUnlockedByInactivity = ticket.unlocked_at !== null;
  
  const formatUnlockedDate = (isoString: string): string => {
    return new Date(isoString).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).replace(',', ' às');
  };
  
  const handleRowClick = (e: React.MouseEvent) => {
    // Não navegar se clicar no checkbox
    if ((e.target as HTMLElement).closest('button')) return;
    navigate(`/tickets/${ticket.id}`);
  };
  
  return (
    <TableRow 
      className={cn(
        "cursor-pointer hover:bg-muted/50",
        isSelected && "bg-primary/5 border-l-4 border-l-primary",
        isClosedTicket && "opacity-60 bg-muted/30",
        wasUnlockedByInactivity && !isClosedTicket && "bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-l-yellow-500"
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
      <TableCell className="max-w-md">
        <div className="flex items-center gap-2">
          {ticket.record_type === 'rfc' && (
            <Badge
              variant="outline"
              className="border-violet-400 bg-violet-50 text-violet-700 dark:border-violet-500 dark:bg-violet-950 dark:text-violet-300 shrink-0 font-bold text-xs"
            >
              RFC
            </Badge>
          )}
          <span className="truncate">{ticket.title}</span>
        </div>
      </TableCell>
      {showClientColumn && (
        <TableCell>
          {ticket.clients?.name}
        </TableCell>
      )}
      <TableCell className="text-muted-foreground">
        <div className="flex flex-col gap-1">
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
          {wasUnlockedByInactivity && !isClosedTicket && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline" 
                  className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700 gap-1 w-fit text-xs"
                >
                  <Clock className="h-3 w-3" />
                  Retornou à fila
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Desbloqueado por inatividade em {formatUnlockedDate(ticket.unlocked_at)}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TableCell>
      <TableCell>
        {ticket.teams ? (
          <Badge 
            variant="outline" 
            className={cn(
              "flex items-center gap-1 w-fit",
              ticket.teams.segment === 'DB' 
                ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-950 dark:text-blue-300' 
                : 'border-green-300 bg-green-50 text-green-700 dark:border-green-600 dark:bg-green-950 dark:text-green-300'
            )}
          >
            <Users className="h-3 w-3" />
            {ticket.teams.name}
          </Badge>
        ) : (
          <span className="text-muted-foreground italic text-sm">Sem time</span>
        )}
      </TableCell>
      <TableCell>
        {ticket.queues ? (
          <Badge 
            variant="outline" 
            className="flex items-center gap-1 w-fit border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-600 dark:bg-purple-950 dark:text-purple-300"
          >
            <ListOrdered className="h-3 w-3" />
            {ticket.queues.name}
          </Badge>
        ) : (
          <span className="text-muted-foreground italic text-sm">Sem fila</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
          {ticket.priority}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <Badge className={getStatusColor(ticket.status)}>
            {ticket.status}
          </Badge>
          
          {isClosedTicket && ticket.resolved_at && (
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div>{formatBrazilDateTime(ticket.resolved_at)}</div>
              {ticket.resolved_by && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="truncate max-w-[120px]">
                      Por: {ticket.resolved_by}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{ticket.resolved_by}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </div>
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
