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

  const statusLabel = status === "resolvido" ? "Resolvido" : "Fechado";
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
          <AlertDialogTitle>Motivo da Alteração de Status</AlertDialogTitle>
          <AlertDialogDescription>
            Você está alterando {ticketCount} ticket(s) para o status "{statusLabel}".
            Por favor, explique o motivo desta alteração.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-2 py-4">
          <Label htmlFor="reason">Motivo *</Label>
          <Textarea
            id="reason"
            placeholder="Descreva o motivo da alteração de status..."
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
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
