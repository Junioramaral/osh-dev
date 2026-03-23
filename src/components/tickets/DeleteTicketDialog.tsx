import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface DeleteTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketCount: number;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function DeleteTicketDialog({
  open,
  onOpenChange,
  ticketCount,
  onConfirm,
  isDeleting = false,
}: DeleteTicketDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-destructive/10">
              <Trash2 className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <AlertDialogTitle className="text-center">
            Excluir {ticketCount === 1 ? "Ticket" : `${ticketCount} Tickets`}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Esta ação é <strong>irreversível</strong>. Todos os dados relacionados serão permanentemente removidos, incluindo comentários, histórico, registros de tempo, passos de RFC e notificações de SLA.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isDeleting ? "Excluindo..." : "Excluir"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
