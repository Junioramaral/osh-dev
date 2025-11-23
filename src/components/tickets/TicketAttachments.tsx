import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileX, FileText, Download, Eye } from "lucide-react";
import { useTicketComments } from "@/hooks/useTicketDetail";

interface AttachmentCardProps {
  attachment: any;
}

function AttachmentCard({ attachment }: AttachmentCardProps) {
  const isImage = attachment.type?.startsWith('image/');
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = fileName;
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
        {isImage ? (
          <img src={attachment.url} alt={attachment.name} className="w-full h-32 object-cover rounded-md" />
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
            onClick={() => handleDownload(attachment.url, attachment.name)}
          >
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
          {isImage && (
            <Button size="sm" variant="outline">
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
  
  const allAttachments = [
    ...(ticket.evidences || []).map((e: any) => ({ ...e, source: 'ticket' })),
    ...(comments?.flatMap(c => c.attachments || []).map((a: any) => ({ ...a, source: 'comment' })) || [])
  ];
  
  return (
    <div className="p-6">
      {allAttachments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileX className="h-12 w-12 mb-4" />
          <p>Nenhum anexo encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {allAttachments.map((attachment, idx) => (
            <AttachmentCard key={idx} attachment={attachment} />
          ))}
        </div>
      )}
    </div>
  );
}
