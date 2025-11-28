import { Card, CardContent } from "@/components/ui/card";
import { Clock, Target, Pause, TrendingUp } from "lucide-react";
import { differenceInMinutes, differenceInHours } from "date-fns";

interface SLAMetricsCardsProps {
  ticket: any;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  if (days > 0) {
    return `${days}d ${remainingHours}h`;
  } else if (hours > 0) {
    return `${hours}h ${remainingMinutes}min`;
  } else {
    return `${minutes}min`;
  }
}

export default function SLAMetricsCards({ ticket }: SLAMetricsCardsProps) {
  const createdAt = new Date(ticket.created_at);
  const resolvedAt = ticket.resolved_at ? new Date(ticket.resolved_at) : new Date();
  const firstResponseAt = ticket.first_response_at ? new Date(ticket.first_response_at) : null;
  
  // Tempo total (do início até resolução ou agora)
  const totalMinutes = differenceInMinutes(resolvedAt, createdAt);
  
  // Tempo de primeira resposta
  const firstResponseMinutes = firstResponseAt 
    ? differenceInMinutes(firstResponseAt, createdAt)
    : null;
  
  // Tempo útil (quando o ticket estava em atendimento)
  // Para simplificar, consideramos o tempo total como útil
  const usefulMinutes = totalMinutes;
  
  // Tempo em pausa (quando estava aguardando cliente)
  // Isso seria calculado baseado no histórico, por enquanto mostramos 0
  const pauseMinutes = 0;
  
  // Eficiência (% do tempo útil vs total)
  const efficiency = pauseMinutes > 0 
    ? ((usefulMinutes / totalMinutes) * 100).toFixed(1)
    : "100.0";
  
  const metrics = [
    {
      icon: Clock,
      label: "Tempo Total",
      value: formatDuration(totalMinutes),
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Target,
      label: "Tempo Útil",
      value: formatDuration(usefulMinutes),
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      icon: Pause,
      label: "Tempo em Pausa",
      value: formatDuration(pauseMinutes),
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      icon: TrendingUp,
      label: "Eficiência",
      value: `${efficiency}%`,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
  ];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                <metric.icon className={`h-6 w-6 ${metric.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="text-2xl font-bold">{metric.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
