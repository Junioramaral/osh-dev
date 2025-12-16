import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface BulkStatusReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: string;
  ticketCount: number;
  onConfirm: (reason: string) => void;
}

export function BulkStatusReasonDialog({
  open,
  onOpenChange,
  status,
  ticketCount,
  onConfirm,
}: BulkStatusReasonDialogProps) {
  const [reason, setReason] = useState("");

  const minLength = 10;
  const isValid = reason.trim().length >= minLength;

  const handleConfirm = () => {
    if (isValid) {
      onConfirm(reason.trim());
      setReason("");
    }
  };

  const handleCancel = () => {
    setReason("");
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Motivo da Resolução do Ticket</AlertDialogTitle>
          <AlertDialogDescription>
            Você está resolvendo {ticketCount} ticket(s).
            Descreva o motivo da resolução. Este texto será enviado ao cliente por email.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-2 py-4">
          <Label htmlFor="reason">Motivo da Resolução *</Label>
          <Textarea
            id="reason"
            placeholder="Descreva como o problema foi resolvido..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Mínimo de {minLength} caracteres ({reason.trim().length}/{minLength})
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={!isValid}>
            Resolver Ticket(s)
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
