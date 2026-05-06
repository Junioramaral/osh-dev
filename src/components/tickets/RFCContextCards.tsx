import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, User, Settings2, UserPlus } from "lucide-react";

interface RFCContextCardsProps {
  ticket: any;
}

function Row({ label, value }: { label: string; value?: any }) {
  if (!value) return null;
  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground break-words">{value}</span>
    </div>
  );
}

export default function RFCContextCards({ ticket }: RFCContextCardsProps) {
  if (!ticket) return null;

  const isDB = ticket.segment === "DB";
  const segmentLabel = isDB ? "Banco de Dados" : ticket.segment === "APP" ? "Aplicação" : ticket.segment;

  // Resolve nested values flexibly
  const dbInstance = ticket.database_instances;
  const appInstance = ticket.application_instances;
  const appProduct = ticket.application_products;
  const dbMachine = ticket.db_machine;
  const appMachine = ticket.app_machine;

  const envLabel = (env?: string | null) =>
    env === "prod" ? "Produção"
    : env === "hom" ? "Homologação"
    : env === "qa" ? "QA"
    : env === "dev" ? "Desenvolvimento"
    : env || null;

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      {/* Cliente */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Row label="Nome" value={ticket.clients?.name} />
          <Row label="Domínio" value={ticket.clients?.domain} />
        </CardContent>
      </Card>

      {/* Solicitante (quem abriu a RFC) */}
      {(ticket.created_by_name || ticket.created_by_email) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              Solicitante
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Row label="Nome" value={ticket.created_by_name} />
            <Row label="Email" value={ticket.created_by_email} />
          </CardContent>
        </Card>
      )}

      {/* Contato */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Contato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Row label="Nome" value={ticket.contact_name} />
          <Row label="Email" value={ticket.contact_email} />
        </CardContent>
      </Card>

      {/* Informações Técnicas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" />
            Informações Técnicas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Row label="Segmento" value={segmentLabel} />
          {isDB ? (
            <>
              <Row label="Engine" value={ticket.db_engine} />
              <Row label="Ambiente" value={envLabel(ticket.db_environment)} />
              <Row label="Máquina" value={dbMachine?.hostname} />
              <Row
                label="Instância"
                value={
                  dbInstance
                    ? `${dbInstance.instance_name}${dbInstance.version ? ` (${dbInstance.version})` : ""}`
                    : null
                }
              />
            </>
          ) : (
            <>
              <Row label="Produto" value={appProduct?.name} />
              <Row label="Ambiente" value={envLabel(ticket.app_environment ?? appInstance?.environment)} />
              <Row label="Máquina" value={appMachine?.hostname} />
              <Row
                label="Instância"
                value={appInstance ? `${appInstance.version}${appInstance.environment ? ` - ${appInstance.environment}` : ""}` : null}
              />
              <Row label="Módulo" value={ticket.app_module} />
              <Row label="Versão" value={ticket.app_version} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
