import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Loader2, Database, Package, Mail, FolderKanban } from "lucide-react";
import ClientProjectsTab from "./ClientProjectsTab";
import { formatCnpj } from "@/lib/cnpjUtils";
import { TenantUsersManager } from "@/components/tenants/TenantUsersManager";
import { TenantUserReport } from "@/components/tenants/TenantUserReport";

// Ícones SVG específicos para cada engine de banco de dados
const DatabaseEngineIcon = ({ engine }: { engine: string }) => {
  const iconProps = { className: "h-4 w-4 flex-shrink-0" };
  
  switch (engine) {
    case "PostgreSQL":
      return (
        <svg {...iconProps} viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill="#336791"/>
          <path d="M17.5 14.5c0 2-1.5 3.5-3.5 3.5s-3.5-1.5-3.5-3.5c0-1.5.5-2.5 1-3l2.5-3 2.5 3c.5.5 1 1.5 1 3z" fill="#fff"/>
          <circle cx="12" cy="9" r="2" fill="#fff"/>
        </svg>
      );
    case "MySQL":
      return (
        <svg {...iconProps} viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill="#00758F"/>
          <path d="M8 8c1 0 2 .5 2.5 1.5s.5 2 1.5 2.5c1 .5 2 1 2 2s-.5 2-1.5 2.5-2 .5-2.5 1.5" stroke="#F29111" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          <circle cx="15" cy="10" r="1.5" fill="#F29111"/>
        </svg>
      );
    case "SQL Server":
      return (
        <svg {...iconProps} viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill="#CC2927"/>
          <path d="M7 8h10M7 12h10M7 16h6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );
    case "Oracle":
      return (
        <svg {...iconProps} viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill="#F80000"/>
          <ellipse cx="12" cy="12" rx="6" ry="3" stroke="#fff" strokeWidth="1.5" fill="none"/>
          <path d="M6 12v2c0 1.657 2.686 3 6 3s6-1.343 6-3v-2" stroke="#fff" strokeWidth="1.5" fill="none"/>
        </svg>
      );
    case "MongoDB":
      return (
        <svg {...iconProps} viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill="#47A248"/>
          <path d="M12 6v12M9 9c1.5-1 4.5-1 6 0M9 15c1.5 1 4.5 1 6 0" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );
    default:
      return <Database className="h-4 w-4 text-muted-foreground" />;
  }
};

// Ícones SVG específicos para cada produto de aplicação
const ApplicationProductIcon = ({ productName }: { productName: string }) => {
  const iconProps = { className: "h-4 w-4 flex-shrink-0" };
  
  switch (productName) {
    case "ContaDia":
      // Calculadora - contabilidade (azul)
      return (
        <svg {...iconProps} viewBox="0 0 24 24" fill="none">
          <rect x="4" y="2" width="16" height="20" rx="2" fill="#2563EB"/>
          <rect x="6" y="4" width="12" height="4" rx="1" fill="#fff"/>
          <circle cx="8" cy="11" r="1" fill="#fff"/>
          <circle cx="12" cy="11" r="1" fill="#fff"/>
          <circle cx="16" cy="11" r="1" fill="#fff"/>
          <circle cx="8" cy="15" r="1" fill="#fff"/>
          <circle cx="12" cy="15" r="1" fill="#fff"/>
          <circle cx="16" cy="15" r="1" fill="#fff"/>
          <circle cx="8" cy="19" r="1" fill="#fff"/>
          <circle cx="12" cy="19" r="1" fill="#fff"/>
          <circle cx="16" cy="19" r="1" fill="#fff"/>
        </svg>
      );
    case "LexisFlow":
      // Balança - jurídico (púrpura)
      return (
        <svg {...iconProps} viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill="#7C3AED"/>
          <path d="M12 6v10M8 8l4-2 4 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 12l2-4 2 4H6zM14 12l2-4 2 4h-4z" fill="#fff"/>
          <path d="M10 18h4" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );
    case "Sec4File":
      // Escudo com documento - segurança (verde)
      return (
        <svg {...iconProps} viewBox="0 0 24 24" fill="none">
          <path d="M12 2L4 6v6c0 5.25 3.4 10.15 8 11.25 4.6-1.1 8-6 8-11.25V6l-8-4z" fill="#059669"/>
          <path d="M9 11h6M9 14h4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M10 8h4v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V8z" fill="#fff"/>
        </svg>
      );
    default:
      return <Package className="h-4 w-4 text-muted-foreground" />;
  }
};

import { useCreateClient, useUpdateClient } from "@/hooks/useClientMutations";
import type { Tables } from "@/integrations/supabase/types";

type Client = Tables<"clients">;

const clientSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  cnpj: z.string().nullable().optional(),
  domain: z.string().nullable().optional(),
  status: z.string().default("ativo"),
  tenant_type: z.string().default("customer"),
  segments: z.array(z.string()).default([]),
  db_engines: z.array(z.string()).default([]),
  app_product_ids: z.array(z.string()).default([]),
  max_users: z.coerce.number().min(1, "Mínimo 1 usuário").default(10),
  contract_start_date: z.string().nullable().optional(),
  contract_end_date: z.string().nullable().optional(),
  sla_db_p1_first_response: z.coerce.number().min(1).default(15),
  sla_db_p1_resolution: z.coerce.number().min(1).default(240),
  sla_db_p2_first_response: z.coerce.number().min(1).default(30),
  sla_db_p2_resolution: z.coerce.number().min(1).default(480),
  sla_db_p3_first_response: z.coerce.number().min(1).default(240),
  sla_db_p3_resolution: z.coerce.number().min(1).default(2880),
  sla_db_p4_first_response: z.coerce.number().min(1).default(1400),
  sla_db_p4_resolution: z.coerce.number().min(1).default(4320),
  sla_app_p1_first_response: z.coerce.number().min(1).default(15),
  sla_app_p1_resolution: z.coerce.number().min(1).default(240),
  sla_app_p2_first_response: z.coerce.number().min(1).default(30),
  sla_app_p2_resolution: z.coerce.number().min(1).default(480),
  sla_app_p3_first_response: z.coerce.number().min(1).default(240),
  sla_app_p3_resolution: z.coerce.number().min(1).default(2880),
  sla_app_p4_first_response: z.coerce.number().min(1).default(1400),
  sla_app_p4_resolution: z.coerce.number().min(1).default(4320),
  receive_monthly_report: z.boolean().default(false),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  client: Client | null;
}

export default function ClientDialog({ open, onOpenChange, mode, client }: ClientDialogProps) {
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("basic");

  const { data: appProducts } = useQuery({
    queryKey: ["application_products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("application_products").select("id, name, description").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: dbEngines } = useQuery({
    queryKey: ["database_engines"],
    queryFn: async () => {
      const { data, error } = await supabase.from("database_engines").select("id, name").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      cnpj: "",
      domain: "",
      status: "ativo",
      tenant_type: "customer",
      segments: [],
      db_engines: [],
      app_product_ids: [],
      max_users: 10,
      contract_start_date: "",
      contract_end_date: "",
      sla_db_p1_first_response: 15,
      sla_db_p1_resolution: 240,
      sla_db_p2_first_response: 30,
      sla_db_p2_resolution: 480,
      sla_db_p3_first_response: 240,
      sla_db_p3_resolution: 2880,
      sla_db_p4_first_response: 1400,
      sla_db_p4_resolution: 4320,
      sla_app_p1_first_response: 15,
      sla_app_p1_resolution: 240,
      sla_app_p2_first_response: 30,
      sla_app_p2_resolution: 480,
      sla_app_p3_first_response: 240,
      sla_app_p3_resolution: 2880,
      sla_app_p4_first_response: 1400,
      sla_app_p4_resolution: 4320,
      receive_monthly_report: false,
    },
  });

  useEffect(() => {
    if (mode === "edit" && client) {
      setSelectedSegments(client.segments || []);
      form.reset({
        name: client.name,
        cnpj: client.cnpj || "",
        domain: client.domain || "",
        status: client.status || "ativo",
        tenant_type: client.tenant_type || "customer",
        segments: client.segments || [],
        db_engines: client.db_engines || [],
        app_product_ids: client.app_product_ids || [],
        max_users: client.max_users || 10,
        contract_start_date: client.contract_start_date || "",
        contract_end_date: client.contract_end_date || "",
        sla_db_p1_first_response: client.sla_db_p1_first_response || 15,
        sla_db_p1_resolution: client.sla_db_p1_resolution || 240,
        sla_db_p2_first_response: client.sla_db_p2_first_response || 30,
        sla_db_p2_resolution: client.sla_db_p2_resolution || 480,
        sla_db_p3_first_response: client.sla_db_p3_first_response || 240,
        sla_db_p3_resolution: client.sla_db_p3_resolution || 2880,
        sla_db_p4_first_response: client.sla_db_p4_first_response || 1400,
        sla_db_p4_resolution: client.sla_db_p4_resolution || 4320,
        sla_app_p1_first_response: client.sla_app_p1_first_response || 15,
        sla_app_p1_resolution: client.sla_app_p1_resolution || 240,
        sla_app_p2_first_response: client.sla_app_p2_first_response || 30,
        sla_app_p2_resolution: client.sla_app_p2_resolution || 480,
        sla_app_p3_first_response: client.sla_app_p3_first_response || 240,
        sla_app_p3_resolution: client.sla_app_p3_resolution || 2880,
        sla_app_p4_first_response: client.sla_app_p4_first_response || 1400,
        sla_app_p4_resolution: client.sla_app_p4_resolution || 4320,
        receive_monthly_report: (client as any).receive_monthly_report || false,
      });
    } else {
      setSelectedSegments([]);
      form.reset();
    }
  }, [mode, client, form]);

  const onSubmit = async (data: ClientFormData) => {
    try {
      const clientData = {
        ...data,
        cnpj: data.cnpj || null,
        domain: data.domain || null,
        segments: data.segments || [],
        db_engines: data.db_engines || [],
        app_product_ids: data.app_product_ids || [],
        contract_start_date: data.contract_start_date || null,
        contract_end_date: data.contract_end_date || null,
        receive_monthly_report: data.receive_monthly_report || false,
      };

      if (mode === "create") {
        await createClient.mutateAsync(clientData as any);
        onOpenChange(false);
        form.reset();
      } else if (client) {
        await updateClient.mutateAsync({ id: client.id, data: clientData as any });
        // Manter o diálogo aberto após salvar no modo edit
      }
    } catch (error) {
      console.error("Error saving client:", error);
    }
  };

  const isLoading = createClient.isPending || updateClient.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo Cliente" : `Editar Cliente: ${client?.name}`}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={`grid w-full ${mode === "edit" ? "grid-cols-6" : "grid-cols-4"}`}>
                <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
                {mode === "edit" && <TabsTrigger value="users">Usuários</TabsTrigger>}
                {mode === "edit" && <TabsTrigger value="report">Relatório</TabsTrigger>}
                <TabsTrigger value="contract">Contrato</TabsTrigger>
                <TabsTrigger value="sla">SLAs</TabsTrigger>
                <TabsTrigger value="projects">
                  <FolderKanban className="h-4 w-4 mr-1" />
                  Projetos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nome do cliente" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={formatCnpj(field.value || "")}
                            onChange={(e) => field.onChange(formatCnpj(e.target.value))}
                            placeholder="00.000.000/0000-00"
                            maxLength={18}
                            inputMode="numeric"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="domain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Domínio</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="exemplo.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ativo">Ativo</SelectItem>
                            <SelectItem value="inativo">Inativo</SelectItem>
                            <SelectItem value="suspenso">Suspenso</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tenant_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Tenant</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="customer">Cliente</SelectItem>
                            <SelectItem value="internal">Interno</SelectItem>
                            <SelectItem value="partner">Parceiro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Seção de Segmentos - Grid com checkboxes alinhados às suas colunas */}
                <FormField
                  control={form.control}
                  name="segments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Segmentos</FormLabel>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Coluna Esquerda: Banco de Dados */}
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="segment-db"
                              checked={field.value.includes("DB")}
                              onCheckedChange={(checked) => {
                                const newSegments = checked
                                  ? [...field.value, "DB"]
                                  : field.value.filter((s) => s !== "DB");
                                field.onChange(newSegments);
                                setSelectedSegments(newSegments);
                                if (!checked) {
                                  form.setValue("db_engines", []);
                                }
                              }}
                            />
                            <label htmlFor="segment-db" className="text-sm font-medium cursor-pointer">
                              Banco de Dados (DB)
                            </label>
                          </div>

                          {/* Engines de Banco (condicional) */}
                          {selectedSegments.includes("DB") && (
                            <FormField
                              control={form.control}
                              name="db_engines"
                              render={({ field: engineField }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2 text-sm">
                                    <Database className="h-4 w-4 text-blue-500" />
                                    Engines de Banco ({engineField.value.length})
                                  </FormLabel>
                                  <div className="space-y-3 border rounded-md p-4 bg-muted/20">
                                    {dbEngines?.map((engine) => (
                                      <div key={engine.id} className="flex items-center space-x-3">
                                        <Checkbox
                                          id={`engine-${engine.name}`}
                                          checked={engineField.value.includes(engine.name)}
                                          onCheckedChange={(checked) => {
                                            const newEngines = checked
                                              ? [...engineField.value, engine.name]
                                              : engineField.value.filter((e) => e !== engine.name);
                                            engineField.onChange(newEngines);
                                          }}
                                        />
                                        <div className="flex items-center gap-2">
                                          <DatabaseEngineIcon engine={engine.name} />
                                          <label htmlFor={`engine-${engine.name}`} className="text-sm cursor-pointer">
                                            {engine.name}
                                          </label>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>

                        {/* Coluna Direita: Aplicação */}
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="segment-app"
                              checked={field.value.includes("APP")}
                              onCheckedChange={(checked) => {
                                const newSegments = checked
                                  ? [...field.value, "APP"]
                                  : field.value.filter((s) => s !== "APP");
                                field.onChange(newSegments);
                                setSelectedSegments(newSegments);
                                if (!checked) {
                                  form.setValue("app_product_ids", []);
                                }
                              }}
                            />
                            <label htmlFor="segment-app" className="text-sm font-medium cursor-pointer">
                              Aplicação (APP)
                            </label>
                          </div>

                          {/* Produtos de Aplicação (condicional) */}
                          {selectedSegments.includes("APP") && (
                            <FormField
                              control={form.control}
                              name="app_product_ids"
                              render={({ field: productField }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2 text-sm">
                                    <Package className="h-4 w-4 text-green-500" />
                                    Produtos de Aplicação ({productField.value.length})
                                  </FormLabel>
                                  <div className="space-y-3 border rounded-md p-4 bg-muted/20 max-h-64 overflow-y-auto">
                                    {appProducts?.map((product) => (
                                      <div key={product.id} className="flex items-start space-x-3">
                                        <Checkbox
                                          id={`app-${product.id}`}
                                          checked={productField.value.includes(product.id)}
                                          onCheckedChange={(checked) => {
                                            const newProducts = checked
                                              ? [...productField.value, product.id]
                                              : productField.value.filter((id) => id !== product.id);
                                            productField.onChange(newProducts);
                                          }}
                                        />
                                        <div className="flex items-start gap-2 min-w-0">
                                          <ApplicationProductIcon productName={product.name} />
                                          <div className="flex flex-col min-w-0">
                                            <label htmlFor={`app-${product.id}`} className="text-sm font-medium cursor-pointer">
                                              {product.name}
                                            </label>
                                            {product.description && (
                                              <span className="text-xs text-muted-foreground line-clamp-2">
                                                {product.description}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {mode === "edit" && client && (
                <TabsContent value="users" className="space-y-4">
                  <TenantUsersManager
                    tenantId={client.id}
                    tenantDomain={client.domain}
                    maxUsers={client.max_users}
                  />
                </TabsContent>
              )}

              {mode === "edit" && client && (
                <TabsContent value="report" className="space-y-4">
                  <TenantUserReport tenantId={client.id} tenantName={client.name} />
                </TabsContent>
              )}

              <TabsContent value="contract" className="space-y-4">
                <FormField
                  control={form.control}
                  name="max_users"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Máximo de Usuários</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} min={1} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contract_start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Início</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contract_end_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Término</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Relatório Mensal Automático */}
                <FormField
                  control={form.control}
                  name="receive_monthly_report"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/30">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center gap-2">
                          <Mail className="h-4 w-4 text-primary" />
                          Relatório Mensal Automático
                        </FormLabel>
                        <FormDescription>
                          Enviar relatório mensal por email no 1º dia de cada mês para os contatos do cliente
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="sla" className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">SLA Database (minutos)</h3>
                  {["p1", "p2", "p3", "p4"].map((priority) => (
                    <div key={priority} className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`sla_db_${priority}_first_response` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{priority.toUpperCase()} - Primeira Resposta</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} min={1} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`sla_db_${priority}_resolution` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{priority.toUpperCase()} - Resolução</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} min={1} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">SLA Aplicação (minutos)</h3>
                  {["p1", "p2", "p3", "p4"].map((priority) => (
                    <div key={priority} className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`sla_app_${priority}_first_response` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{priority.toUpperCase()} - Primeira Resposta</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} min={1} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`sla_app_${priority}_resolution` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{priority.toUpperCase()} - Resolução</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} min={1} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="projects" className="space-y-4">
                <ClientProjectsTab clientId={client?.id} mode={mode} />
              </TabsContent>
            </Tabs>

            {activeTab !== "projects" && activeTab !== "users" && activeTab !== "report" && (
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "create" ? "Criar Cliente" : "Salvar Alterações"}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
