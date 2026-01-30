import { differenceInMinutes } from "date-fns";
import { AlertTriangle, Clock, CheckCircle2, Check } from "lucide-react";

export type SLAStatus = {
  type: 'met' | 'on-time' | 'warning' | 'overdue' | 'not-applicable';
  label: string;
  color: string;
  icon: React.ReactNode;
  timeRemaining?: string;
  percentage?: number;
  borderClass?: string;
};

export const formatDuration = (minutes: number): string => {
  const absMinutes = Math.abs(minutes);
  const hours = Math.floor(absMinutes / 60);
  const mins = absMinutes % 60;
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  } else if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  } else {
    return `${mins}min`;
  }
};

export const calculateSLAStatus = (ticket: any): SLAStatus => {
  const now = new Date();
  
  if (ticket.status === 'resolvido' || ticket.status === 'fechado') {
    if (ticket.sla_first_response_met && ticket.sla_resolution_met) {
      return {
        type: 'met',
        label: 'SLA Atendido',
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: <Check className="h-3 w-3" />,
        borderClass: ''
      };
    }
  }
  
  if (!ticket.first_response_at && ticket.sla_first_response_deadline) {
    const deadline = new Date(ticket.sla_first_response_deadline);
    const createdAt = new Date(ticket.created_at);
    const totalTime = differenceInMinutes(deadline, createdAt);
    const elapsed = differenceInMinutes(now, createdAt);
    const remaining = differenceInMinutes(deadline, now);
    const percentage = Math.min((elapsed / totalTime) * 100, 100);
    
    if (remaining < 0) {
      return {
        type: 'overdue',
        label: 'SLA Vencido',
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: <AlertTriangle className="h-3 w-3" />,
        timeRemaining: `Venceu há ${formatDuration(Math.abs(remaining))}`,
        percentage: 100,
        borderClass: 'border-l-4 border-red-500'
      };
    } else if (percentage > 75) {
      return {
        type: 'warning',
        label: 'Atenção SLA',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: <Clock className="h-3 w-3" />,
        timeRemaining: `${formatDuration(remaining)} restantes`,
        percentage,
        borderClass: 'border-l-4 border-yellow-500'
      };
    } else {
      return {
        type: 'on-time',
        label: 'No Prazo',
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: <CheckCircle2 className="h-3 w-3" />,
        timeRemaining: `${formatDuration(remaining)} restantes`,
        percentage,
        borderClass: 'border-l-4 border-green-300'
      };
    }
  }
  
  if (ticket.first_response_at && !ticket.resolved_at && ticket.sla_resolution_deadline) {
    const deadline = new Date(ticket.sla_resolution_deadline);
    const createdAt = new Date(ticket.created_at);
    const totalTime = differenceInMinutes(deadline, createdAt);
    const elapsed = differenceInMinutes(now, createdAt);
    const remaining = differenceInMinutes(deadline, now);
    const percentage = Math.min((elapsed / totalTime) * 100, 100);
    
    if (remaining < 0) {
      return {
        type: 'overdue',
        label: 'SLA Vencido',
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: <AlertTriangle className="h-3 w-3" />,
        timeRemaining: `Venceu há ${formatDuration(Math.abs(remaining))}`,
        percentage: 100,
        borderClass: 'border-l-4 border-red-500'
      };
    } else if (percentage > 75) {
      return {
        type: 'warning',
        label: 'Atenção SLA',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: <Clock className="h-3 w-3" />,
        timeRemaining: `${formatDuration(remaining)} restantes`,
        percentage,
        borderClass: 'border-l-4 border-yellow-500'
      };
    } else {
      return {
        type: 'on-time',
        label: 'No Prazo',
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: <CheckCircle2 className="h-3 w-3" />,
        timeRemaining: `${formatDuration(remaining)} restantes`,
        percentage,
        borderClass: 'border-l-4 border-green-300'
      };
    }
  }
  
  return {
    type: 'not-applicable',
    label: 'SLA N/A',
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: <Clock className="h-3 w-3" />,
    borderClass: ''
  };
};

export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'P1':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'P2':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'P3':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'P4':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'novo':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'em_atendimento':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'aguardando_cliente':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'resolvido':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'fechado':
      return 'bg-gray-100 text-gray-800 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export const getStatusLabel = (status: string) => {
  switch (status) {
    case 'novo':
      return 'Novo';
    case 'em_atendimento':
      return 'Em Atendimento';
    case 'aguardando_cliente':
      return 'Aguardando Cliente';
    case 'resolvido':
      return 'Resolvido';
    case 'fechado':
      return 'Fechado';
    default:
      return status;
  }
};

export const getTicketTypeLabel = (type: string): string => {
  switch (type) {
    case 'incidente':
      return 'Incidente';
    case 'duvida':
      return 'Dúvida';
    case 'problema':
      return 'Problema';
    case 'service_request':
    case 'solicitacao':
      return 'Service Request';
    default:
      return type;
  }
};
