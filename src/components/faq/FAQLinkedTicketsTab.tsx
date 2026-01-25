import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink, Ticket, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { HighlightText } from "@/lib/highlightText";
import { supabase } from "@/integrations/supabase/client";

interface FAQLinkedTicketsTabProps {
  articleId: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  novo: { label: "Novo", className: "bg-blue-500/20 text-blue-700" },
  em_atendimento: { label: "Em Atendimento", className: "bg-yellow-500/20 text-yellow-700" },
  aguardando_cliente: { label: "Aguardando Cliente", className: "bg-orange-500/20 text-orange-700" },
  resolvido: { label: "Resolvido", className: "bg-green-500/20 text-green-700" },
  fechado: { label: "Fechado", className: "bg-gray-500/20 text-gray-700" },
};

export function FAQLinkedTicketsTab({ articleId }: FAQLinkedTicketsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["faq-linked-tickets", articleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("id, ticket_number, title, status, created_at, clients(name)")
        .eq("faq_article_id", articleId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const filteredTickets = tickets?.filter((ticket) => {
    if (!searchTerm.trim()) return true;
    
    const search = searchTerm.toLowerCase();
    return (
      ticket.ticket_number?.toLowerCase().includes(search) ||
      ticket.title?.toLowerCase().includes(search) ||
      ticket.clients?.name?.toLowerCase().includes(search) ||
      statusConfig[ticket.status || "novo"]?.label.toLowerCase().includes(search)
    );
  }) || [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Ticket className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">Nenhum ticket vinculado a este artigo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Ticket className="h-4 w-4" />
          <span>
            {filteredTickets.length === tickets.length 
              ? `${tickets.length} ticket(s) vinculado(s)`
              : `${filteredTickets.length} de ${tickets.length} ticket(s)`
            }
          </span>
        </div>

        <div className="relative w-full sm:w-auto sm:ml-auto sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, título, cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filteredTickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Nenhum ticket encontrado para a busca.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Título</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="w-[120px] hidden sm:table-cell">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.map((ticket) => {
                const status = statusConfig[ticket.status || "novo"];
                return (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className="font-mono text-primary hover:underline inline-flex items-center gap-1"
                        target="_blank"
                      >
                        <HighlightText text={ticket.ticket_number || ""} searchTerm={searchTerm} />
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      <HighlightText text={ticket.clients?.name || "-"} searchTerm={searchTerm} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                      <HighlightText text={ticket.title} searchTerm={searchTerm} />
                    </TableCell>
                    <TableCell>
                      <Badge className={status.className}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {format(new Date(ticket.created_at!), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
