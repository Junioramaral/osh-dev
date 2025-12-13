import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Eye, 
  Lock, 
  Globe, 
  Building2, 
  Tag, 
  Paperclip, 
  Download, 
  FileText,
  Image as ImageIcon,
  Calendar,
  AlertTriangle,
  HelpCircle,
  CheckCircle,
  Printer,
  History
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { FAQHistoryTab } from "./FAQHistoryTab";

type FAQArticle = Tables<"faq_articles"> & {
  clients?: { name: string } | null;
  profiles?: { full_name: string } | null;
};

interface Attachment {
  name: string;
  path: string;
  size: number;
  type: string;
}

interface FAQArticleViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: FAQArticle | null;
  onEdit?: (article: FAQArticle) => void;
  canEdit?: boolean;
}

export function FAQArticleViewDialog({
  open,
  onOpenChange,
  article,
  onEdit,
  canEdit = false,
}: FAQArticleViewDialogProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("content");
  const incrementViewCount = useMutation({
    mutationFn: async (articleId: string) => {
      const { error } = await supabase.rpc("increment_faq_view_count", {
        article_id: articleId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faq-articles"] });
    },
  });

  useEffect(() => {
    if (open && article) {
      incrementViewCount.mutate(article.id);
    }
  }, [open, article?.id]);

  if (!article) return null;

  const attachments: Attachment[] = Array.isArray(article.attachments)
    ? (article.attachments as unknown as Attachment[])
    : [];

  const keywords: string[] = article.keywords || [];

  const getVisibilityBadge = () => {
    switch (article.visibility) {
      case "private":
        return (
          <Badge variant="secondary" className="gap-1">
            <Lock className="h-3 w-3" />
            Interno
          </Badge>
        );
      case "client_specific":
        return (
          <Badge variant="outline" className="gap-1 border-blue-500 text-blue-600">
            <Building2 className="h-3 w-3" />
            {article.clients?.name || "Cliente Específico"}
          </Badge>
        );
      case "global":
        return (
          <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
            <Globe className="h-3 w-3" />
            Global
          </Badge>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = () => {
    if (article.status === "publicado") {
      return <Badge className="bg-green-500/20 text-green-700">Publicado</Badge>;
    }
    return <Badge variant="secondary">Rascunho</Badge>;
  };

  const handleDownload = async (attachment: Attachment) => {
    const { data, error } = await supabase.storage
      .from("faq-attachments")
      .download(attachment.path);

    if (error) {
      console.error("Error downloading file:", error);
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = attachment.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (type: string) => type.startsWith("image/");

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header - Report Style */}
        <DialogHeader className="border-b pb-4">
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-2xl font-bold leading-tight">
              {article.title}
            </DialogTitle>
            <div className="flex items-center gap-2 text-muted-foreground shrink-0 bg-muted/50 px-3 py-1.5 rounded-full">
              <Eye className="h-4 w-4" />
              <span className="text-sm font-medium">{(article.view_count || 0) + 1} visualizações</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {getVisibilityBadge()}
            <Badge variant="outline">{article.segment}</Badge>
            {getStatusBadge()}
          </div>
        </DialogHeader>

        {/* Tabs for Content and History */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="py-4">
          <TabsList className="print-hidden">
            <TabsTrigger value="content" className="gap-2">
              <FileText className="h-4 w-4" />
              Conteúdo
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-8 mt-6">
            {/* Symptoms Section */}
            {article.symptoms && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <h3 className="text-lg font-semibold uppercase tracking-wide text-yellow-600">
                    Sintomas
                  </h3>
                </div>
                <Separator className="bg-yellow-600/20" />
                <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/50 rounded-lg p-4">
                  <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                    {article.symptoms}
                  </p>
                </div>
              </section>
            )}

            {/* Problem Section */}
            {article.problem && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-red-600" />
                  <h3 className="text-lg font-semibold uppercase tracking-wide text-red-600">
                    Problema
                  </h3>
                </div>
                <Separator className="bg-red-600/20" />
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg p-4">
                  <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                    {article.problem}
                  </p>
                </div>
              </section>
            )}

            {/* Solution Section */}
            {article.solution && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold uppercase tracking-wide text-green-600">
                    Solução
                  </h3>
                </div>
                <Separator className="bg-green-600/20" />
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 rounded-lg p-4">
                  <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                    {article.solution}
                  </p>
                </div>
              </section>
            )}

            {/* Attachments Section */}
            {attachments.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold uppercase tracking-wide text-blue-600">
                    Anexos ({attachments.length})
                  </h3>
                </div>
                <Separator className="bg-blue-600/20" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {attachments.map((attachment, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="shrink-0">
                        {isImage(attachment.type) ? (
                          <ImageIcon className="h-8 w-8 text-blue-500" />
                        ) : (
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {attachment.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.size)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(attachment)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Keywords Section */}
            {keywords.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-semibold uppercase tracking-wide text-purple-600">
                    Palavras-chave
                  </h3>
                </div>
                <Separator className="bg-purple-600/20" />
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword, idx) => (
                    <Badge key={idx} variant="secondary" className="text-sm px-3 py-1">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {/* Metadata Footer */}
            <div className="pt-4 border-t">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Atualizado em{" "}
                  {format(new Date(article.updated_at || article.created_at!), "dd MMM yyyy", {
                    locale: ptBR,
                  })}
                </div>
                {article.profiles?.full_name && (
                  <span>por <span className="font-medium">{article.profiles.full_name}</span></span>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <FAQHistoryTab articleId={article.id} />
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t print-hidden">
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          {canEdit && onEdit && (
            <Button variant="outline" onClick={() => onEdit(article)}>
              Editar
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
