import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveSegments } from "@/hooks/useSegments";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { TicketCreatedDialog } from "./TicketCreatedDialog";
import { FileUploadZone, FileWithPreview } from "./FileUploadZone";
import FAQSelector from "./FAQSelector";
import RFCFormSection from "./RFCFormSection";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle, Database, Package, ListOrdered } from "lucide-react";
import { format } from "date-fns";

const ticketSchema = z.object({
  segment: z.string().min(1, "Selecione um segmento"),
  client_id: z.string().uuid("Selecione um cliente"),
  title: z.string().min(1, "Título é obrigatório").max(100, "Máximo 100 caracteres"),
  queue_id: z.string().uuid().optional().nullable(),
  ticket_type: z.enum(["incidente", "duvida", "problema", "service_request"]),
  priority: z.enum(["P1", "P2", "P3", "P4"]),
  category: z.string().min(1, "Categoria é obrigatória"),
  subcategory: z.string().optional(),
  opening_reason: z.string().min(1, "Motivo da abertura é obrigatório"),
  problem_faced: z.string().min(1, "Problema enfrentado é obrigatório"),
  error_displayed: z.string().optional(),
  started_at: z.string().min(1, "Data de início é obrigatória"),
  frequency: z.enum(["pontual", "intermitente", "continuo"]),
  business_impact: z.enum(["nenhum", "baixo", "medio", "alto", "critico"]),
  reproduction_steps: z.string().min(1, "Passos para reprodução são obrigatórios"),
  workaround: z.string().optional(),
  faq_article_id: z.string().uuid().optional().nullable(),
  db_engine: z.enum(["Oracle", "PostgreSQL", "MySQL", "MongoDB", "SQL Server"]).optional(),
  db_instance_id: z.string().uuid().optional(),
  db_machine_id: z.string().uuid().optional(),
  db_environment: z.enum(["prod", "hom", "qa", "dev"]).optional(),
  app_product_id: z.string().uuid().optional(),
  app_instance_id: z.string().uuid().optional(),
  app_module: z.string().optional(),
  app_machine_id: z.string().uuid().optional(),
  app_environment: z.enum(["prod", "hom", "qa", "dev"]).optional(),
  app_version: z.string().optional(),
}).refine(
  (data) => {
    if (data.segment === "DB") {
      return !!data.db_engine && !!data.db_instance_id;
    }
    return true;
  },
  { message: "Engine e Instância DB são obrigatórios para segmento DB", path: ["db_instance_id"] }
).refine(
  (data) => {
    if (data.segment === "APP") {
      return !!data.app_product_id && !!data.app_instance_id;
    }
    return true;
  },
  { message: "Produto e Instância APP são obrigatórios para segmento APP", path: ["app_instance_id"] }
);

type TicketFormData = z.infer<typeof ticketSchema>;

interface NewTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewTicketDialog({ open, onOpenChange }: NewTicketDialogProps) {
  const { profile, tenantId, hasRole, isOtimizzoUser, isSuperAdmin, isTenantAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [recordType, setRecordType] = useState<"suporte" | "rfc">("suporte");
  const [segment, setSegment] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<any>(null);
  const [uploadFiles, setUploadFiles] = useState<FileWithPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Usar profile.client_id como fonte primária (carrega antes dos roles)
  const effectiveTenantId = tenantId || profile?.client_id || null;

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      segment: "DB",
      client_id: effectiveTenantId || "",
      frequency: "pontual",
      business_impact: "medio",
      ticket_type: "incidente",
      priority: "P3",
      started_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    },
  });

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = form;

  const selectedClientId = watch("client_id");
  const selectedDbEngine = watch("db_engine");
  const selectedDbEnvironment = watch("db_environment");
  const selectedDbMachineId = watch("db_machine_id");
  const selectedAppProductId = watch("app_product_id");

  // Fetch current tenant data to get segments
  // Usar effectiveTenantId para habilitar a query assim que profile carregar (antes dos roles)
  const { data: currentTenant } = useQuery({
    queryKey: ["current-tenant", effectiveTenantId],
    queryFn: async () => {
      if (!effectiveTenantId) return null;
      
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, segments, tenant_type, db_engines, app_product_ids")
        .eq("id", effectiveTenantId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveTenantId,
  });

  const isOtimizzoTenant = currentTenant?.tenant_type === 'otimizzo';

  // Check if analyst (not super_admin/tenant_admin) to restrict by queues
  const isAnalystOnly = isOtimizzoUser && (hasRole('analyst_db') || hasRole('analyst_app')) && !isSuperAdmin && !isTenantAdmin;

  // Derive analyst segments from roles instead of team
  const analystSegments: string[] = [];
  if (isAnalystOnly) {
    if (hasRole('analyst_db')) analystSegments.push('DB');
    if (hasRole('analyst_app')) analystSegments.push('APP');
  }

  // Fetch analyst's assigned queues from user_queues
  const { data: analystQueues } = useQuery({
    queryKey: ["analyst-user-queues", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("user_queues")
        .select("queue_id")
        .eq("user_id", profile.id);
      if (error) throw error;
      return data.map(uq => uq.queue_id);
    },
    enabled: !!profile?.id && isAnalystOnly,
  });

  // Fetch selected client data (when Otimizzo user selects a different client)
  const { data: selectedClientData } = useQuery({
    queryKey: ["selected-client-data", selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return null;
      
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, segments, db_engines, app_product_ids")
        .eq("id", selectedClientId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedClientId && isOtimizzoTenant,
  });

  // Fetch active segments from database
  const { data: allSegments } = useActiveSegments();

  // Determine available data based on context:
  // - If Otimizzo user selected another client: use selected client's data
  // - If direct client user: use currentTenant data
  const effectiveClientData = isOtimizzoTenant ? selectedClientData : currentTenant;
  
  // Filter segments available for the client
  const clientSegmentCodes = effectiveClientData?.segments || currentTenant?.segments || [];
  const availableSegments = allSegments?.filter(s => clientSegmentCodes.includes(s.code)) || [];
  const hasOnlyOneSegment = availableSegments.length === 1;
  const availableDbEngines = effectiveClientData?.db_engines || [];

  // For analysts, force segment based on roles
  const analystSegmentForced = isAnalystOnly && analystSegments.length > 0;
  const effectiveAvailableSegments = analystSegmentForced
    ? allSegments?.filter(s => analystSegments.includes(s.code)) || []
    : availableSegments;
  const effectiveHasOnlyOneSegment = effectiveAvailableSegments.length === 1;

  // Initialize segment when tenant loads
  useEffect(() => {
    if (analystSegmentForced) {
      // Force analyst segment and clear client_id (analyst must choose)
      if (analystSegments.length === 1 && segment !== analystSegments[0]) {
        setSegment(analystSegments[0]);
        setValue("segment", analystSegments[0]);
      } else if (segment === null && analystSegments.length > 0) {
        setSegment(analystSegments[0]);
        setValue("segment", analystSegments[0]);
      }
      // Clear the default Otimizzo client_id so analyst must pick a client
      if (watch("client_id") === effectiveTenantId) {
        setValue("client_id", "");
      }
      return;
    }
    if (currentTenant && availableSegments.length > 0 && segment === null) {
      const initialSegment = availableSegments[0].code;
      setSegment(initialSegment);
      
      // Reset form with correct initial values
      reset({
        segment: initialSegment,
        client_id: effectiveTenantId || "",
        frequency: "pontual",
        business_impact: "medio",
        ticket_type: "incidente",
        priority: "P3",
        started_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      });
    }
  }, [currentTenant, availableSegments, segment, reset, effectiveTenantId, analystSegmentForced, analystSegments]);

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name, segments, tenant_type").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Filter clients for analysts: only show clients with matching analyst segments (exclude otimizzo tenant)
  const filteredClients = isAnalystOnly && analystSegments.length > 0
    ? clients?.filter(c => c.tenant_type !== 'otimizzo' && c.segments?.some(s => analystSegments.includes(s)))
    : clients?.filter(c => c.tenant_type !== 'otimizzo');

  // Fetch DB instances (filtra por engine, ambiente e máquina em cascata)
  const { data: dbInstances } = useQuery({
    queryKey: ["db-instances", selectedClientId, selectedDbEngine, selectedDbEnvironment, selectedDbMachineId],
    queryFn: async () => {
      if (!selectedClientId || !selectedDbEngine || segment !== "DB") return [];
      let query = supabase
        .from("database_instances")
        .select("id, instance_name, version, environment, machine_id")
        .eq("client_id", selectedClientId)
        .eq("engine", selectedDbEngine);
      if (selectedDbEnvironment) {
        query = query.eq("environment", selectedDbEnvironment);
      }
      if (selectedDbMachineId) {
        query = query.eq("machine_id", selectedDbMachineId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedClientId && !!selectedDbEngine && segment === "DB",
  });

  // Fetch APP products filtrados por cliente
  const { data: appProducts } = useQuery({
    queryKey: ["app-products", selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      if (segment === null) return []; // Aguardando tenant carregar
      if (segment !== "APP") return [];
      
      // Buscar os product_ids do cliente
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("app_product_ids")
        .eq("id", selectedClientId)
        .single();
      
      if (clientError) throw clientError;
      
      const productIds = clientData?.app_product_ids || [];
      if (productIds.length === 0) return [];
      
      // Buscar apenas os produtos do cliente
      const { data, error } = await supabase
        .from("application_products")
        .select("id, name")
        .in("id", productIds)
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedClientId && segment === "APP",
  });

  // Fetch APP instances
  const { data: appInstances } = useQuery({
    queryKey: ["app-instances", selectedClientId, selectedAppProductId],
    queryFn: async () => {
      if (!selectedClientId || !selectedAppProductId || segment !== "APP") return [];
      const { data, error } = await supabase
        .from("application_instances")
        .select("id, version, environment")
        .eq("client_id", selectedClientId)
        .eq("product_id", selectedAppProductId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedClientId && !!selectedAppProductId && segment === "APP",
  });

  // Fetch machines (para DB: filtra por engine via database_instances e por ambiente)
  const { data: machines } = useQuery({
    queryKey: ["machines", selectedClientId, segment, selectedDbEngine, selectedDbEnvironment],
    queryFn: async () => {
      if (!selectedClientId) return [];

      // Para segmento DB, filtra máquinas que possuem instâncias com o engine selecionado
      if (segment === "DB" && selectedDbEngine) {
        let instQuery = supabase
          .from("database_instances")
          .select("machine_id")
          .eq("client_id", selectedClientId)
          .eq("engine", selectedDbEngine)
          .not("machine_id", "is", null);
        if (selectedDbEnvironment) {
          instQuery = instQuery.eq("environment", selectedDbEnvironment);
        }
        const { data: instData, error: instError } = await instQuery;
        if (instError) throw instError;
        const machineIds = Array.from(new Set((instData || []).map((i: any) => i.machine_id).filter(Boolean)));
        if (machineIds.length === 0) return [];

        let machQuery = supabase
          .from("machines")
          .select("id, hostname, environment")
          .eq("client_id", selectedClientId)
          .in("id", machineIds);
        if (selectedDbEnvironment) {
          machQuery = machQuery.eq("environment", selectedDbEnvironment);
        }
        const { data, error } = await machQuery;
        if (error) throw error;
        return data;
      }

      // Comportamento padrão (APP ou sem engine selecionado)
      let query = supabase
        .from("machines")
        .select("id, hostname, environment")
        .eq("client_id", selectedClientId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedClientId,
  });

  // Fetch active queues
  const { data: queues } = useQuery({
    queryKey: ["queues-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("queues")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // Fetch ticket categories filtered by segment
  const { data: categories } = useQuery({
    queryKey: ["ticket-categories", segment],
    queryFn: async () => {
      if (!segment) return [];
      const { data, error } = await supabase
        .from("ticket_categories")
        .select("id, name, segment")
        .eq("is_active", true)
        .or(`segment.is.null,segment.eq.${segment}`)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!segment,
  });

  // Get selected category id
  const selectedCategoryName = watch("category");
  const selectedCategoryId = categories?.find(c => c.name === selectedCategoryName)?.id;

  // Fetch subcategories filtered by selected category
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
    enabled: !!selectedCategoryId,
  });

  // Mapeamento de engine para nome de fila
  const engineToQueueName: Record<string, string> = {
    'Oracle': 'Oracle',
    'PostgreSQL': 'PostgreSQL',
    'MySQL': 'MySQL',
    'MongoDB': 'MongoDB',
    'SQL Server': 'SQLServer',
  };

  // Auto-atribuir fila baseado em segment e engine
  useEffect(() => {
    if (!queues || queues.length === 0) return;

    if (segment === "APP") {
      // Para APP, buscar fila "Aplicações"
      const appQueue = queues.find(q => q.name === "Aplicações");
      if (appQueue) {
        setValue("queue_id", appQueue.id);
      }
    } else if (segment === "DB" && selectedDbEngine) {
      // Para DB, buscar fila correspondente ao engine
      const queueName = engineToQueueName[selectedDbEngine];
      if (queueName) {
        const matchedQueue = queues.find(q => q.name === queueName);
        if (matchedQueue) {
          setValue("queue_id", matchedQueue.id);
        }
      }
    }
  }, [segment, selectedDbEngine, queues, setValue]);

  // Auto-selecionar produto quando houver apenas 1
  useEffect(() => {
    if (appProducts && appProducts.length === 1 && segment === "APP") {
      setValue("app_product_id", appProducts[0].id);
    }
  }, [appProducts, segment, setValue]);

  // Auto-selecionar instância quando houver apenas 1
  useEffect(() => {
    if (appInstances && appInstances.length === 1 && segment === "APP") {
      setValue("app_instance_id", appInstances[0].id);
    }
  }, [appInstances, segment, setValue]);

  // Auto-selecionar engine quando houver apenas 1
  useEffect(() => {
    if (availableDbEngines.length === 1 && segment === "DB") {
      setValue("db_engine", availableDbEngines[0] as any);
    }
  }, [availableDbEngines, segment, setValue]);

  // Limpar campos dependentes quando cliente muda (para usuários Otimizzo)
  useEffect(() => {
    if (isOtimizzoTenant && selectedClientId) {
      // Limpar campos DB
      setValue("db_engine", undefined);
      setValue("db_instance_id", undefined);
      setValue("db_machine_id", undefined);
      setValue("db_environment", undefined);
      // Limpar campos APP
      setValue("app_product_id", undefined);
      setValue("app_instance_id", undefined);
      setValue("app_machine_id", undefined);
      setValue("app_environment", undefined);
      setValue("app_module", undefined);
      setValue("app_version", undefined);
      // Limpar categoria/subcategoria
      setValue("category", "");
      setValue("subcategory", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId]);

  const createTicketMutation = useMutation({
    mutationFn: async (data: TicketFormData) => {
      // Get current user data
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Erro ao identificar usuário");
      }

      const ticketData: any = {
        segment: data.segment,
        client_id: data.client_id,
        contact_name: profile?.full_name || user.email || "Usuário",
        contact_email: user.email || "",
        title: data.title,
        ticket_type: data.ticket_type,
        priority: data.priority,
        category: data.category,
        subcategory: data.subcategory,
        opening_reason: data.opening_reason,
        problem_faced: data.problem_faced,
        error_displayed: data.error_displayed,
        started_at: new Date(data.started_at).toISOString(),
        frequency: data.frequency,
        business_impact: data.business_impact,
        reproduction_steps: data.reproduction_steps,
        workaround: data.workaround,
        faq_article_id: data.faq_article_id || null,
        queue_id: data.queue_id || null,
      };

      if (data.segment === "DB") {
        ticketData.db_engine = data.db_engine;
        ticketData.db_instance_id = data.db_instance_id;
        ticketData.db_machine_id = data.db_machine_id;
        ticketData.db_environment = data.db_environment;
      } else {
        ticketData.app_product_id = data.app_product_id;
        ticketData.app_instance_id = data.app_instance_id;
        ticketData.app_module = data.app_module;
        ticketData.app_machine_id = data.app_machine_id;
        ticketData.app_environment = data.app_environment;
        ticketData.app_version = data.app_version;
      }

      const { data: ticket, error } = await supabase.from("tickets").insert(ticketData).select().single();
      if (error) throw error;
      return ticket;
    },
    onSuccess: (ticket) => {
      setCreatedTicket(ticket);
      setShowSuccessDialog(true);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar ticket",
        description: error.message || "Ocorreu um erro ao criar o ticket. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: TicketFormData) => {
    console.log("📝 Criando ticket com dados:", data);
    console.log("❌ Erros de validação:", errors);

    try {
      const ticket = await createTicketMutation.mutateAsync(data);
      
      if (!ticket) {
        throw new Error("Ticket não foi criado");
      }

      if (uploadFiles.length > 0) {
        setIsUploading(true);
        console.log(`📤 Fazendo upload de ${uploadFiles.length} arquivos...`);

        const uploadedEvidences = await uploadTicketFiles(
          ticket.client_id,
          ticket.ticket_number,
          uploadFiles
        );

        const { error: updateError } = await supabase
          .from("tickets")
          .update({ evidences: uploadedEvidences as any })
          .eq("id", ticket.id);

        if (updateError) throw updateError;

        console.log("✅ Evidências salvas com sucesso!");
      }

      setCreatedTicket(ticket);
      setShowSuccessDialog(true);
      setUploadFiles([]);
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    } catch (error: any) {
      console.error("❌ Erro:", error);
      toast({
        title: "Erro ao criar ticket",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  interface Evidence {
    name: string;
    path: string;
    url: string;
    type: string;
    size: number;
    uploaded_at: string;
  }

  async function uploadTicketFiles(
    clientId: string,
    ticketNumber: string,
    files: FileWithPreview[]
  ): Promise<Evidence[]> {
    const evidences: Evidence[] = [];

    for (const fileItem of files) {
      const filePath = `${clientId}/${ticketNumber}/${fileItem.file.name}`;

      const { data, error } = await supabase.storage
        .from("tickets")
        .upload(filePath, fileItem.file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error(`❌ Erro ao fazer upload de ${fileItem.file.name}:`, error);
        throw error;
      }

      // Use signed URL for secure access (valid for 7 days)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("tickets")
        .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days

      if (signedUrlError) {
        console.error(`❌ Erro ao gerar URL assinada para ${fileItem.file.name}:`, signedUrlError);
        throw signedUrlError;
      }

      evidences.push({
        name: fileItem.file.name,
        path: filePath, // Store path for regenerating signed URLs
        url: signedUrlData.signedUrl,
        type: fileItem.file.type,
        size: fileItem.file.size,
        uploaded_at: new Date().toISOString(),
      });
    }

    return evidences;
  }

  const handleSegmentChange = (value: string) => {
    setSegment(value);
    setValue("segment", value);
    setValue("category", ""); // Clear category when segment changes
    setValue("subcategory", ""); // Clear subcategory when segment changes
  };

  const handleCategoryChange = (value: string) => {
    setValue("category", value);
    setValue("subcategory", ""); // Clear subcategory when category changes
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Registro</DialogTitle>
        </DialogHeader>

        {/* Seletor de Tipo de Registro */}
        <Tabs value={recordType} onValueChange={(v) => setRecordType(v as "suporte" | "rfc")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="suporte">Suporte</TabsTrigger>
            <TabsTrigger value="rfc">RFC (Interno)</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Formulário RFC */}
        {recordType === "rfc" && (
          <RFCFormSection
            onSuccess={(ticket) => {
              setCreatedTicket(ticket);
              setShowSuccessDialog(true);
              queryClient.invalidateQueries({ queryKey: ["tickets"] });
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}

        {/* Formulário Suporte (fluxo existente) */}
        {recordType === "suporte" && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Analyst without queues warning */}
          {isAnalystOnly && (!analystQueues || analystQueues.length === 0) && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>Você precisa ter filas de atendimento atribuídas antes de abrir tickets. Contate o administrador.</span>
            </div>
          )}

          {/* 1. Cliente (apenas para Otimizzo) */}
          {isOtimizzoTenant && (
            <div className="space-y-2">
              <Label htmlFor="client_id">Cliente *</Label>
              <Select
                value={watch("client_id")}
                onValueChange={(value) => setValue("client_id", value)}
                disabled={isAnalystOnly && (!analystQueues || analystQueues.length === 0)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {filteredClients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.client_id && <p className="text-sm text-destructive">{errors.client_id.message}</p>}
            </div>
          )}

          {/* 2. Segmento — sempre visível para cliente; para Otimizzo só após escolher cliente */}
          {(!isOtimizzoTenant || selectedClientId) && (
            effectiveHasOnlyOneSegment ? (
              <div className="space-y-2">
                <Label>Segmento *</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    value={effectiveAvailableSegments[0]?.display_name || ""}
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">
                    {analystSegmentForced ? "(Segmento da sua equipe)" : "(Segmento único disponível)"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Segmento *</Label>
                <Select value={segment || ""} onValueChange={handleSegmentChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o segmento" />
                  </SelectTrigger>
                  <SelectContent>
                    {effectiveAvailableSegments.map((seg) => (
                      <SelectItem key={seg.id} value={seg.code}>
                        {seg.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          )}

          {/* 3. Tipo + Prioridade + Categoria */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ticket_type">Tipo *</Label>
              <Select value={watch("ticket_type")} onValueChange={(value: any) => setValue("ticket_type", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incidente">Incidente</SelectItem>
                  <SelectItem value="problema">Problema</SelectItem>
                  <SelectItem value="duvida">Dúvida</SelectItem>
                  <SelectItem value="service_request">Service Request</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade *</Label>
              <Select value={watch("priority")} onValueChange={(value: any) => setValue("priority", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P1">P1 - Crítica</SelectItem>
                  <SelectItem value="P2">P2 - Alta</SelectItem>
                  <SelectItem value="P3">P3 - Média</SelectItem>
                  <SelectItem value="P4">P4 - Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select value={watch("category")} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
            </div>
          </div>

          {/* 4. FAQ Selector - aparece após selecionar cliente */}
          {selectedClientId && (
            <FAQSelector
              clientId={selectedClientId}
              segment={segment}
              selectedFAQId={watch("faq_article_id")}
              onSelectFAQ={(id) => setValue("faq_article_id", id)}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input {...register("title")} placeholder="Descreva brevemente o problema" />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          {/* Queue Selector - only for Otimizzo users, filtered by analyst assignment */}
          {(() => {
            const availableQueues = isAnalystOnly && analystQueues && analystQueues.length > 0
              ? queues?.filter(q => analystQueues.includes(q.id))
              : queues;
            return isOtimizzoUser && availableQueues && availableQueues.length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor="queue_id" className="flex items-center gap-2">
                  <ListOrdered className="h-4 w-4" />
                  Fila de Atendimento
                </Label>
                <Select
                  value={watch("queue_id") || ""}
                  onValueChange={(value) => setValue("queue_id", value || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma fila (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableQueues.map((queue) => (
                      <SelectItem key={queue.id} value={queue.id}>
                        {queue.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Direciona o ticket para a fila de atendimento específica
                </p>
              </div>
            ) : null;
          })()}

          {/* Subcategory - only show if category is selected and has subcategories */}
          {selectedCategoryId && subcategories && subcategories.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategoria</Label>
              <Select value={watch("subcategory") || ""} onValueChange={(value) => setValue("subcategory", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a subcategoria (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {subcategories.map((sub) => (
                    <SelectItem key={sub.id} value={sub.name}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* DB Specific Fields */}
          {segment === "DB" && (
            <>
              {/* Aviso se não houver engines cadastradas */}
              {availableDbEngines.length === 0 && (
                isOtimizzoUser ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-900 mb-1">
                        Nenhuma engine de banco de dados cadastrada
                      </p>
                      <p className="text-sm text-amber-700 mb-2">
                        Cadastre as engines de banco de dados para este cliente antes de criar o ticket.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open('/clients', '_blank')}
                        className="text-amber-900 border-amber-300 hover:bg-amber-100"
                      >
                        <Database className="mr-2 h-4 w-4" />
                        Cadastrar Engines
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 mb-1">
                        Nenhuma engine de banco de dados disponível
                      </p>
                      <p className="text-sm text-blue-700">
                        Entre em contato com o suporte Otimizzo para que possamos cadastrar as engines de banco de dados necessárias para seu ambiente.
                      </p>
                    </div>
                  </div>
                )
              )}

              {/* Aviso se não houver instâncias */}
              {dbInstances?.length === 0 && selectedDbEngine && (
                isOtimizzoUser ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-900 mb-1">
                        Nenhuma instância DB cadastrada
                      </p>
                      <p className="text-sm text-amber-700 mb-2">
                        Cadastre uma instância de banco de dados para este cliente antes de criar o ticket.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open('/databases', '_blank')}
                        className="text-amber-900 border-amber-300 hover:bg-amber-100"
                      >
                        <Database className="mr-2 h-4 w-4" />
                        Cadastrar Instância DB
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 mb-1">
                        Nenhuma instância DB disponível
                      </p>
                      <p className="text-sm text-blue-700">
                        Entre em contato com o suporte Otimizzo para que possamos cadastrar as instâncias de banco de dados necessárias para seu ambiente.
                      </p>
                    </div>
                  </div>
                )
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Engine: esconder se houver apenas 1 */}
                {availableDbEngines.length === 1 ? (
                  <div className="space-y-2">
                    <Label>Engine *</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        value={availableDbEngines[0]}
                        disabled
                        className="bg-muted cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        (Engine única)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="db_engine">Engine *</Label>
                    <Select value={watch("db_engine")} onValueChange={(value: any) => setValue("db_engine", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a engine" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDbEngines.map((engine) => (
                          <SelectItem key={engine} value={engine}>
                            {engine}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.db_engine && <p className="text-sm text-destructive">{errors.db_engine.message}</p>}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="db_instance_id">Instância DB *</Label>
                  <Select value={watch("db_instance_id")} onValueChange={(value) => setValue("db_instance_id", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a instância" />
                    </SelectTrigger>
                    <SelectContent>
                      {dbInstances?.map((instance) => (
                        <SelectItem key={instance.id} value={instance.id}>
                          {instance.instance_name} ({instance.version})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.db_instance_id && <p className="text-sm text-destructive">{errors.db_instance_id.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="db_environment">Ambiente</Label>
                  <Select value={watch("db_environment")} onValueChange={(value: any) => setValue("db_environment", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o ambiente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prod">Produção</SelectItem>
                      <SelectItem value="hom">Homologação</SelectItem>
                      <SelectItem value="qa">QA</SelectItem>
                      <SelectItem value="dev">Desenvolvimento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="db_machine_id">Máquina</Label>
                  <Select value={watch("db_machine_id")} onValueChange={(value) => setValue("db_machine_id", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a máquina (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {machines?.map((machine) => (
                        <SelectItem key={machine.id} value={machine.id}>
                          {machine.hostname}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* APP Specific Fields */}
          {segment === "APP" && (
            <>
              {/* Aviso se não houver instâncias */}
              {appInstances?.length === 0 && selectedAppProductId && (
                isOtimizzoUser ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-900 mb-1">
                        Nenhuma instância APP cadastrada
                      </p>
                      <p className="text-sm text-amber-700 mb-2">
                        Cadastre uma instância de aplicação para este cliente antes de criar o ticket.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open('/applications', '_blank')}
                        className="text-amber-900 border-amber-300 hover:bg-amber-100"
                      >
                        <Package className="mr-2 h-4 w-4" />
                        Cadastrar Instância APP
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 mb-1">
                        Nenhuma instância APP disponível
                      </p>
                      <p className="text-sm text-blue-700">
                        Entre em contato com o suporte Otimizzo para que possamos cadastrar as instâncias de aplicação necessárias para seu ambiente.
                      </p>
                    </div>
                  </div>
                )
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Produto: esconder se houver apenas 1 */}
                {appProducts && appProducts.length === 1 ? (
                  <div className="space-y-2">
                    <Label>Produto *</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        value={appProducts[0].name}
                        disabled
                        className="bg-muted cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        (Produto único)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="app_product_id">Produto *</Label>
                    <Select value={watch("app_product_id")} onValueChange={(value) => setValue("app_product_id", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {appProducts?.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.app_product_id && <p className="text-sm text-destructive">{errors.app_product_id.message}</p>}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="app_instance_id">Instância APP *</Label>
                  <Select value={watch("app_instance_id")} onValueChange={(value) => setValue("app_instance_id", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a instância" />
                    </SelectTrigger>
                    <SelectContent>
                      {appInstances?.map((instance) => (
                        <SelectItem key={instance.id} value={instance.id}>
                          {instance.version} - {instance.environment}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.app_instance_id && <p className="text-sm text-destructive">{errors.app_instance_id.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="app_module">Módulo</Label>
                  <Input {...register("app_module")} placeholder="Ex: Financeiro" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="app_environment">Ambiente</Label>
                  <Select value={watch("app_environment")} onValueChange={(value: any) => setValue("app_environment", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o ambiente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prod">Produção</SelectItem>
                      <SelectItem value="hom">Homologação</SelectItem>
                      <SelectItem value="qa">QA</SelectItem>
                      <SelectItem value="dev">Desenvolvimento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="app_machine_id">Máquina</Label>
                  <Select value={watch("app_machine_id")} onValueChange={(value) => setValue("app_machine_id", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      {machines?.map((machine) => (
                        <SelectItem key={machine.id} value={machine.id}>
                          {machine.hostname}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* Symptom Fields */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">Detalhes do Problema</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="opening_reason">Motivo da Abertura *</Label>
                <Input {...register("opening_reason")} placeholder="Ex: Sistema fora do ar" />
                {errors.opening_reason && <p className="text-sm text-destructive">{errors.opening_reason.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="problem_faced">Problema Enfrentado *</Label>
                <Input {...register("problem_faced")} placeholder="Descreva o problema" />
                {errors.problem_faced && <p className="text-sm text-destructive">{errors.problem_faced.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="error_displayed">Erro Exibido</Label>
                <Textarea {...register("error_displayed")} placeholder="Cole a mensagem de erro completa (opcional)" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="started_at">Iniciou Em *</Label>
                  <Input
                    type="datetime-local"
                    {...register("started_at")}
                  />
                  {errors.started_at && <p className="text-sm text-destructive">{errors.started_at.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequência *</Label>
                  <Select value={watch("frequency")} onValueChange={(value: any) => setValue("frequency", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pontual">Pontual</SelectItem>
                      <SelectItem value="intermitente">Intermitente</SelectItem>
                      <SelectItem value="continuo">Contínuo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_impact">Impacto no Negócio *</Label>
                  <Select value={watch("business_impact")} onValueChange={(value: any) => setValue("business_impact", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhum">Nenhum</SelectItem>
                      <SelectItem value="baixo">Baixo</SelectItem>
                      <SelectItem value="medio">Médio</SelectItem>
                      <SelectItem value="alto">Alto</SelectItem>
                      <SelectItem value="critico">Crítico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reproduction_steps">Passos para Reprodução *</Label>
                <Textarea {...register("reproduction_steps")} placeholder="1. Acesse a tela X&#10;2. Clique no botão Y&#10;3. Observe o erro Z" />
                {errors.reproduction_steps && <p className="text-sm text-destructive">{errors.reproduction_steps.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="workaround">Workaround (Solução Temporária)</Label>
                <Textarea {...register("workaround")} placeholder="Existe alguma forma de contornar o problema temporariamente? (opcional)" />
              </div>
            </div>
          </div>

          {/* Seção de Upload de Evidências */}
          <div className="space-y-2">
            <Label>Anexos / Evidências (Opcional)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Adicione capturas de tela, logs ou documentos que ajudem a entender o problema
            </p>
            <FileUploadZone
              files={uploadFiles}
              onFilesChange={setUploadFiles}
              maxFiles={10}
              maxSizeMB={10}
            />
          </div>

          {/* Debug: mostrar todos os erros */}
          {Object.keys(errors).length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="font-semibold text-destructive mb-2">
                ⚠️ Corrija os seguintes erros:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-destructive">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field}>
                    <strong>{field}:</strong> {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={
                isSubmitting || 
                isUploading ||
                (isAnalystOnly && (!analystQueues || analystQueues.length === 0)) ||
                (segment === "DB" && dbInstances?.length === 0 && !!selectedDbEngine) ||
                (segment === "APP" && appInstances?.length === 0 && !!selectedAppProductId)
              }
            >
              {(isSubmitting || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Ticket
            </Button>
          </div>
        </form>
        )} {/* end recordType === "suporte" */}
      </DialogContent>
    </Dialog>

    {createdTicket && (
      <TicketCreatedDialog
        open={showSuccessDialog}
        onOpenChange={setShowSuccessDialog}
        ticketNumber={createdTicket.ticket_number}
        ticketId={createdTicket.id}
      />
    )}
    </>
  );
}
