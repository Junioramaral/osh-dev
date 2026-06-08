import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileX, FileText, Download, Eye, Loader2, Upload } from "lucide-react";
import { useTicketComments } from "@/hooks/useTicketDetail";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { FileUploadZone, type FileWithPreview } from "./FileUploadZone";
import { uploadCommentAttachments } from "@/lib/ticketAttachmentUpload";
import { toast } from "@/hooks/use-toast";

interface AttachmentCardProps {
  attachment: any;
  signedUrl: string | null;
  isLoading: boolean;
}

function AttachmentCard({ attachment, signedUrl, isLoading }: AttachmentCardProps) {
  const isImage = attachment.type?.startsWith('image/');
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

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
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardContent className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 bg-muted rounded-md">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : isImage && signedUrl ? (
          <img src={signedUrl} alt={attachment.name} className="w-full h-32 object-cover rounded-md" />
        ) : (
          <div className="flex items-center justify-center h-32 bg-muted rounded-md">
            <FileText className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        <p className="mt-2 text-sm font-medium truncate">{attachment.name}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size || 0)}</p>
        <div className="flex gap-2 mt-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1"
            onClick={handleDownload}
            disabled={isLoading || !signedUrl}
          >
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
          {isImage && signedUrl && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => window.open(signedUrl, '_blank')}
            >
              <Eye className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface TicketAttachmentsProps {
  ticket: any;
  ticketId: string;
}

export default function TicketAttachments({ ticket, ticketId }: TicketAttachmentsProps) {
  const { data: comments } = useTicketComments(ticketId);
  const { user, profile, isViewer } = useAuth();
  const queryClient = useQueryClient();
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState<Record<string, boolean>>({});
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const allAttachments = [
    ...(ticket.evidences || []).map((e: any) => ({ ...e, source: 'ticket' })),
    ...(comments?.flatMap(c => c.attachments || []).map((a: any) => ({ ...a, source: 'comment' })) || [])
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
  const canUpload = !isViewer && !isClosed;

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
        attachments,
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

      {allAttachments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileX className="h-12 w-12 mb-4" />
          <p>Nenhum anexo encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {allAttachments.map((attachment, idx) => {
            const key = attachment.path || attachment.name;
            return (
              <AttachmentCard 
                key={idx} 
                attachment={attachment} 
                signedUrl={signedUrls[key] || attachment.url || null}
                isLoading={loadingUrls[key] || false}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
