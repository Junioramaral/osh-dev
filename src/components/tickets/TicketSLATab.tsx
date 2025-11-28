import { Card } from "@/components/ui/card";
import SLAHistoryTable from "./SLAHistoryTable";
import SLATimelineChart from "./SLATimelineChart";
import SLAMetricsCards from "./SLAMetricsCards";
import SLANotificationsLog from "./SLANotificationsLog";

interface TicketSLATabProps {
  ticket: any;
}

export default function TicketSLATab({ ticket }: TicketSLATabProps) {
  return (
    <div className="space-y-6">
      {/* Métricas de Performance */}
      <SLAMetricsCards ticket={ticket} />
      
      {/* Timeline Visual */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Timeline SLA</h3>
        <SLATimelineChart ticket={ticket} />
      </Card>
      
      {/* Histórico Detalhado de SLA */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Histórico de SLA</h3>
        <SLAHistoryTable ticket={ticket} />
      </Card>
      
      {/* Log de Notificações */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Log de Notificações</h3>
        <SLANotificationsLog ticketId={ticket.id} />
      </Card>
    </div>
  );
}
