import { Card, CardContent } from "@/components/ui/card";
import { Clock, Target, Pause, TrendingUp } from "lucide-react";
import { differenceInMinutes } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { isBusinessHoursPriority, calculateBusinessMinutes, DEFAULT_BUSINESS_HOURS } from "@/lib/businessHours";
import type { SLAPauseRow } from "@/hooks/useTicketSLAPauses";

interface SLAMetricsCardsProps {
  ticket: any;
  holidays?: string[];
  pauses?: SLAPauseRow[];
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

export default function SLAMetricsCards({ ticket, holidays = [], pauses }: SLAMetricsCardsProps) {
  const createdAt = new Date(ticket.created_at);
  const resolvedAt = ticket.resolved_at ? new Date(ticket.resolved_at) : new Date();
  const useBusinessHours = isBusinessHoursPriority(ticket.priority);
  
  // Tempo total (calendar)
  const totalMinutesCalendar = differenceInMinutes(resolvedAt, createdAt);
  
  // Tempo útil (business hours for P3/P4, same as total for P1/P2)
  const usefulMinutes = useBusinessHours
    ? calculateBusinessMinutes(createdAt, resolvedAt, DEFAULT_BUSINESS_HOURS, holidays)
    : totalMinutesCalendar;

  // Tempo em pausa: prefer real pause records, fallback to heuristic
  let pauseMinutes = 0;
  if (pauses && pauses.length > 0) {
    pauseMinutes = pauses.reduce((sum, p) => {
      const startP = new Date(p.paused_at);
      const endP = p.resumed_at ? new Date(p.resumed_at) : new Date();
      const mins = useBusinessHours
        ? calculateBusinessMinutes(startP, endP, DEFAULT_BUSINESS_HOURS, holidays)
        : Math.max(0, Math.floor((endP.getTime() - startP.getTime()) / 60000));
      return sum + mins;
    }, 0);
  } else {
    pauseMinutes = useBusinessHours ? Math.max(0, totalMinutesCalendar - usefulMinutes) : 0;
  }

  // Eficiência
  const denom = usefulMinutes + pauseMinutes;
  const efficiency = denom > 0
    ? ((usefulMinutes / denom) * 100).toFixed(1)
    : "100.0";
  
  const metrics = [
    {
      icon: Clock,
      label: "Tempo Total",
      value: formatDuration(totalMinutesCalendar),
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Target,
      label: "Tempo Útil",
      value: formatDuration(usefulMinutes),
      color: "text-success",
      bgColor: "bg-success/10",
      badge: useBusinessHours ? "HU" : undefined,
    },
    {
      icon: Pause,
      label: "Tempo em Pausa",
      value: formatDuration(pauseMinutes),
      color: "text-warning",
      bgColor: "bg-warning/10",
      badge: useBusinessHours ? "Fora HU" : undefined,
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
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg shrink-0 ${metric.bgColor}`}>
                <metric.icon className={`h-5 w-5 ${metric.color}`} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm text-muted-foreground truncate">{metric.label}</p>
                  {metric.badge && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {metric.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-xl font-bold truncate">{metric.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
