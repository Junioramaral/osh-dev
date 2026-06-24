import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { FileText, Server, AlertCircle, Search, Pencil, Check, X } from "lucide-react";
import { getTicketTypeLabel } from "@/lib/ticketUtils";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import TicketLinkedTicketsCard from "./TicketLinkedTicketsCard";

interface TicketDetailsProps {
  ticket: any;
}

const ENVIRONMENT_LABELS: Record<string, string> = {
  prod: "Produção",
  hom: "Homologação",
  qa: "QA",
  dev: "Desenvolvimento",
};

function formatEnvironment(env?: string | null) {
  if (!env) return env;
  return ENVIRONMENT_LABELS[env] ?? env;
}

function InfoRow({ label, value }: { label: string; value: any }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b last:border-b-0 sm:flex-row sm:justify-between sm:items-start sm:gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium break-words sm:text-right min-w-0">{value}</span>
    </div>
  );
}

function EditableRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-2 border-b last:border-b-0 sm:flex-row sm:justify-between sm:items-center sm:gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <div className="w-full sm:w-64">{children}</div>
    </div>
  );
}

const TICKET_TYPES = [
  { value: "incidente", label: "Incidente" },
  { value: "duvida", label: "Dúvida" },
  { value: "problema", label: "Problema" },
  { value: "service_request", label: "Service Request" },
];

function TicketIncidentCard({ ticket }: { ticket: any }) {
  const { isOtimizzoUser } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [ticketType, setTicketType] = useState<string>(ticket.ticket_type ?? "");
  const [category, setCategory] = useState<string>(ticket.category ?? "");
  const [subcategory, setSubcategory] = useState<string>(ticket.subcategory ?? "");

  useEffect(() => {
    setTicketType(ticket.ticket_type ?? "");
    setCategory(ticket.category ?? "");
    setSubcategory(ticket.subcategory ?? "");
  }, [ticket.id, ticket.ticket_type, ticket.category, ticket.subcategory]);

  const { data: categories } = useQuery({
    queryKey: ["ticket-categories", ticket.segment],
    queryFn: async () => {
      if (!ticket.segment) return [];
      const { data, error } = await supabase
        .from("ticket_categories")
        .select("id, name, segment")
        .eq("is_active", true)
        .or(`segment.is.null,segment.eq.${ticket.segment}`)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: isEditing && !!ticket.segment,
  });

  const selectedCategoryId = categories?.find((c) => c.name === category)?.id;

  const { data: subcategories } = useQuery({
    queryKey: ["ticket-subcategories", selectedCategoryId],
    queryFn: async () => {
      if (!selectedCategoryId) return [];
      const { data, error } = await supabase
        .from("ticket_subcategories")
        .select("id, name")
        .eq("category_id", selectedCategoryId)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: isEditing && !!selectedCategoryId,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tickets")
        .update({
          ticket_type: ticketType as any,
          category,
          subcategory: subcategory || null,
        })
        .eq("id", ticket.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Detalhes atualizados");
      queryClient.invalidateQueries({ queryKey: ["ticket-detail", ticket.id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-history", ticket.id] });
      setIsEditing(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  const handleCancel = () => {
    setTicketType(ticket.ticket_type ?? "");
    setCategory(ticket.category ?? "");
    setSubcategory(ticket.subcategory ?? "");
    setIsEditing(false);
  };

  const hasChanges =
    ticketType !== (ticket.ticket_type ?? "") ||
    category !== (ticket.category ?? "") ||
    (subcategory ?? "") !== (ticket.subcategory ?? "");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            Detalhes do Ticket
          </CardTitle>
          {isOtimizzoUser && (
            <div className="flex items-center gap-1">
              {!isEditing ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setIsEditing(true)}
                  aria-label="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => mutation.mutate()}
                    disabled={!hasChanges || mutation.isPending}
                    aria-label="Salvar"
                  >
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={handleCancel}
                    disabled={mutation.isPending}
                    aria-label="Cancelar"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
        <div className="space-y-0">
          {isEditing ? (
            <>
              <EditableRow label="Tipo">
                <Select value={ticketType} onValueChange={setTicketType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TICKET_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </EditableRow>
              <EditableRow label="Categoria">
                <Select
                  value={category}
                  onValueChange={(v) => { setCategory(v); setSubcategory(""); }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </EditableRow>
              <EditableRow label="Subcategoria">
                <Select
                  value={subcategory || ""}
                  onValueChange={setSubcategory}
                  disabled={!selectedCategoryId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedCategoryId ? "Selecione" : "Selecione a categoria"} />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories?.map((s) => (
                      <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </EditableRow>
              <InfoRow label="Frequência" value={ticket.frequency} />
              <InfoRow label="Impacto no Negócio" value={ticket.business_impact} />
              <InfoRow label="Iniciado em" value={format(new Date(ticket.started_at), 'dd/MM/yyyy HH:mm')} />
            </>
          ) : (
            <>
              <InfoRow label="Tipo" value={getTicketTypeLabel(ticket.ticket_type)} />
              <InfoRow label="Categoria" value={ticket.category} />
              <InfoRow label="Subcategoria" value={ticket.subcategory} />
              <InfoRow label="Frequência" value={ticket.frequency} />
              <InfoRow label="Impacto no Negócio" value={ticket.business_impact} />
              <InfoRow label="Iniciado em" value={format(new Date(ticket.started_at), 'dd/MM/yyyy HH:mm')} />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TicketDetails({ ticket }: TicketDetailsProps) {
  return (
    <div className="space-y-6">
      {/* Card 1: Descrição do Problema */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Descrição do Problema
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
            {ticket.description || "Sem descrição"}
          </p>
        </CardContent>
      </Card>

      {/* Card 2: Informações Técnicas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Server className="h-5 w-5 text-muted-foreground" />
            Informações Técnicas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="space-y-0">
            <InfoRow label="Segmento" value={ticket.segment} />
            {ticket.segment === 'DB' && (
              <>
                <InfoRow label="Engine" value={ticket.db_engine} />
                <InfoRow label="Instância" value={ticket.database_instances?.instance_name} />
                <InfoRow label="Ambiente" value={formatEnvironment(ticket.db_environment)} />
                <InfoRow label="Máquina" value={ticket.db_machine?.hostname} />
              </>
            )}
            {ticket.segment === 'APP' && (
              <>
                <InfoRow label="Produto" value={ticket.application_products?.name} />
                <InfoRow label="Versão" value={ticket.app_version} />
                <InfoRow label="Módulo" value={ticket.app_module} />
                <InfoRow label="Ambiente" value={formatEnvironment(ticket.app_environment)} />
                <InfoRow label="Máquina" value={ticket.app_machine?.hostname} />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Detalhes do Incidente */}
      <TicketIncidentCard ticket={ticket} />

      {/* Card: Tickets Vinculados */}
      <TicketLinkedTicketsCard ticketId={ticket.id} />

      {/* Card 4: Análise */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            Análise
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
          <div>
            <h4 className="font-medium mb-2 text-sm">Motivo da Abertura</h4>
            <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground whitespace-pre-wrap break-words">
              {ticket.opening_reason}
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2 text-sm">Problema Enfrentado</h4>
            <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground whitespace-pre-wrap break-words">
              {ticket.problem_faced}
            </div>
          </div>
          {ticket.error_displayed && (
            <div>
              <h4 className="font-medium mb-2 text-sm">Erro Exibido</h4>
              <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs max-w-full">
                <code>{ticket.error_displayed}</code>
              </pre>
            </div>
          )}
          {ticket.reproduction_steps && (
            <div>
              <h4 className="font-medium mb-2 text-sm">Passos para Reprodução</h4>
              <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground whitespace-pre-wrap break-words">
                {ticket.reproduction_steps}
              </div>
            </div>
          )}
          {ticket.workaround && (
            <div>
              <h4 className="font-medium mb-2 text-sm">Workaround Aplicado</h4>
              <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground whitespace-pre-wrap break-words">
                {ticket.workaround}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
