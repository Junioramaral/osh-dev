import { Bell, Clock, ExternalLink, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useOverdueSLAAlertsCount, useOverdueSLAAlerts } from "@/hooks/useOverdueSLAAlertsCount";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { formatSmartDate } from "@/lib/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const SLAAlertBell = () => {
  const { isSuperAdmin, isOtimizzoUser, isViewer, user } = useAuth();
  const { data: count = 0 } = useOverdueSLAAlertsCount();
  const { data: alerts = [] } = useOverdueSLAAlerts();
  const queryClient = useQueryClient();

  // Only show for Otimizzo users, Super Admins, and Viewers
  if (!isSuperAdmin && !isOtimizzoUser && !isViewer) {
    return null;
  }

  const handleAcknowledge = async (alertId: string, token: string) => {
    try {
      const { error } = await supabase
        .from("sla_notifications")
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user?.id,
        })
        .eq("id", alertId)
        .eq("acknowledgment_token", token);

      if (error) throw error;

      toast.success("Ciência confirmada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["overdue-sla-alerts-count"] });
      queryClient.invalidateQueries({ queryKey: ["overdue-sla-alerts"] });
    } catch (error) {
      console.error("Error acknowledging alert:", error);
      toast.error("Erro ao confirmar ciência");
    }
  };

  const formatTimeAgo = (minutes: number): string => {
    const absMinutes = Math.abs(minutes);
    const hours = Math.floor(absMinutes / 60);
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${absMinutes}min`;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-medium animate-pulse">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4 text-destructive" />
            Alertas de SLA Pendentes
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {count === 0 
              ? "Nenhum alerta pendente de confirmação" 
              : `${count} ${count === 1 ? 'ticket' : 'tickets'} aguardando ciência`
            }
          </p>
        </div>
        
        <div className="max-h-80 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <CheckCircle className="h-10 w-10 mx-auto mb-2 text-primary" />
              <p className="text-sm">Todos os alertas foram confirmados!</p>
            </div>
          ) : (
            <div className="divide-y">
              {alerts.map((alert) => (
                <div key={alert.id} className="p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">
                          {alert.email_content?.ticket_number || "N/A"}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(alert.email_content?.time_remaining || 0)} atrasado
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate mt-1">
                        {alert.email_content?.title || "Sem título"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {alert.email_content?.client || "Cliente N/A"} • {alert.sla_type === 'first_response' ? 'Primeira Resposta' : 'Resolução'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Notificado {formatSmartDate(alert.sent_at)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleAcknowledge(alert.id, alert.acknowledgment_token)}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Ciente
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        asChild
                      >
                        <Link to={`/tickets/${alert.ticket_id}`}>
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Ver
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {count > 0 && (
          <div className="p-3 border-t bg-muted/30">
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link to="/sla-dashboard">
                Ver Dashboard de SLA
              </Link>
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
