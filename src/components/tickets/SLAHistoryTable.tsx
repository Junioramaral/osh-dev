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
import { CheckCircle2, XCircle, Clock } from "lucide-react";

interface SLAHistoryTableProps {
  ticket: any;
}

export default function SLAHistoryTable({ ticket }: SLAHistoryTableProps) {
  const createdAt = new Date(ticket.created_at);
  const firstResponseAt = ticket.first_response_at ? new Date(ticket.first_response_at) : null;
  const firstResponseDeadline = ticket.sla_first_response_deadline ? new Date(ticket.sla_first_response_deadline) : null;
  const resolvedAt = ticket.resolved_at ? new Date(ticket.resolved_at) : null;
  const resolutionDeadline = ticket.sla_resolution_deadline ? new Date(ticket.sla_resolution_deadline) : null;
  
  // Calcular tempo decorrido e percentual usado
  const calculateSLAUsage = (startTime: Date, actualTime: Date | null, deadlineTime: Date | null) => {
    if (!deadlineTime) return { time: "-", percentage: "-", status: "pending" };
    
    const endTime = actualTime || new Date();
    const elapsed = endTime.getTime() - startTime.getTime();
    const total = deadlineTime.getTime() - startTime.getTime();
    const percentage = ((elapsed / total) * 100).toFixed(1);
    
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    
    const timeStr = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
    
    let status = "pending";
    if (actualTime && deadlineTime) {
      status = actualTime <= deadlineTime ? "met" : "missed";
    } else if (!actualTime) {
      status = new Date() > deadlineTime ? "overdue" : "pending";
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
  
  const slaRows = [
    {
      type: "Primeira Resposta",
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
      type: "Resolução",
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
  );
}
