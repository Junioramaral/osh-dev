import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Clock, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface SLANotificationsLogProps {
  ticketId: string;
}

export default function SLANotificationsLog({ ticketId }: SLANotificationsLogProps) {
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['sla-notifications', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sla_notifications')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('sent_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!ticketId
  });
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }
  
  if (!notifications || notifications.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Nenhuma notificação de SLA enviada para este ticket</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {notifications.map((notification) => (
        <div key={notification.id} className="border rounded-lg p-4">
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-lg ${
              notification.alert_type === 'overdue' 
                ? 'bg-destructive/10' 
                : 'bg-warning/10'
            }`}>
              {notification.alert_type === 'overdue' ? (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              ) : (
                <Clock className="h-5 w-5 text-warning" />
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={notification.alert_type === 'overdue' ? 'destructive' : 'outline'}>
                  {notification.alert_type === 'overdue' ? 'Vencido' : 'Atenção'}
                </Badge>
                <Badge variant="outline">
                  {notification.sla_type === 'first_response' ? 'Primeira Resposta' : 'Resolução'}
                </Badge>
                <span className="text-sm text-muted-foreground ml-auto">
                  {format(new Date(notification.sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
              
              <div className="text-sm">
                <p className="font-medium mb-1">
                  {notification.alert_type === 'overdue' 
                    ? 'SLA Vencido'
                    : 'Alerta de SLA em Risco'}
                </p>
                <p className="text-muted-foreground">
                  Notificação enviada para: {notification.recipients.join(', ')}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
