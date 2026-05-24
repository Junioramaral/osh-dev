import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { format } from "date-fns";

interface SLAAdjustDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: any;
  onConfirm: (values: {
    firstResponseDeadline: string | null;
    resolutionDeadline: string | null;
    reason: string;
  }) => Promise<void> | void;
  isLoading?: boolean;
}

function toLocalInput(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

export function SLAAdjustDialog({
  open,
  onOpenChange,
  ticket,
  onConfirm,
  isLoading,
}: SLAAdjustDialogProps) {
  const [firstResponse, setFirstResponse] = useState("");
  const [resolution, setResolution] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setFirstResponse(toLocalInput(ticket?.sla_first_response_deadline));
      setResolution(toLocalInput(ticket?.sla_resolution_deadline));
      setReason("");
    }
  }, [open, ticket]);

  const canSubmit = reason.trim().length >= 10 && (firstResponse || resolution);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onConfirm({
      firstResponseDeadline: fromLocalInput(firstResponse),
      resolutionDeadline: fromLocalInput(resolution),
      reason: reason.trim(),
    });
  };

  const original = ticket?.sla_resolution_deadline_original
    ? format(new Date(ticket.sla_resolution_deadline_original), "dd/MM/yyyy HH:mm")
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar SLA</DialogTitle>
          <DialogDescription>
            Estenda manualmente os prazos do SLA. A alteração será registrada com
            data, autor e motivo.
          </DialogDescription>
        </DialogHeader>

        {original && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Prazo original de resolução: <strong>{original}</strong>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="fr">Prazo de Primeira Resposta</Label>
            <Input
              id="fr"
              type="datetime-local"
              value={firstResponse}
              onChange={(e) => setFirstResponse(e.target.value)}
              disabled={!!ticket?.first_response_at}
            />
            {ticket?.first_response_at && (
              <p className="text-xs text-muted-foreground">
                Já houve primeira resposta — não pode ser alterado.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="res">Prazo de Resolução</Label>
            <Input
              id="res"
              type="datetime-local"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason">
              Motivo do Ajuste <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Ex.: Cliente solicitou extensão, análise complexa, dependência externa..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Mínimo de 10 caracteres ({reason.trim().length}/10)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isLoading}>
            {isLoading ? "Salvando..." : "Confirmar Ajuste"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}