import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
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
import { useAvailableSegments } from "@/hooks/useAvailableSegments";

interface RFCFormSectionProps {
  onSuccess: (ticket: any) => void;
  onCancel: () => void;
}

export default function RFCFormSection({ onSuccess, onCancel }: RFCFormSectionProps) {
  const { profile } = useAuth();
  const { isTenantStaff, clientId: myClientId } = useTenant();

  const [pickedClientId, setPickedClientId] = useState<string>("");
  const [contactId, setContactId] = useState<string>("");
  const [segment, setSegment] = useState<"DB" | "APP">("DB");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<RFCStep[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Informações Técnicas - DB
  const [dbEngine, setDbEngine] = useState<string>("");
  const [dbEnvironment, setDbEnvironment] = useState<string>("");
  const [dbMachineId, setDbMachineId] = useState<string>("");
  const [dbInstanceId, setDbInstanceId] = useState<string>("");

  // Informações Técnicas - APP
  const [appProductId, setAppProductId] = useState<string>("");
  const [appEnvironment, setAppEnvironment] = useState<string>("");
  const [appMachineId, setAppMachineId] = useState<string>("");
  const [appInstanceId, setAppInstanceId] = useState<string>("");
  const [appModule, setAppModule] = useState<string>("");
  const [appVersion, setAppVersion] = useState<string>("");

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
    enabled: !!isTenantStaff,
  });

  // For client users, use their own client id
  const effectiveClientId = isTenantStaff ? pickedClientId : (myClientId || "");

  // Reset contact when client changes
  useEffect(() => {
    setContactId("");
    // Limpar campos técnicos ao trocar cliente
    setDbEngine(""); setDbEnvironment(""); setDbMachineId(""); setDbInstanceId("");
    setAppProductId(""); setAppEnvironment(""); setAppMachineId(""); setAppInstanceId("");
    setAppModule(""); setAppVersion("");
  }, [pickedClientId]);

  // Reset technical fields when segment changes
  useEffect(() => {
    setDbEngine(""); setDbEnvironment(""); setDbMachineId(""); setDbInstanceId("");
    setAppProductId(""); setAppEnvironment(""); setAppMachineId(""); setAppInstanceId("");
    setAppModule(""); setAppVersion("");
  }, [segment]);

  // Limpar dependentes do engine
  useEffect(() => { setDbInstanceId(""); setDbMachineId(""); }, [dbEngine, dbEnvironment]);
  useEffect(() => { setAppInstanceId(""); setAppMachineId(""); setAppModule(""); }, [appProductId, appEnvironment]);

  // Buscar engines disponíveis para o cliente
  const { data: clientData } = useQuery({
    queryKey: ["rfc-client-data", effectiveClientId],
    queryFn: async () => {
      if (!effectiveClientId) return null;
      const { data, error } = await supabase
        .from("clients")
        .select("db_engines, app_product_ids")
        .eq("id", effectiveClientId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveClientId,
  });

  // DB instances
  const { data: dbInstances } = useQuery({
    queryKey: ["rfc-db-instances", effectiveClientId, dbEngine, dbEnvironment, dbMachineId],
    queryFn: async () => {
      if (!effectiveClientId || !dbEngine || segment !== "DB") return [];
      let q = supabase.from("database_instances")
        .select("id, instance_name, version, environment, machine_id")
        .eq("client_id", effectiveClientId)
        .eq("engine", dbEngine as any);
      if (dbEnvironment) q = q.eq("environment", dbEnvironment as any);
      if (dbMachineId) q = q.eq("machine_id", dbMachineId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveClientId && !!dbEngine && segment === "DB",
  });

  // APP products
  const { data: appProducts } = useQuery({
    queryKey: ["rfc-app-products", effectiveClientId, clientData?.app_product_ids],
    queryFn: async () => {
      const ids = clientData?.app_product_ids || [];
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from("application_products")
        .select("id, name")
        .in("id", ids)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveClientId && segment === "APP" && !!clientData,
  });

  // APP instances
  const { data: appInstances } = useQuery({
    queryKey: ["rfc-app-instances", effectiveClientId, appProductId, appEnvironment, appMachineId],
    queryFn: async () => {
      if (!effectiveClientId || !appProductId || segment !== "APP") return [];
      let q = supabase.from("application_instances")
        .select("id, version, environment, machine_id, active_modules")
        .eq("client_id", effectiveClientId)
        .eq("product_id", appProductId);
      if (appEnvironment) q = q.eq("environment", appEnvironment as any);
      if (appMachineId) q = q.eq("machine_id", appMachineId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveClientId && !!appProductId && segment === "APP",
  });

  // Machines
  const { data: machines } = useQuery({
    queryKey: ["rfc-machines", effectiveClientId, segment, dbEngine, dbEnvironment, appProductId, appEnvironment],
    queryFn: async () => {
      if (!effectiveClientId) return [];
      if (segment === "DB" && dbEngine) {
        let iq = supabase.from("database_instances")
          .select("machine_id")
          .eq("client_id", effectiveClientId)
          .eq("engine", dbEngine as any)
          .not("machine_id", "is", null);
        if (dbEnvironment) iq = iq.eq("environment", dbEnvironment as any);
        const { data: ins } = await iq;
        const ids = Array.from(new Set((ins || []).map((i: any) => i.machine_id).filter(Boolean)));
        if (!ids.length) return [];
        const { data } = await supabase.from("machines")
          .select("id, hostname")
          .eq("client_id", effectiveClientId)
          .in("id", ids);
        return data || [];
      }
      if (segment === "APP" && appProductId) {
        let iq = supabase.from("application_instances")
          .select("machine_id")
          .eq("client_id", effectiveClientId)
          .eq("product_id", appProductId)
          .not("machine_id", "is", null);
        if (appEnvironment) iq = iq.eq("environment", appEnvironment as any);
        const { data: ins } = await iq;
        const ids = Array.from(new Set((ins || []).map((i: any) => i.machine_id).filter(Boolean)));
        if (!ids.length) return [];
        const { data } = await supabase.from("machines")
          .select("id, hostname")
          .eq("client_id", effectiveClientId)
          .in("id", ids);
        return data || [];
      }
      return [];
    },
    enabled: !!effectiveClientId,
  });

  const availableEngines: string[] = clientData?.db_engines || [];
  // Auto-fill app version from selected instance
  useEffect(() => {
    if (segment === "APP" && appInstanceId) {
      const inst = appInstances?.find((i: any) => i.id === appInstanceId);
      if (inst?.version) setAppVersion(inst.version);
    }
  }, [appInstanceId, appInstances, segment]);

  // Fetch contacts (active profiles) for the selected client — Otimizzo only
  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ["rfc-client-contacts", effectiveClientId],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("client_id", effectiveClientId)
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;

      const ids = (profiles || []).map((p) => p.id);
      if (ids.length === 0) return [];

      const { data: authResp } = await supabase.functions.invoke("manage-user", {
        body: { action: "list_users" },
      });
      const authUsers: any[] = authResp?.data?.users || [];

      return (profiles || []).map((p: any) => {
        const au = authUsers.find((u) => u.id === p.id);
        return { id: p.id, full_name: p.full_name, email: au?.email || "" };
      });
    },
    enabled: !!isTenantStaff && !!effectiveClientId,
  });

  const isValid =
    !!effectiveClientId &&
    (!isTenantStaff || !!contactId) &&
    title.trim().length > 0 &&
    steps.length > 0;

  const handleSubmit = async (status: "rascunho" | "aguardando_aprovacao") => {
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

      const selectedContact = contacts?.find((c) => c.id === contactId);
      const contactName = isTenantStaff && selectedContact
        ? selectedContact.full_name
        : (profile?.full_name || user.email || "Usuário");
      const contactEmail = isTenantStaff && selectedContact
        ? selectedContact.email
        : (user.email || "");

      const ticketData: any = {
        record_type: "rfc",
        status,
        segment,
        client_id: effectiveClientId,
        title: title.trim(),
        contact_name: contactName,
        contact_email: contactEmail,
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

      if (segment === "DB") {
        if (dbEngine) ticketData.db_engine = dbEngine;
        if (dbEnvironment) ticketData.db_environment = dbEnvironment;
        if (dbMachineId) ticketData.db_machine_id = dbMachineId;
        if (dbInstanceId) ticketData.db_instance_id = dbInstanceId;
      } else if (segment === "APP") {
        if (appProductId) ticketData.app_product_id = appProductId;
        if (appEnvironment) ticketData.app_environment = appEnvironment;
        if (appMachineId) ticketData.app_machine_id = appMachineId;
        if (appInstanceId) ticketData.app_instance_id = appInstanceId;
        if (appModule) ticketData.app_module = appModule;
        if (appVersion) ticketData.app_version = appVersion;
      }

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

      {/* 1. Cliente — apenas para staff do tenant */}
      {isTenantStaff && (
        <div className="space-y-2">
          <Label htmlFor="rfc-client">Cliente *</Label>
          <Select value={pickedClientId} onValueChange={setPickedClientId}>
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

      {/* 1b. Contato — apenas para staff do tenant, após selecionar cliente */}
      {isTenantStaff && pickedClientId && (
        <div className="space-y-2">
          <Label htmlFor="rfc-contact">Contato *</Label>
          <Select value={contactId} onValueChange={setContactId} disabled={contactsLoading}>
            <SelectTrigger id="rfc-contact">
              <SelectValue placeholder={contactsLoading ? "Carregando contatos..." : "Selecione o contato"} />
            </SelectTrigger>
            <SelectContent>
              {(contacts || []).length === 0 && !contactsLoading ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Nenhum contato cadastrado para este cliente
                </div>
              ) : (
                contacts?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}{c.email ? ` — ${c.email}` : ""}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 2. Segmento */}
      <div className="space-y-2">
        <Label>Segmento *</Label>
        <RFCSegmentRadio
          clientId={effectiveClientId}
          value={segment}
          onChange={setSegment}
        />
      </div>

      {/* 2b. Informações Técnicas */}
      {effectiveClientId && (
        <div className="rounded-lg border border-border p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold">Informações Técnicas</p>
            <p className="text-xs text-muted-foreground">
              Detalhes do ambiente onde a mudança será aplicada
            </p>
          </div>

          {segment === "DB" ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Engine</Label>
                <Select value={dbEngine} onValueChange={setDbEngine}>
                  <SelectTrigger><SelectValue placeholder="Selecione a engine" /></SelectTrigger>
                  <SelectContent>
                    {availableEngines.map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ambiente</Label>
                <Select value={dbEnvironment} onValueChange={setDbEnvironment} disabled={!dbEngine}>
                  <SelectTrigger><SelectValue placeholder={dbEngine ? "Selecione" : "Selecione a engine primeiro"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prod">Produção</SelectItem>
                    <SelectItem value="hom">Homologação</SelectItem>
                    <SelectItem value="qa">QA</SelectItem>
                    <SelectItem value="dev">Desenvolvimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Máquina</Label>
                <Select value={dbMachineId} onValueChange={setDbMachineId} disabled={!dbEngine}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {machines?.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>{m.hostname}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Instância</Label>
                <Select value={dbInstanceId} onValueChange={setDbInstanceId} disabled={!dbEngine}>
                  <SelectTrigger><SelectValue placeholder={dbEngine ? "Selecione" : "Selecione a engine primeiro"} /></SelectTrigger>
                  <SelectContent>
                    {dbInstances?.map((i: any) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.instance_name}{i.version ? ` (${i.version})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Produto</Label>
                <Select value={appProductId} onValueChange={setAppProductId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                  <SelectContent>
                    {appProducts?.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ambiente</Label>
                <Select value={appEnvironment} onValueChange={setAppEnvironment} disabled={!appProductId}>
                  <SelectTrigger><SelectValue placeholder={appProductId ? "Selecione" : "Selecione o produto primeiro"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prod">Produção</SelectItem>
                    <SelectItem value="hom">Homologação</SelectItem>
                    <SelectItem value="qa">QA</SelectItem>
                    <SelectItem value="dev">Desenvolvimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Máquina</Label>
                <Select value={appMachineId} onValueChange={setAppMachineId} disabled={!appProductId}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {machines?.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>{m.hostname}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Instância</Label>
                <Select value={appInstanceId} onValueChange={setAppInstanceId} disabled={!appProductId}>
                  <SelectTrigger><SelectValue placeholder={appProductId ? "Selecione" : "Selecione o produto primeiro"} /></SelectTrigger>
                  <SelectContent>
                    {appInstances?.map((i: any) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.version} - {i.environment}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}

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
          onClick={() => handleSubmit("rascunho")}
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

function RFCSegmentRadio({
  clientId,
  value,
  onChange,
}: {
  clientId: string;
  value: "DB" | "APP";
  onChange: (v: "DB" | "APP") => void;
}) {
  const { segments } = useAvailableSegments(clientId || null);
  useEffect(() => {
    if (segments.length > 0 && !segments.includes(value)) {
      onChange(segments[0] as "DB" | "APP");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments.join(",")]);

  const allowDB = segments.includes("DB");
  const allowAPP = segments.includes("APP");

  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as "DB" | "APP")}
      className="flex gap-6"
    >
      {allowDB && (
        <div className="flex items-center gap-2">
          <RadioGroupItem value="DB" id="rfc-seg-db" />
          <Label htmlFor="rfc-seg-db" className="cursor-pointer font-normal">
            Banco de Dados
          </Label>
        </div>
      )}
      {allowAPP && (
        <div className="flex items-center gap-2">
          <RadioGroupItem value="APP" id="rfc-seg-app" />
          <Label htmlFor="rfc-seg-app" className="cursor-pointer font-normal">
            Application
          </Label>
        </div>
      )}
    </RadioGroup>
  );
}
