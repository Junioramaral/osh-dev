import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { calculateSLAStatus, formatDuration } from "@/lib/ticketUtils";
import { differenceInMinutes } from "date-fns";

interface TicketSidebarProps {
  ticket: any;
}

function InfoRow({ label, value }: { label: string; value: any }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export default function TicketSidebar({ ticket }: TicketSidebarProps) {
  const slaStatus = calculateSLAStatus(ticket);
  const now = new Date();
  
  // Calculate resolution SLA if first response was given
  const resolutionSLA = ticket.first_response_at && ticket.sla_resolution_deadline ? (() => {
    const deadline = new Date(ticket.sla_resolution_deadline);
    const createdAt = new Date(ticket.created_at);
    const totalTime = differenceInMinutes(deadline, createdAt);
    const elapsed = differenceInMinutes(now, createdAt);
    const remaining = differenceInMinutes(deadline, now);
    const percentage = Math.min((elapsed / totalTime) * 100, 100);
    
    return {
      percentage,
      remaining,
      isOverdue: remaining < 0
    };
  })() : null;
  
  return (
    <div className="space-y-6">
      {/* SLA Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Status do SLA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">1ª Resposta</span>
              <Badge className={slaStatus.color} variant="outline">
                {slaStatus.label}
              </Badge>
            </div>
            {slaStatus.percentage !== undefined && (
              <>
                <Progress value={slaStatus.percentage} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{slaStatus.timeRemaining}</p>
              </>
            )}
          </div>
          
          {resolutionSLA && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Resolução</span>
                <Badge 
                  className={resolutionSLA.isOverdue ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}
                  variant="outline"
                >
                  {resolutionSLA.isOverdue ? 'Vencido' : 'No Prazo'}
                </Badge>
              </div>
              <Progress value={resolutionSLA.percentage} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {resolutionSLA.isOverdue 
                  ? `Venceu há ${formatDuration(Math.abs(resolutionSLA.remaining))}`
                  : `${formatDuration(resolutionSLA.remaining)} restantes`
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Technical Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Informações Técnicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="Segmento" value={ticket.segment} />
          <InfoRow label="Ambiente" value={ticket.db_environment || ticket.app_environment} />
          {ticket.segment === 'DB' && (
            <>
              <InfoRow label="Engine" value={ticket.db_engine} />
              <InfoRow label="Instância" value={ticket.database_instances?.instance_name} />
            </>
          )}
          {ticket.segment === 'APP' && (
            <>
              <InfoRow label="Produto" value={ticket.application_products?.name} />
              <InfoRow label="Versão" value={ticket.app_version} />
              <InfoRow label="Módulo" value={ticket.app_module} />
            </>
          )}
          <InfoRow label="Máquina" value={ticket.db_machine?.hostname || ticket.app_machine?.hostname} />
        </CardContent>
      </Card>
      
      {/* People */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pessoas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Analista</Label>
            <div className="flex items-center gap-2 mt-1">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {ticket.profiles?.full_name?.[0] || 'N'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{ticket.profiles?.full_name || 'Não atribuído'}</span>
            </div>
          </div>
          
          <div>
            <Label className="text-xs text-muted-foreground">Time</Label>
            <p className="text-sm mt-1">{ticket.teams?.name || 'Não atribuído'}</p>
          </div>
          
          <Separator />
          
          <div>
            <Label className="text-xs text-muted-foreground">Contato</Label>
            <p className="text-sm mt-1">{ticket.contact_name}</p>
            <p className="text-xs text-muted-foreground">{ticket.contact_email}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
