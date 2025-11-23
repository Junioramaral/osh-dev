import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface TicketCreatedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketNumber: string;
  ticketId: string;
}

export function TicketCreatedDialog({ 
  open, 
  onOpenChange, 
  ticketNumber,
  ticketId 
}: TicketCreatedDialogProps) {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(ticketNumber);
    setCopied(true);
    toast.success("Número do ticket copiado!");
    
    setTimeout(() => setCopied(false), 2000);
  };

  const handleViewTicket = () => {
    onOpenChange(false);
    navigate(`/tickets/${ticketId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-6 w-6" />
            Ticket Criado com Sucesso!
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Seu ticket foi registrado com o número:
            </p>
            <div className="bg-muted p-6 rounded-lg">
              <p className="text-4xl font-mono font-bold tracking-wider">
                {ticketNumber}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleCopy}
              variant="outline"
              className="flex-1"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar Número
                </>
              )}
            </Button>
            <Button 
              onClick={handleViewTicket}
              className="flex-1"
            >
              Ver Ticket
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
