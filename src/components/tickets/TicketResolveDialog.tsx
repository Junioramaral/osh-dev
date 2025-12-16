import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Loader2 } from "lucide-react";

interface TicketResolveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: {
    id: string;
    ticket_number: string;
    title: string;
    contact_name: string;
  };
  onConfirm: (reason: string) => Promise<void>;
  isLoading?: boolean;
}

export function TicketResolveDialog({
  open,
  onOpenChange,
  ticket,
  onConfirm,
  isLoading,
}: TicketResolveDialogProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = async () => {
    if (reason.trim().length < 10) return;
    await onConfirm(reason);
    setReason("");
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setReason("");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Resolver Ticket
          </DialogTitle>
          <DialogDescription>
            Descreva o motivo da resolução. Este texto será enviado ao cliente por email e ficará registrado no histórico do ticket.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Ticket Info */}
          <div className="bg-muted/50 p-3 rounded-lg space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline">#{ticket.ticket_number}</Badge>
              <span className="text-sm font-medium truncate">{ticket.title}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Contato: {ticket.contact_name}
            </p>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="resolution-reason">
              Motivo da Resolução <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="resolution-reason"
              placeholder="Descreva como o problema foi resolvido e quais ações foram tomadas..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Mínimo de 10 caracteres ({reason.trim().length}/10)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={reason.trim().length < 10 || isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resolvendo...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirmar Resolução
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
