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

interface RFCCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: {
    id: string;
    ticket_number: string;
    title: string;
    clientName: string;
  };
  onConfirm: (message: string) => Promise<void>;
  isLoading?: boolean;
}

export function RFCCompleteDialog({
  open,
  onOpenChange,
  ticket,
  onConfirm,
  isLoading,
}: RFCCompleteDialogProps) {
  const [message, setMessage] = useState("");

  const handleConfirm = async () => {
    if (message.trim().length < 10) return;
    await onConfirm(message);
    setMessage("");
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setMessage("");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Concluir RFC
          </DialogTitle>
          <DialogDescription>
            Descreva a mensagem de conclusão da RFC. Este texto será enviado ao cliente por email e ficará registrado no histórico do ticket.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 p-3 rounded-lg space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline">#{ticket.ticket_number}</Badge>
              <span className="text-sm font-medium truncate">{ticket.title}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Cliente: {ticket.clientName}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rfc-completion-message">
              Mensagem de Conclusão <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="rfc-completion-message"
              placeholder="Descreva as ações realizadas e o resultado da execução da RFC..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Mínimo de 10 caracteres ({message.trim().length}/10)
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
            disabled={message.trim().length < 10 || isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Concluindo...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirmar Conclusão
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
