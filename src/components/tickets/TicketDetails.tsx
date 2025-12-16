import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface TicketDetailsProps {
  ticket: any;
}

function InfoRow({ label, value }: { label: string; value: any }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-lg">{title}</h3>
      {children}
    </div>
  );
}

export default function TicketDetails({ ticket }: TicketDetailsProps) {
  return (
    <div className="space-y-6 p-6">
        <Section title="Descrição do Problema">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
        </Section>
        
        <Section title="Informações Técnicas">
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
        </Section>
        
        <Section title="Detalhes do Incidente">
          <div className="space-y-0">
            <InfoRow label="Tipo" value={ticket.ticket_type} />
            <InfoRow label="Categoria" value={ticket.category} />
            <InfoRow label="Subcategoria" value={ticket.subcategory} />
            <InfoRow label="Frequência" value={ticket.frequency} />
            <InfoRow label="Impacto no Negócio" value={ticket.business_impact} />
            <InfoRow label="Iniciado em" value={format(new Date(ticket.started_at), 'dd/MM/yyyy HH:mm')} />
          </div>
        </Section>
        
        <Section title="Análise">
          <div className="space-y-4">
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
          </div>
        </Section>
      </div>
  );
}
