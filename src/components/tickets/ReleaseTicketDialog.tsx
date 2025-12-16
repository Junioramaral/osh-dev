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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Unlock } from "lucide-react";

interface ReleaseTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketCount: number;
  onConfirm: (removeAnalyst: boolean) => void;
}

export function ReleaseTicketDialog({
  open,
  onOpenChange,
  ticketCount,
  onConfirm,
}: ReleaseTicketDialogProps) {
  const [removeAnalyst, setRemoveAnalyst] = useState(false);

  const handleConfirm = () => {
    onConfirm(removeAnalyst);
    setRemoveAnalyst(false);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setRemoveAnalyst(false);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Unlock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <AlertDialogTitle className="text-center">
            Liberar {ticketCount === 1 ? "Ticket" : `${ticketCount} Tickets`}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            O lock será removido e o{ticketCount === 1 ? "" : "s"} ticket{ticketCount === 1 ? "" : "s"} 
            {" "}ficará{ticketCount === 1 ? "" : "ão"} disponível{ticketCount === 1 ? "" : "is"} para 
            outros analistas assumirem.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4">
          <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg">
            <Checkbox
              id="removeAnalyst"
              checked={removeAnalyst}
              onCheckedChange={(checked) => setRemoveAnalyst(checked === true)}
            />
            <Label htmlFor="removeAnalyst" className="cursor-pointer">
              Remover também o analista atribuído
            </Label>
          </div>
        </div>

        <AlertDialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} className="flex-1">
            <Unlock className="h-4 w-4 mr-2" />
            Liberar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
