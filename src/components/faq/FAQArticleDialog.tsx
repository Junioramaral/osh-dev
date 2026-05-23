import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useActiveSegments } from "@/hooks/useSegments";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock, Building2, Globe, Loader2, Paperclip, X, AlertTriangle, HelpCircle, CheckCircle, Database, Package } from "lucide-react";
import { Database as DatabaseType, Json } from "@/integrations/supabase/types";
import { FileUploadZone, FileWithPreview } from "@/components/tickets/FileUploadZone";

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
      return (
        <svg {...iconProps} viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill="#7C3AED"/>
          <path d="M12 6v10M8 8l4-2 4 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 12l2-4 2 4H6zM14 12l2-4 2 4h-4z" fill="#fff"/>
          <path d="M10 18h4" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );
    case "Sec4File":
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



interface Attachment {
  name: string;
  path: string;
  size: number;
  type: string;
}

type FAQArticle = DatabaseType["public"]["Tables"]["faq_articles"]["Row"];
type FAQVisibility = "private" | "client_specific" | "global";

const articleSchema = z.object({
  title: z.string().min(5, "Título deve ter pelo menos 5 caracteres").max(200),
  visibility: z.enum(["private", "client_specific", "global"]),
  client_id: z.string().uuid().optional().nullable(),
  segment: z.string().min(1, "Selecione um segmento"),
  db_engines: z.array(z.string()).default([]),
  app_product_ids: z.array(z.string()).default([]),
  symptoms: z
    .string()
    .refine((v) => stripHtml(v).length >= 10, {
      message: "Sintomas deve ter pelo menos 10 caracteres",
    }),
  problem: z
    .string()
    .refine((v) => stripHtml(v).length >= 10, {
      message: "Problema deve ter pelo menos 10 caracteres",
    }),
  solution: z
    .string()
    .refine((v) => stripHtml(v).length >= 10, {
      message: "Solução deve ter pelo menos 10 caracteres",
    }),
  keywords: z.string().optional(),
  status: z.enum(["rascunho", "publicado"]),
}).refine(data => {
  if (data.visibility !== "global") {
    return !!data.client_id;
  }
  return true;
}, { message: "Selecione um cliente", path: ["client_id"] });

type ArticleFormData = z.infer<typeof articleSchema>;

interface FAQArticleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article?: FAQArticle | null;
}

export default function FAQArticleDialog({
  open,
  onOpenChange,
  article,
}: FAQArticleDialogProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!article;

  const [attachmentFiles, setAttachmentFiles] = useState<FileWithPreview[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);

  const form = useForm<ArticleFormData>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: "",
      visibility: "private",
      client_id: null,
      segment: "DB",
      db_engines: [],
      app_product_ids: [],
      symptoms: "",
      problem: "",
      solution: "",
      keywords: "",
      status: "rascunho",
    },
  });

  const visibility = form.watch("visibility");
  const segment = form.watch("segment");

  // Fetch active segments from database
  const { data: allSegments } = useActiveSegments();

  const { data: clients } = useQuery({
    queryKey: ["clients-for-faq"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: appProducts } = useQuery({
    queryKey: ["application_products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_products")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: dbEngines } = useQuery({
    queryKey: ["database_engines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("database_engines")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (article) {
      form.reset({
        title: article.title,
        visibility: (article.visibility as FAQVisibility) || "private",
        client_id: article.client_id || null,
        segment: article.segment,
        db_engines: (article.db_engines as string[]) || [],
        app_product_ids: (article.app_product_ids as string[]) || [],
        symptoms: article.symptoms || "",
        problem: article.problem || "",
        solution: article.solution || "",
        keywords: article.keywords?.join(", ") || "",
        status: (article.status as "rascunho" | "publicado") || "rascunho",
      });
      const attachments = Array.isArray(article.attachments)
        ? (article.attachments as unknown as Attachment[])
        : [];
      setExistingAttachments(attachments);
      setAttachmentFiles([]);
    } else {
      form.reset({
        title: "",
        visibility: "private",
        client_id: null,
        segment: "DB",
        db_engines: [],
        app_product_ids: [],
        symptoms: "",
        problem: "",
        solution: "",
        keywords: "",
        status: "rascunho",
      });
      setExistingAttachments([]);
      setAttachmentFiles([]);
    }
  }, [article, form]);

  const uploadAttachments = async (articleId: string, files: FileWithPreview[]) => {
    const uploadedAttachments: Attachment[] = [];

    for (const fileItem of files) {
      const filePath = `${articleId}/${Date.now()}-${fileItem.file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("faq-attachments")
        .upload(filePath, fileItem.file);

      if (uploadError) throw uploadError;

      uploadedAttachments.push({
        name: fileItem.file.name,
        path: filePath,
        size: fileItem.file.size,
        type: fileItem.file.type,
      });
    }

    return uploadedAttachments;
  };

  const removeExistingAttachment = async (index: number) => {
    const attachmentToRemove = existingAttachments[index];
    
    const { error } = await supabase.storage
      .from("faq-attachments")
      .remove([attachmentToRemove.path]);

    if (error) {
      toast.error("Erro ao remover anexo");
      return;
    }

    setExistingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const createMutation = useMutation({
    mutationFn: async (data: ArticleFormData) => {
      const keywordsArray = data.keywords
        ? data.keywords.split(",").map(k => k.trim()).filter(Boolean)
        : [];

      const { data: newArticle, error } = await supabase
        .from("faq_articles")
        .insert({
          title: data.title,
          visibility: data.visibility,
          client_id: data.visibility !== "global" ? data.client_id : null,
          segment: data.segment as any, // Cast needed until DB migration to TEXT
          db_engines: data.segment === "DB" ? data.db_engines as DatabaseType["public"]["Enums"]["db_engine"][] : [],
          app_product_ids: data.segment === "APP" ? data.app_product_ids : [],
          symptoms: data.symptoms,
          problem: data.problem,
          solution: data.solution,
          keywords: keywordsArray,
          status: data.status,
          created_by: profile?.id,
          faq_number: "", // Will be generated by trigger
        } as any)
        .select()
        .single();

      if (error) throw error;

      if (attachmentFiles.length > 0) {
        const uploadedAttachments = await uploadAttachments(newArticle.id, attachmentFiles);
        
        const { error: updateError } = await supabase
          .from("faq_articles")
          .update({ attachments: uploadedAttachments as unknown as Json[] })
          .eq("id", newArticle.id);

        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      toast.success("Artigo criado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["faq-articles"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Erro ao criar artigo: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ArticleFormData) => {
      const keywordsArray = data.keywords
        ? data.keywords.split(",").map(k => k.trim()).filter(Boolean)
        : [];

      let allAttachments = [...existingAttachments];
      if (attachmentFiles.length > 0) {
        const uploadedAttachments = await uploadAttachments(article!.id, attachmentFiles);
        allAttachments = [...allAttachments, ...uploadedAttachments];
      }

      const { error } = await supabase
        .from("faq_articles")
        .update({
          title: data.title,
          visibility: data.visibility,
          client_id: data.visibility !== "global" ? data.client_id : null,
          segment: data.segment as any, // Cast needed until DB migration to TEXT
          db_engines: data.segment === "DB" ? data.db_engines as DatabaseType["public"]["Enums"]["db_engine"][] : [],
          app_product_ids: data.segment === "APP" ? data.app_product_ids : [],
          symptoms: data.symptoms,
          problem: data.problem,
          solution: data.solution,
          keywords: keywordsArray,
          status: data.status,
          attachments: allAttachments as unknown as Json[],
          updated_at: new Date().toISOString(),
        })
        .eq("id", article!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Artigo atualizado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["faq-articles"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar artigo: " + error.message);
    },
  });

  const onSubmit = (data: ArticleFormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Artigo" : "Novo Artigo"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Como configurar backup automático..."
                      className="text-lg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Visibility Selector */}
            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visibilidade *</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={field.value === "private" ? "default" : "outline"}
                        className={`flex-1 ${field.value === "private" ? "bg-red-600 hover:bg-red-700" : "hover:border-red-500 hover:text-red-600"}`}
                        onClick={() => field.onChange("private")}
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Interno
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === "client_specific" ? "default" : "outline"}
                        className={`flex-1 ${field.value === "client_specific" ? "bg-green-600 hover:bg-green-700" : "hover:border-green-500 hover:text-green-600"}`}
                        onClick={() => field.onChange("client_specific")}
                      >
                        <Building2 className="h-4 w-4 mr-2" />
                        Cliente
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === "global" ? "default" : "outline"}
                        className={`flex-1 ${field.value === "global" ? "bg-blue-600 hover:bg-blue-700" : "hover:border-blue-500 hover:text-blue-600"}`}
                        onClick={() => {
                          field.onChange("global");
                          form.setValue("client_id", null);
                        }}
                      >
                        <Globe className="h-4 w-4 mr-2" />
                        Todos
                      </Button>
                    </div>
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-1">
                    {field.value === "private" && "Visível apenas para a equipe Otimizzo"}
                    {field.value === "client_specific" && "Visível para a equipe Otimizzo e o cliente selecionado"}
                    {field.value === "global" && "Visível para todos os clientes quando publicado"}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cliente + Status Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Client Selector - aparece para private e client_specific */}
              {visibility !== "global" ? (
                <FormField
                  control={form.control}
                  name="client_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um cliente..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients?.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div />
              )}

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="rascunho">Rascunho</SelectItem>
                        <SelectItem value="publicado">Publicado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Segmento + Tipo de Segmento Grid */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="segment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Segmento *</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Limpar seleção ao trocar segmento
                        form.setValue("db_engines", []);
                        form.setValue("app_product_ids", []);
                      }} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o segmento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allSegments?.map((seg) => (
                          <SelectItem key={seg.id} value={seg.code}>
                            {seg.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tipo de Segmento - checkboxes dinâmicos */}
              <div className="space-y-2">
                <FormLabel>Tipo de Segmento</FormLabel>
                {segment === "DB" ? (
                  <FormField
                    control={form.control}
                    name="db_engines"
                    render={({ field }) => (
                      <FormItem>
                        <div className="space-y-2 max-h-[140px] overflow-y-auto border rounded-md p-2">
                          {dbEngines?.map((engine) => (
                            <div key={engine.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`engine-${engine.name}`}
                                checked={field.value.includes(engine.name)}
                                onCheckedChange={(checked) => {
                                  const newValue = checked
                                    ? [...field.value, engine.name]
                                    : field.value.filter((e) => e !== engine.name);
                                  field.onChange(newValue);
                                }}
                              />
                              <label
                                htmlFor={`engine-${engine.name}`}
                                className="flex items-center gap-2 text-sm cursor-pointer"
                              >
                                <DatabaseEngineIcon engine={engine.name} />
                                {engine.name}
                              </label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="app_product_ids"
                    render={({ field }) => (
                      <FormItem>
                        <div className="space-y-2 max-h-[140px] overflow-y-auto border rounded-md p-2">
                          {appProducts?.map((product) => (
                            <div key={product.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`product-${product.id}`}
                                checked={field.value.includes(product.id)}
                                onCheckedChange={(checked) => {
                                  const newValue = checked
                                    ? [...field.value, product.id]
                                    : field.value.filter((p) => p !== product.id);
                                  field.onChange(newValue);
                                }}
                              />
                              <label
                                htmlFor={`product-${product.id}`}
                                className="flex items-center gap-2 text-sm cursor-pointer"
                              >
                                <ApplicationProductIcon productName={product.name} />
                                {product.name}
                              </label>
                            </div>
                          ))}
                          {(!appProducts || appProducts.length === 0) && (
                            <p className="text-sm text-muted-foreground">Nenhum produto cadastrado</p>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            {/* Symptoms */}
            <FormField
              control={form.control}
              name="symptoms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Sintomas *
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva os sintomas observados pelo usuário..."
                      className="min-h-[100px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Problem */}
            <FormField
              control={form.control}
              name="problem"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-red-500" />
                    Problema *
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva a causa raiz do problema..."
                      className="min-h-[100px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Solution */}
            <FormField
              control={form.control}
              name="solution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Solução *
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva os passos para resolver o problema..."
                      className="min-h-[100px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Attachments */}
            <div className="space-y-3">
              <FormLabel>Anexos</FormLabel>
              <FileUploadZone
                files={attachmentFiles}
                onFilesChange={setAttachmentFiles}
                maxFiles={5}
                maxSizeMB={10}
              />
              
              {existingAttachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Anexos atuais:</p>
                  <div className="flex flex-wrap gap-2">
                    {existingAttachments.map((att, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1 pr-1">
                        <Paperclip className="h-3 w-3" />
                        {att.name}
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          className="h-4 w-4 ml-1 hover:bg-destructive/20"
                          onClick={() => removeExistingAttachment(idx)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Keywords */}
            <FormField
              control={form.control}
              name="keywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Palavras-chave</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="backup, automático, cron, oracle (separadas por vírgula)"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Separe as palavras-chave por vírgula
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? "Salvar Alterações" : "Criar Artigo"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
