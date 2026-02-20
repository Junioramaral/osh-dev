import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Send, FileText } from "lucide-react";
import RFCStepBuilder, { RFCStep } from "./RFCStepBuilder";

interface RFCFormSectionProps {
  onSuccess: (ticket: any) => void;
  onCancel: () => void;
}

export default function RFCFormSection({ onSuccess, onCancel }: RFCFormSectionProps) {
  const { profile, tenantId, isOtimizzoUser } = useAuth();

  const [clientId, setClientId] = useState<string>("");
  const [segment, setSegment] = useState<"DB" | "APP">("DB");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<RFCStep[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch clients (only for Otimizzo users)
  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!isOtimizzoUser,
  });

  // For client users, use their own tenantId
  const effectiveClientId = isOtimizzoUser ? clientId : (tenantId || "");

  const isValid =
    !!effectiveClientId &&
    title.trim().length > 0 &&
    steps.length > 0;

  const handleSubmit = async (status: "novo" | "aguardando_aprovacao") => {
    if (!isValid) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o cliente, título e adicione pelo menos um passo.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Montar texto dos passos para reproduction_steps
      const stepsText = steps
        .map((s, i) => `${i + 1}. ${s.descricao}`)
        .join("\n");

      const ticketData: any = {
        record_type: "rfc",
        status,
        segment,
        client_id: effectiveClientId,
        title: title.trim(),
        contact_name: profile?.full_name || user.email || "Usuário",
        contact_email: user.email || "",
        ticket_type: "service_request",
        priority: "P3",
        category: "RFC",
        opening_reason: "Criação de RFC",
        problem_faced: description.trim() || title.trim(),
        started_at: new Date().toISOString(),
        frequency: "pontual",
        business_impact: "medio",
        reproduction_steps: stepsText,
      };

      // Insert ticket
      const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .insert(ticketData)
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Insert rfc_steps
      if (steps.length > 0) {
        const rfcStepsData = steps.map((s) => ({
          ticket_id: ticket.id,
          descricao: s.descricao,
          ordem: s.ordem,
          procedimento: s.procedimento || null,
          scripts: s.scripts || null,
        }));

        const { error: stepsError } = await supabase
          .from("rfc_steps" as any)
          .insert(rfcStepsData);

        if (stepsError) throw stepsError;
      }

      // If requesting approval, add a comment
      if (status === "aguardando_aprovacao") {
        await supabase.from("ticket_comments").insert({
          ticket_id: ticket.id,
          author_id: user.id,
          content: `RFC criada e enviada para aprovação por ${profile?.full_name || user.email}.`,
          is_internal: true,
        });
      }

      toast({
        title: status === "aguardando_aprovacao" ? "RFC enviada para aprovação!" : "RFC salva como rascunho!",
        description: `Número: ${ticket.ticket_number}`,
      });

      onSuccess(ticket);
    } catch (error: any) {
      toast({
        title: "Erro ao criar RFC",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Badge RFC interno */}
      <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3">
        <p className="text-sm text-primary font-medium">
          RFC (Request for Change) — Uso interno Otimizzo
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Registre uma solicitação de mudança com plano de implementação passo a passo.
        </p>
      </div>

      {/* 1. Cliente — apenas para usuários Otimizzo */}
      {isOtimizzoUser && (
        <div className="space-y-2">
          <Label htmlFor="rfc-client">Cliente *</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger id="rfc-client">
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 2. Segmento */}
      <div className="space-y-2">
        <Label>Segmento *</Label>
        <RadioGroup
          value={segment}
          onValueChange={(v) => setSegment(v as "DB" | "APP")}
          className="flex gap-6"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="DB" id="rfc-seg-db" />
            <Label htmlFor="rfc-seg-db" className="cursor-pointer font-normal">
              Banco de Dados
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="APP" id="rfc-seg-app" />
            <Label htmlFor="rfc-seg-app" className="cursor-pointer font-normal">
              Application
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* 3. Título */}
      <div className="space-y-2">
        <Label htmlFor="rfc-title">Título da RFC *</Label>
        <Input
          id="rfc-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Migração do banco de dados Oracle para PostgreSQL"
        />
      </div>

      {/* 4. Descrição */}
      <div className="space-y-2">
        <Label htmlFor="rfc-description">Descrição / Justificativa</Label>
        <Textarea
          id="rfc-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descreva o objetivo e a justificativa desta mudança (opcional)"
          rows={3}
        />
      </div>

      {/* 5. Passos do plano */}
      <RFCStepBuilder steps={steps} onStepsChange={setSteps} />

      {/* Rodapé com botões */}
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSubmit("novo")}
          disabled={isSubmitting || !isValid}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <FileText className="mr-2 h-4 w-4" />
          Salvar Rascunho
        </Button>
        <Button
          type="button"
          onClick={() => handleSubmit("aguardando_aprovacao")}
          disabled={isSubmitting || !isValid}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Send className="mr-2 h-4 w-4" />
          Solicitar Aprovação
        </Button>
      </div>
    </div>
  );
}
