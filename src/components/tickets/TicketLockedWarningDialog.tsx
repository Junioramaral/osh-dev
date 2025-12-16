import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Lock, X } from "lucide-react";

interface TicketLockedWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lockedByName: string;
  ticketCount: number;
  actionType: "lock" | "assign";
  onCancel: () => void;
  onProceed: (reason: string) => void;
}

export function TicketLockedWarningDialog({
  open,
  onOpenChange,
  lockedByName,
  ticketCount,
  actionType,
  onCancel,
  onProceed,
}: TicketLockedWarningDialogProps) {
  const [step, setStep] = useState<"warning" | "reason">("warning");
  const [reason, setReason] = useState("");

  const handleClose = () => {
    setStep("warning");
    setReason("");
    onOpenChange(false);
    onCancel();
  };

  const handleProceed = () => {
    setStep("reason");
  };

  const handleConfirm = () => {
    if (reason.trim().length < 10) return;
    onProceed(reason.trim());
    setStep("warning");
    setReason("");
    onOpenChange(false);
  };

  const actionLabel = actionType === "lock" ? "Assumir" : "Atribuir";
  const ticketText = ticketCount === 1 ? "ticket está" : "tickets estão";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        {step === "warning" ? (
          <>
            <AlertDialogHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <AlertDialogTitle className="text-center text-xl">
                Ticket já assumido
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-base">
                {ticketCount === 1 ? "Este ticket está" : "Estes tickets estão"} atualmente 
                assumido{ticketCount === 1 ? "" : "s"} por{" "}
                <span className="font-semibold text-foreground">{lockedByName}</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex gap-2 sm:gap-2 mt-4">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleProceed} className="flex-1">
                <Lock className="h-4 w-4 mr-2" />
                {actionLabel} Mesmo Assim
              </Button>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Descreva o motivo
              </AlertDialogTitle>
              <AlertDialogDescription>
                Por que você está {actionType === "lock" ? "assumindo" : "atribuindo"} este 
                ticket de outro analista? Esta nota será adicionada como mensagem interna.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="reason">Motivo *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Descreva o motivo da transferência..."
                className="mt-2 min-h-[100px]"
              />
              {reason.length > 0 && reason.length < 10 && (
                <p className="text-sm text-destructive mt-1">
                  O motivo deve ter pelo menos 10 caracteres
                </p>
              )}
            </div>
            <AlertDialogFooter className="flex gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setStep("warning")}>
                Voltar
              </Button>
              <Button onClick={handleConfirm} disabled={reason.trim().length < 10}>
                Confirmar
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
