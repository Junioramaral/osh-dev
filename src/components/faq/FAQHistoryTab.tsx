import { useFAQHistory } from "@/hooks/useFAQHistory";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  Pencil,
  Eye,
  FileText,
  Tag,
  Users,
  ToggleLeft,
  Loader2,
  History,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatSmartDate } from "@/lib/dateUtils";

interface FAQHistoryTabProps {
  articleId: string;
}

const getActionIcon = (actionType: string) => {
  switch (actionType) {
    case "created":
      return <Plus className="h-4 w-4" />;
    case "status_changed":
      return <ToggleLeft className="h-4 w-4" />;
    case "visibility_changed":
      return <Eye className="h-4 w-4" />;
    case "content_changed":
      return <FileText className="h-4 w-4" />;
    case "field_changed":
      return <Pencil className="h-4 w-4" />;
    default:
      return <Pencil className="h-4 w-4" />;
  }
};

const getActionColor = (actionType: string) => {
  switch (actionType) {
    case "created":
      return "bg-green-500";
    case "status_changed":
      return "bg-blue-500";
    case "visibility_changed":
      return "bg-purple-500";
    case "content_changed":
      return "bg-amber-500";
    case "field_changed":
      return "bg-slate-500";
    default:
      return "bg-muted";
  }
};

const getFieldLabel = (fieldName: string | null): string => {
  const labels: Record<string, string> = {
    title: "Título",
    status: "Status",
    visibility: "Visibilidade",
    segment: "Segmento",
    client_id: "Cliente",
    symptoms: "Sintomas",
    problem: "Problema",
    solution: "Solução",
    keywords: "Palavras-chave",
  };
  return fieldName ? labels[fieldName] || fieldName : "";
};

const getStatusLabel = (status: string | null): string => {
  const labels: Record<string, string> = {
    rascunho: "Rascunho",
    publicado: "Publicado",
    arquivado: "Arquivado",
  };
  return status ? labels[status] || status : "";
};

const getVisibilityLabel = (visibility: string | null): string => {
  const labels: Record<string, string> = {
    private: "Interno",
    client_specific: "Cliente Específico",
    global: "Todos",
  };
  return visibility ? labels[visibility] || visibility : "";
};

const formatActionDescription = (entry: {
  action_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
}): string => {
  const { action_type, field_name, old_value, new_value } = entry;

  if (action_type === "created") {
    return "Artigo criado";
  }

  if (action_type === "status_changed") {
    return `Status alterado: ${getStatusLabel(old_value)} → ${getStatusLabel(new_value)}`;
  }

  if (action_type === "visibility_changed") {
    return `Visibilidade alterada: ${getVisibilityLabel(old_value)} → ${getVisibilityLabel(new_value)}`;
  }

  if (action_type === "content_changed") {
    return `${getFieldLabel(field_name)} atualizado`;
  }

  if (action_type === "field_changed") {
    if (field_name === "title" && old_value && new_value) {
      return `Título alterado de "${old_value}" para "${new_value}"`;
    }
    if (field_name === "segment") {
      return `Segmento alterado: ${old_value} → ${new_value}`;
    }
    if (field_name === "client_id") {
      return "Cliente alterado";
    }
    if (field_name === "keywords") {
      return "Palavras-chave atualizadas";
    }
    return `${getFieldLabel(field_name)} alterado`;
  }

  return "Alteração registrada";
};

export function FAQHistoryTab({ articleId }: FAQHistoryTabProps) {
  const { data: history, isLoading } = useFAQHistory(articleId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <History className="h-8 w-8 mb-2" />
        <p>Nenhum histórico disponível</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border" />

        <div className="space-y-4">
          {history.map((entry, index) => (
            <div key={entry.id} className="relative flex gap-4">
              {/* Timeline dot */}
              <div
                className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${getActionColor(entry.action_type)}`}
              >
                {getActionIcon(entry.action_type)}
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <p className="text-sm font-medium">
                  {formatActionDescription(entry)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  por{" "}
                  <span className="font-medium">
                    {entry.user_name || "Sistema"}
                  </span>
                  {" • "}
                  <span title={format(new Date(entry.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}>
                    {formatSmartDate(entry.created_at)}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
