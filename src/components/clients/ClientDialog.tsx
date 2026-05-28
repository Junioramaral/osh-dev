import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ClientForm from "./ClientForm";
import type { Tables } from "@/integrations/supabase/types";

type Client = Tables<"clients">;

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  client: Client | null;
}

export default function ClientDialog({ open, onOpenChange, mode, client }: ClientDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo Cliente" : `Editar Cliente: ${client?.name}`}</DialogTitle>
        </DialogHeader>

        <ClientForm
          mode={mode}
          client={client}
          onSaved={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}