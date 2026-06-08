import { supabase } from "@/integrations/supabase/client";
import type { FileWithPreview } from "@/components/tickets/FileUploadZone";

export interface CommentAttachment {
  name: string;
  path: string;
  size: number;
  type: string;
  uploaded_at: string;
}

function sanitizeName(name: string): string {
  const sanitized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return sanitized || "arquivo";
}

/**
 * Uploads files to the `tickets` storage bucket under
 * `{clientId}/{ticketId}/comments/{timestamp}_{safeName}` and returns
 * attachment metadata ready to be persisted in `ticket_comments.attachments`.
 *
 * Storage RLS requires the first path segment to equal the user's tenant id
 * (or be an Otimizzo/super-admin user), so `clientId` here must match the
 * ticket's `client_id`.
 */
export async function uploadCommentAttachments(
  clientId: string,
  ticketId: string,
  files: FileWithPreview[]
): Promise<CommentAttachment[]> {
  const attachments: CommentAttachment[] = [];

  for (const fileItem of files) {
    const safeName = sanitizeName(fileItem.file.name);
    const filePath = `${clientId}/${ticketId}/comments/${Date.now()}_${safeName}`;

    const { error } = await supabase.storage
      .from("tickets")
      .upload(filePath, fileItem.file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error(`❌ Erro ao enviar ${fileItem.file.name}:`, error);
      throw error;
    }

    attachments.push({
      name: fileItem.file.name,
      path: filePath,
      size: fileItem.file.size,
      type: fileItem.file.type,
      uploaded_at: new Date().toISOString(),
    });
  }

  return attachments;
}