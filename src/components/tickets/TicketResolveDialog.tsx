import { useState, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, Loader2, Link2, Search, X } from "lucide-react";
import { useClientLinkableTickets } from "@/hooks/useClientLinkableTickets";
import { format } from "date-fns";

interface TicketResolveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: {
    id: string;
    ticket_number: string;
    title: string;
    contact_name: string;
    client_id?: string | null;
  };
  onConfirm: (reason: string, linkedTicketIds: string[]) => Promise<void>;
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
  const [linkedIds, setLinkedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const { data: linkable = [], isLoading: linkableLoading } =
    useClientLinkableTickets(ticket.client_id ?? undefined, ticket.id, open);

  const filtered = useMemo(() => {
    const raw = search.trim().toLowerCase();
    // Treat wildcard-only input (*, **, ?, etc.) as "show all"
    const isWildcard = raw.length > 0 && /^[*?\s]+$/.test(raw);
    if (!raw || isWildcard) return linkable;
    // Normalize: strip leading # and zero-padding so "#101012" or "101012" match "00101012"
    const q = raw.replace(/^#+/, "");
    const qDigits = q.replace(/\D/g, "");
    return linkable.filter((t) => {
      const num = t.ticket_number.toLowerCase();
      const numDigits = num.replace(/\D/g, "");
      const title = (t.title ?? "").toLowerCase();
      return (
        num.includes(q) ||
        title.includes(q) ||
        (qDigits.length > 0 && numDigits.includes(qDigits))
      );
    });
  }, [linkable, search]);

  const toggleLink = (id: string) => {
    setLinkedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleConfirm = async () => {
    if (reason.trim().length < 10) return;
    await onConfirm(reason, linkedIds);
    setReason("");
    setLinkedIds([]);
    setSearch("");
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setReason("");
      setLinkedIds([]);
      setSearch("");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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

          {/* Linked tickets */}
          {ticket.client_id && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Vincular outros tickets do cliente
                <span className="text-xs font-normal text-muted-foreground">
                  (opcional)
                </span>
              </Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número (ex: 00101012) ou título — use * para ver todos"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-8"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Limpar busca"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {!linkableLoading && linkable.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Mostrando {filtered.length} de {linkable.length} ticket(s)
                </p>
              )}
              <div className="border rounded-md max-h-[240px] overflow-y-auto divide-y">
                {linkableLoading ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    Carregando tickets...
                  </div>
                ) : linkable.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    Este cliente não tem outros tickets abertos ou resolvidos nos últimos 30 dias.
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    Nenhum ticket corresponde a "{search}". Use * para listar todos.
                  </div>
                ) : (
                  filtered.map((t) => {
                    const checked = linkedIds.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className="flex items-start gap-3 p-2 hover:bg-muted/40 cursor-pointer"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleLink(t.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              #{t.ticket_number}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="text-xs capitalize"
                            >
                              {t.status.replace(/_/g, " ")}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(t.created_at), "dd/MM/yyyy")}
                            </span>
                          </div>
                          <p className="text-sm truncate mt-0.5">{t.title}</p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
              {linkedIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {linkedIds.length} ticket(s) selecionado(s) para vincular
                </p>
              )}
            </div>
          )}
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
