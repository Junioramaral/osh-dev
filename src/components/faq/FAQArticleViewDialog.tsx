import { useEffect } from "react";
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
  Calendar
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-xl font-semibold leading-tight">
              {article.title}
            </DialogTitle>
            <div className="flex items-center gap-2 text-muted-foreground shrink-0">
              <Eye className="h-4 w-4" />
              <span className="text-sm">{(article.view_count || 0) + 1}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {getVisibilityBadge()}
            <Badge variant="outline">{article.segment}</Badge>
            {getStatusBadge()}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Content */}
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-foreground">
                {article.content}
              </div>
            </div>

            {/* Attachments */}
            {attachments.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Paperclip className="h-4 w-4" />
                    Anexos ({attachments.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {attachments.map((attachment, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50"
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
                </div>
              </>
            )}

            {/* Keywords */}
            {keywords.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Tag className="h-4 w-4" />
                    Palavras-chave
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword, idx) => (
                      <Badge key={idx} variant="secondary">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Metadata */}
            <Separator />
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Atualizado em{" "}
                {format(new Date(article.updated_at || article.created_at!), "dd MMM yyyy", {
                  locale: ptBR,
                })}
              </div>
              {article.profiles?.full_name && (
                <span>por {article.profiles.full_name}</span>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 mt-4">
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
