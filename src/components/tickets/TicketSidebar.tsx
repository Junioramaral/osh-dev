import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { calculateSLAStatus, formatDuration } from "@/lib/ticketUtils";
import { differenceInMinutes } from "date-fns";
import { BookOpen, ExternalLink } from "lucide-react";
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
  const [showFAQDialog, setShowFAQDialog] = useState(false);
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
      {/* FAQ Relacionada */}
      {ticket.faq_articles && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              FAQ Relacionada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm font-medium line-clamp-2">{ticket.faq_articles.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {ticket.faq_articles.symptoms}
            </p>
            <Button 
              variant="link" 
              size="sm" 
              className="px-0 h-auto text-xs"
              onClick={() => setShowFAQDialog(true)}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Ver artigo completo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* FAQ Dialog */}
      <Dialog open={showFAQDialog} onOpenChange={setShowFAQDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{ticket.faq_articles?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Sintomas</Label>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                {ticket.faq_articles?.symptoms}
              </p>
            </div>
            {ticket.faq_articles?.problem && (
              <div>
                <Label className="text-sm font-semibold">Problema</Label>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                  {ticket.faq_articles?.problem}
                </p>
              </div>
            )}
            {ticket.faq_articles?.solution && (
              <div>
                <Label className="text-sm font-semibold">Solução</Label>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                  {ticket.faq_articles?.solution}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
