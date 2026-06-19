import { useParams } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useTicketDetail, useTicketComments } from "@/hooks/useTicketDetail";
import TicketRFCReport from "@/components/tickets/TicketRFCReport";
import RFCReportPreview from "@/components/tickets/RFCReportPreview";
import RFCContextCards from "@/components/tickets/RFCContextCards";
import TicketHeader from "@/components/tickets/TicketHeader";
import TicketDetails from "@/components/tickets/TicketDetails";
import TicketTimeline from "@/components/tickets/TicketTimeline";
import TicketComments from "@/components/tickets/TicketComments";
import TicketAttachments from "@/components/tickets/TicketAttachments";
import TicketSidebar from "@/components/tickets/TicketSidebar";
import TicketSLATab from "@/components/tickets/TicketSLATab";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export default function TicketDetail() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { data: ticket, isLoading, error } = useTicketDetail(ticketId);
  const { data: comments } = useTicketComments(ticketId);
  const { isOtimizzoUser, isSuperAdmin } = useAuth();
  
  const isRFC = ticket?.record_type === 'rfc';
  const isResolved = ticket?.status === 'resolvido' || ticket?.status === 'fechado';
  const showReportTab = isRFC && isResolved && (isOtimizzoUser || isSuperAdmin);
  
  if (error) {
    return (
      <AppLayout>
        <Card className="max-w-2xl mx-auto mt-8">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Erro ao carregar ticket</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {error instanceof Error ? error.message : 'Não foi possível carregar os detalhes do ticket'}
            </p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }
  
  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <div className="flex gap-6">
            <div className="flex-1 space-y-4">
              <Skeleton className="h-96 w-full" />
            </div>
            <div className="w-80 space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }
  
  if (!ticket) {
    return (
      <AppLayout>
        <Card className="max-w-2xl mx-auto mt-8">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ticket não encontrado</h3>
            <p className="text-muted-foreground text-center max-w-md">
              O ticket solicitado não existe ou você não tem permissão para visualizá-lo.
            </p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout>
      <div className="space-y-6">
        <TicketHeader ticket={ticket} />
        
        <div className="flex flex-col lg:flex-row gap-6 min-w-0">
          <main className="flex-1 min-w-0 max-w-full overflow-hidden">
            <Tabs defaultValue="details" className="w-full min-w-0">
              <TabsList className={`grid w-full ${
                showReportTab ? 'grid-cols-6' : 'grid-cols-5'
              }`}>
                <TabsTrigger value="details">Detalhes</TabsTrigger>
                {!isRFC && <TabsTrigger value="sla">SLA</TabsTrigger>}
                {isRFC && <TabsTrigger value="rfc">RFC</TabsTrigger>}
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="comments">
                  Comentários {comments && comments.length > 0 ? `(${comments.length})` : ''}
                </TabsTrigger>
                <TabsTrigger value="attachments">Anexos</TabsTrigger>
                {showReportTab && <TabsTrigger value="report">Relatório</TabsTrigger>}
              </TabsList>
              <TabsContent value="details" className="mt-6">
                <TicketDetails ticket={ticket} />
              </TabsContent>
              {!isRFC && (
                <TabsContent value="sla" className="mt-6">
                  <TicketSLATab ticket={ticket} />
                </TabsContent>
              )}
              {isRFC && (
                <TabsContent value="rfc" className="mt-6">
                  <div className="space-y-4">
                    <RFCContextCards ticket={ticket} />
                    <TicketRFCReport ticket={ticket} />
                  </div>
                </TabsContent>
              )}
              {showReportTab && (
                <TabsContent value="report" className="mt-6">
                  <RFCReportPreview ticket={ticket} />
                </TabsContent>
              )}
              <TabsContent value="timeline" className="mt-6">
                <TicketTimeline ticketId={ticket.id} clientId={ticket.client_id} recordType={ticket.record_type} />
              </TabsContent>
              <TabsContent value="comments" className="mt-6 w-full min-w-0 max-w-full overflow-x-hidden">
                <TicketComments ticketId={ticket.id} clientId={ticket.client_id} ticket={ticket} />
              </TabsContent>
              <TabsContent value="attachments" className="mt-6">
                <TicketAttachments ticket={ticket} ticketId={ticket.id} />
              </TabsContent>
            </Tabs>
          </main>
          
          <aside className="w-full lg:w-80">
            <TicketSidebar ticket={ticket} />
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
