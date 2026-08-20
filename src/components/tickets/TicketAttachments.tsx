import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileX, FileText, Download, Eye, Loader2, Upload, Image as ImageIcon } from "lucide-react";
import { useTicketComments } from "@/hooks/useTicketDetail";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { FileUploadZone, type FileWithPreview } from "./FileUploadZone";
import { uploadCommentAttachments } from "@/lib/ticketAttachmentUpload";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import TicketLinkedTicketsCard from "./TicketLinkedTicketsCard";

function formatFileSize(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDateTime(date?: string | null) {
  if (!date) return "—";
  try {
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return "—";
  }
}

interface AttachmentRowProps {
  attachment: any;
  signedUrl: string | null;
  isLoading: boolean;
}

function AttachmentRow({ attachment, signedUrl, isLoading }: AttachmentRowProps) {
  const isImage = attachment.type?.startsWith("image/");
  const uploadedAt = attachment.uploaded_at || attachment.created_at || null;

  const handleDownload = async () => {
    if (!signedUrl) return;
    try {
      const response = await fetch(signedUrl);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = attachment.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Erro ao baixar arquivo:", error);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/40 transition-colors">
      <div className="flex items-center justify-center w-10 h-10 rounded-md bg-muted shrink-0">
        {isImage ? (
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
        ) : (
          <FileText className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={handleDownload}
          disabled={isLoading || !signedUrl}
          className="text-sm font-medium truncate text-left hover:underline disabled:cursor-not-allowed disabled:opacity-60 block max-w-full"
          title={attachment.name}
        >
          {attachment.name}
        </button>
        <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          <span>{formatDateTime(uploadedAt)}</span>
          {attachment.size ? <span>{formatFileSize(attachment.size)}</span> : null}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <>
            {isImage && signedUrl && (
              <Button size="sm" variant="ghost" onClick={() => window.open(signedUrl, "_blank")}>
                <Eye className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleDownload} disabled={!signedUrl}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

interface TicketAttachmentsProps {
  ticket: any;
  ticketId: string;
}

export default function TicketAttachments({ ticket, ticketId }: TicketAttachmentsProps) {
  const { data: comments } = useTicketComments(ticketId);
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState<Record<string, boolean>>({});
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const allAttachments = [
    ...(ticket.evidences || []).map((e: any) => ({ ...e, source: 'ticket' })),
    ...(comments?.flatMap((c: any) =>
      (c.attachments || []).map((a: any) => ({
        ...a,
        source: 'comment',
        created_at: a.uploaded_at || c.created_at,
      }))
    ) || [])
  ];

  // Generate signed URLs for attachments that have a path
  useEffect(() => {
    const generateSignedUrls = async () => {
      for (const attachment of allAttachments) {
        const key = attachment.path || attachment.name;
        
        // Skip if we already have a signed URL or if there's no path
        if (signedUrls[key] || !attachment.path) {
          // For legacy attachments without path, use the existing URL if available
          if (!attachment.path && attachment.url) {
            setSignedUrls(prev => ({ ...prev, [key]: attachment.url }));
          }
          continue;
        }
        
        setLoadingUrls(prev => ({ ...prev, [key]: true }));
        
        try {
          const { data, error } = await supabase.storage
            .from('tickets')
            .createSignedUrl(attachment.path, 60 * 60); // 1 hour validity
          
          if (!error && data) {
            setSignedUrls(prev => ({ ...prev, [key]: data.signedUrl }));
          }
        } catch (error) {
          console.error('Error generating signed URL:', error);
        } finally {
          setLoadingUrls(prev => ({ ...prev, [key]: false }));
        }
      }
    };

    if (allAttachments.length > 0) {
      generateSignedUrls();
    }
  }, [allAttachments.length, ticket.evidences, comments]);

  const isClosed = ticket.status === 'resolvido' || ticket.status === 'fechado';
  const canUpload = !isClosed;

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const attachments = await uploadCommentAttachments(ticket.client_id, ticketId, files);
      const { error } = await supabase.from('ticket_comments').insert({
        ticket_id: ticketId,
        author_id: user?.id,
        sender_name: profile?.full_name,
        sender_email: user?.email,
        content: `📎 ${attachments.length} anexo(s) adicionado(s)`,
        is_internal: false,
        attachments: attachments as any,
      });
      if (error) throw error;
      setFiles([]);
      queryClient.invalidateQueries({ queryKey: ['ticket-comments', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-detail', ticketId] });
      toast({ title: 'Anexos enviados', description: `${attachments.length} arquivo(s) adicionado(s) ao ticket.` });
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({ title: 'Erro ao enviar anexos', description: err.message, variant: 'destructive', duration: 8000 });
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <TicketLinkedTicketsCard ticketId={ticketId} />
      </div>
      {allAttachments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileX className="h-12 w-12 mb-4" />
          <p>Nenhum anexo encontrado</p>
        </div>
      ) : (
        <Card className="mb-6">
          <CardContent className="p-0">
            {allAttachments.map((attachment, idx) => {
              const key = attachment.path || attachment.name;
              return (
                <AttachmentRow
                  key={idx}
                  attachment={attachment}
                  signedUrl={signedUrls[key] || attachment.url || null}
                  isLoading={loadingUrls[key] || false}
                />
              );
            })}
          </CardContent>
        </Card>
      )}

      {canUpload && (
        <Card className="mb-6">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Adicionar anexos</h3>
                <p className="text-xs text-muted-foreground">
                  Os arquivos ficarão registrados como um novo comentário neste ticket.
                </p>
              </div>
              <Button
                onClick={handleUpload}
                disabled={files.length === 0 || uploading || files.some(f => f.isCompressing)}
              >
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Enviar ({files.length})
              </Button>
            </div>
            <FileUploadZone
              files={files}
              onFilesChange={setFiles}
              maxFiles={10}
              maxSizeMB={20}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
