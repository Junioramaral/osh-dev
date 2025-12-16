import { useReportSendHistory } from "@/hooks/useReportSendHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const ReportSendHistory = () => {
  const { data: logs, isLoading } = useReportSendHistory();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Enviado
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Falhou
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = {
    total: logs?.length || 0,
    sent: logs?.filter(l => l.status === "sent").length || 0,
    failed: logs?.filter(l => l.status === "failed").length || 0,
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Envios</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Enviados com Sucesso</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Falhas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Envios</CardTitle>
        </CardHeader>
        <CardContent>
          {logs && logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Destinatários</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data de Envio</TableHead>
                  <TableHead>Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.client_name}</TableCell>
                    <TableCell>
                      {MONTH_NAMES[log.month - 1]} {log.year}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline">
                              {log.recipients.length} destinatário(s)
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              {log.recipients.map((r, i) => (
                                <p key={i} className="text-xs">{r}</p>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell>
                      {log.sent_at 
                        ? format(new Date(log.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : "-"
                      }
                    </TableCell>
                    <TableCell>
                      {log.error_message ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">{log.error_message}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum envio de relatório registrado ainda.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportSendHistory;
