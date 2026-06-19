import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Download, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Attachment {
  name: string;
  path?: string;
  url?: string;
  size?: number;
  type?: string;
}

function formatSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CommentAttachmentList({ attachments }: { attachments: Attachment[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchUrls = async () => {
      setLoading(true);
      const next: Record<string, string> = {};
      for (const a of attachments) {
        const key = a.path || a.name;
        if (a.path) {
          const { data, error } = await supabase.storage
            .from("tickets")
            .createSignedUrl(a.path, 60 * 60);
          if (!error && data) next[key] = data.signedUrl;
        } else if (a.url) {
          next[key] = a.url;
        }
      }
      if (!cancelled) {
        setUrls(next);
        setLoading(false);
      }
    };
    if (attachments?.length) fetchUrls();
    return () => {
      cancelled = true;
    };
  }, [JSON.stringify(attachments)]);

  if (!attachments?.length) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2 max-w-full min-w-0">
      {attachments.map((a, idx) => {
        const key = a.path || a.name;
        const url = urls[key];
        const isImage = a.type?.startsWith("image/");
        return (
          <a
            key={idx}
            href={url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!url) e.preventDefault();
            }}
            className="inline-flex max-w-full items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-xs hover:bg-accent transition-colors"
            title={a.name}
          >
            {loading && !url ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="max-w-[200px] truncate font-medium">{a.name}</span>
            {a.size ? (
              <span className="text-muted-foreground">{formatSize(a.size)}</span>
            ) : null}
            {url && (isImage ? <ExternalLink className="h-3 w-3" /> : <Download className="h-3 w-3" />)}
          </a>
        );
      })}
    </div>
  );
}