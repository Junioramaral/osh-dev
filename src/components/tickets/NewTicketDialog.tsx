import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

const ticketSchema = z.object({
  segment: z.enum(["DB", "APP"]),
  client_id: z.string().uuid("Selecione um cliente"),
  title: z.string().min(1, "Título é obrigatório").max(100, "Máximo 100 caracteres"),
  description: z.string().optional(),
  ticket_type: z.enum(["incidente", "duvida", "solicitacao"]),
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
  const { profile, tenantId, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [segment, setSegment] = useState<"DB" | "APP">("DB");

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      segment: "DB",
      client_id: tenantId || "",
      frequency: "pontual",
      business_impact: "medio",
      ticket_type: "incidente",
      priority: "P3",
    },
  });

  const selectedClientId = watch("client_id");
  const selectedDbEngine = watch("db_engine");
  const selectedAppProductId = watch("app_product_id");

  // Fetch current tenant data to get segments
  const { data: currentTenant } = useQuery({
    queryKey: ["current-tenant", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, segments, tenant_type")
        .eq("id", tenantId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Determine available segments
  const availableSegments = currentTenant?.segments || [];
  const hasOnlyOneSegment = availableSegments.length === 1;
  const isOtimizzoTenant = currentTenant?.tenant_type === 'otimizzo';

  // Auto-set segment if tenant has only one
  useEffect(() => {
    if (currentTenant && availableSegments.length > 0) {
      const initialSegment = availableSegments[0] as "DB" | "APP";
      setSegment(initialSegment);
      setValue("segment", initialSegment);
    }
  }, [currentTenant, setValue]);

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch DB instances
  const { data: dbInstances } = useQuery({
    queryKey: ["db-instances", selectedClientId, selectedDbEngine],
    queryFn: async () => {
      if (!selectedClientId || !selectedDbEngine || segment !== "DB") return [];
      let query = supabase
        .from("database_instances")
        .select("id, instance_name, version")
        .eq("client_id", selectedClientId)
        .eq("engine", selectedDbEngine);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedClientId && !!selectedDbEngine && segment === "DB",
  });

  // Fetch APP products
  const { data: appProducts } = useQuery({
    queryKey: ["app-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_products")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: segment === "APP",
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

  // Fetch machines
  const { data: machines } = useQuery({
    queryKey: ["machines", selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      const { data, error } = await supabase
        .from("machines")
        .select("id, hostname")
        .eq("client_id", selectedClientId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedClientId,
  });

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
        description: data.description,
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
    onSuccess: () => {
      toast({
        title: "Ticket criado com sucesso!",
        description: "O ticket foi registrado e será atendido em breve.",
      });
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

  const onSubmit = (data: TicketFormData) => {
    createTicketMutation.mutate(data);
  };

  const handleSegmentChange = (value: "DB" | "APP") => {
    setSegment(value);
    setValue("segment", value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Ticket</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Segment Selection */}
          {hasOnlyOneSegment ? (
            <div className="space-y-2">
              <Label>Segmento *</Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={segment === "DB" ? "Banco de Dados" : "Aplicação"}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  (Segmento único disponível)
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Segmento *</Label>
              <Select value={segment} onValueChange={handleSegmentChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableSegments.includes("DB") && (
                    <SelectItem value="DB">Banco de Dados</SelectItem>
                  )}
                  {availableSegments.includes("APP") && (
                    <SelectItem value="APP">Aplicação</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Common Fields */}
          <div className="grid grid-cols-2 gap-4">
            {isOtimizzoTenant && (
              <div className="space-y-2">
                <Label htmlFor="client_id">Cliente *</Label>
                <Select
                  value={watch("client_id")}
                  onValueChange={(value) => setValue("client_id", value)}
                  disabled={!hasRole('super_admin') && !hasRole('tenant_admin')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.client_id && <p className="text-sm text-destructive">{errors.client_id.message}</p>}
              </div>
            )}

          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input {...register("title")} placeholder="Descreva brevemente o problema" />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea {...register("description")} placeholder="Detalhes adicionais (opcional)" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ticket_type">Tipo *</Label>
              <Select value={watch("ticket_type")} onValueChange={(value: any) => setValue("ticket_type", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incidente">Incidente</SelectItem>
                  <SelectItem value="duvida">Dúvida</SelectItem>
                  <SelectItem value="solicitacao">Solicitação</SelectItem>
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
              <Input {...register("category")} placeholder="Ex: Erro SQL" />
              {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
            </div>
          </div>

          {/* DB Specific Fields */}
          {segment === "DB" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="db_engine">Engine *</Label>
                  <Select value={watch("db_engine")} onValueChange={(value: any) => setValue("db_engine", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o engine" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Oracle">Oracle</SelectItem>
                      <SelectItem value="PostgreSQL">PostgreSQL</SelectItem>
                      <SelectItem value="MySQL">MySQL</SelectItem>
                      <SelectItem value="MongoDB">MongoDB</SelectItem>
                      <SelectItem value="SQL Server">SQL Server</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.db_engine && <p className="text-sm text-destructive">{errors.db_engine.message}</p>}
                </div>

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
              <div className="grid grid-cols-2 gap-4">
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
                    defaultValue={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
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

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Ticket
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
