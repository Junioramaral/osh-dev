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
import { useTimeLogMutations } from "@/hooks/useTimeLogMutations";
import { Clock, Trash2 } from "lucide-react";
import { formatSmartDate } from "@/lib/dateUtils";

interface TimeLogDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: {
    id: string;
    hours: number;
    description?: string;
    logged_at: string;
    ticketId: string;
  } | null;
}

export function TimeLogDeleteDialog({ open, onOpenChange, log }: TimeLogDeleteDialogProps) {
  const { deleteTimeLog } = useTimeLogMutations();

  const handleDelete = async () => {
    if (!log) return;

    await deleteTimeLog.mutateAsync({
      logId: log.id,
      ticketId: log.ticketId,
    });

    onOpenChange(false);
  };

  if (!log) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Excluir Registro de Horas
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Esta ação é <strong>irreversível</strong>. O registro será permanentemente excluído.
            </p>
            
            <div className="mt-4 p-3 rounded-lg bg-muted border">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{log.hours}h registradas</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Registrado em {formatSmartDate(log.logged_at)}
              </p>
              {log.description && (
                <p className="mt-2 text-sm italic">"{log.description}"</p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteTimeLog.isPending}
          >
            {deleteTimeLog.isPending ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
