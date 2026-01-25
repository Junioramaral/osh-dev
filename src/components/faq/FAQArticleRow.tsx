import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MoreHorizontal, Trash2, Lock, Building2, Globe, Eye, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { Database } from "@/integrations/supabase/types";

type FAQArticle = Database["public"]["Tables"]["faq_articles"]["Row"] & {
  client?: { name: string } | null;
  author?: { full_name: string } | null;
};

interface FAQArticleRowProps {
  article: FAQArticle;
  onView: (article: FAQArticle) => void;
  onEdit: (article: FAQArticle) => void;
  onDelete: (article: FAQArticle) => void;
  canManage?: boolean;
  linkedTicketsCount?: number;
}

export default function FAQArticleRow({
  article,
  onView,
  onEdit,
  onDelete,
  canManage = false,
  linkedTicketsCount = 0,
}: FAQArticleRowProps) {
  const getVisibilityBadge = () => {
    const visibility = article.visibility || "private";
    
    switch (visibility) {
      case "private":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20">
            <Lock className="h-3 w-3 mr-1" />
            Interno
          </Badge>
        );
      case "client_specific":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20">
            <Building2 className="h-3 w-3 mr-1" />
            {article.client?.name || "Cliente"}
          </Badge>
        );
      case "global":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 hover:bg-blue-500/20">
            <Globe className="h-3 w-3 mr-1" />
            Todos
          </Badge>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = () => {
    if (article.status === "publicado") {
      return (
        <Badge variant="default" className="bg-primary/10 text-primary border-primary/30">
          Publicado
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        Rascunho
      </Badge>
    );
  };

  return (
    <TableRow className="hover:bg-muted/50 cursor-pointer" onClick={() => canManage ? onEdit(article) : onView(article)}>
      {/* FAQ Number */}
      <TableCell>
        <Badge variant="outline" className="font-mono text-xs">
          {article.faq_number}
        </Badge>
      </TableCell>

      {/* Visibility */}
      <TableCell>
        {getVisibilityBadge()}
      </TableCell>

      {/* Title */}
      <TableCell className="font-medium max-w-[300px]">
        <div className="truncate" title={article.title}>
          {article.title}
        </div>
        {article.keywords && article.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {article.keywords.slice(0, 3).map((keyword, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="text-xs px-1.5 py-0"
              >
                {keyword}
              </Badge>
            ))}
            {article.keywords.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{article.keywords.length - 3}
              </span>
            )}
          </div>
        )}
      </TableCell>

      {/* Segment */}
      <TableCell>
        <Badge
          variant="outline"
          className={
            article.segment === "DB"
              ? "border-blue-500/50 text-blue-600 bg-blue-500/10"
              : "border-green-500/50 text-green-600 bg-green-500/10"
          }
        >
          {article.segment}
        </Badge>
      </TableCell>

      {/* Status */}
      <TableCell>
        {getStatusBadge()}
      </TableCell>

      {/* Author */}
      <TableCell className="text-muted-foreground">
        {article.author?.full_name || "-"}
      </TableCell>

      {/* Views */}
      <TableCell>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Eye className="h-3.5 w-3.5" />
          <span>{article.view_count || 0}</span>
        </div>
      </TableCell>

      {/* Linked Tickets */}
      <TableCell>
        <div className={`flex items-center gap-1 ${linkedTicketsCount > 0 ? "text-primary font-medium" : "text-muted-foreground"}`}>
          <Ticket className="h-3.5 w-3.5" />
          <span>{linkedTicketsCount}</span>
        </div>
      </TableCell>

      {/* Updated */}
      <TableCell className="text-muted-foreground text-sm">
        {article.updated_at
          ? format(new Date(article.updated_at), "dd MMM yyyy", { locale: ptBR })
          : "-"}
      </TableCell>

      {/* Actions */}
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-background border">
            <DropdownMenuItem onClick={() => onView(article)}>
              <Eye className="h-4 w-4 mr-2" />
              Visualizar
            </DropdownMenuItem>
            {canManage && (
              <DropdownMenuItem
                onClick={() => onDelete(article)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
