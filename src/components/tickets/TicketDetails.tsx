import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { FileText, Server, AlertCircle, Search } from "lucide-react";
import { getTicketTypeLabel } from "@/lib/ticketUtils";

interface TicketDetailsProps {
  ticket: any;
}

function InfoRow({ label, value }: { label: string; value: any }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export default function TicketDetails({ ticket }: TicketDetailsProps) {
  return (
    <div className="space-y-6">
      {/* Card 1: Descrição do Problema */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Descrição do Problema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {ticket.description || "Sem descrição"}
          </p>
        </CardContent>
      </Card>

      {/* Card 2: Informações Técnicas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Server className="h-5 w-5 text-muted-foreground" />
            Informações Técnicas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            <InfoRow label="Segmento" value={ticket.segment} />
            {ticket.segment === 'DB' && (
              <>
                <InfoRow label="Engine" value={ticket.db_engine} />
                <InfoRow label="Instância" value={ticket.database_instances?.instance_name} />
                <InfoRow label="Ambiente" value={ticket.db_environment} />
                <InfoRow label="Máquina" value={ticket.db_machine?.hostname} />
              </>
            )}
            {ticket.segment === 'APP' && (
              <>
                <InfoRow label="Produto" value={ticket.application_products?.name} />
                <InfoRow label="Versão" value={ticket.app_version} />
                <InfoRow label="Módulo" value={ticket.app_module} />
                <InfoRow label="Ambiente" value={ticket.app_environment} />
                <InfoRow label="Máquina" value={ticket.app_machine?.hostname} />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Detalhes do Incidente */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            Detalhes do Ticket
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            <InfoRow label="Tipo" value={getTicketTypeLabel(ticket.ticket_type)} />
            <InfoRow label="Categoria" value={ticket.category} />
            <InfoRow label="Subcategoria" value={ticket.subcategory} />
            <InfoRow label="Frequência" value={ticket.frequency} />
            <InfoRow label="Impacto no Negócio" value={ticket.business_impact} />
            <InfoRow label="Iniciado em" value={format(new Date(ticket.started_at), 'dd/MM/yyyy HH:mm')} />
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Análise */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            Análise
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2 text-sm">Motivo da Abertura</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.opening_reason}</p>
          </div>
          <div>
            <h4 className="font-medium mb-2 text-sm">Problema Enfrentado</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.problem_faced}</p>
          </div>
          {ticket.error_displayed && (
            <div>
              <h4 className="font-medium mb-2 text-sm">Erro Exibido</h4>
              <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs">
                <code>{ticket.error_displayed}</code>
              </pre>
            </div>
          )}
          {ticket.reproduction_steps && (
            <div>
              <h4 className="font-medium mb-2 text-sm">Passos para Reprodução</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.reproduction_steps}</p>
            </div>
          )}
          {ticket.workaround && (
            <div>
              <h4 className="font-medium mb-2 text-sm">Workaround Aplicado</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.workaround}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
