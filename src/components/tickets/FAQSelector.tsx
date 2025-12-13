import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, BookOpen, X, Check, Globe, Building2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface FAQSelectorProps {
  clientId: string | null;
  segment: "DB" | "APP" | null;
  selectedFAQId: string | null | undefined;
  onSelectFAQ: (faqId: string | null) => void;
}

export default function FAQSelector({ 
  clientId, 
  segment, 
  selectedFAQId, 
  onSelectFAQ 
}: FAQSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch FAQs available for this client (global or client-specific)
  const { data: faqs, isLoading } = useQuery({
    queryKey: ["faq-selector", clientId, segment],
    queryFn: async () => {
      if (!clientId) return [];

      // Query FAQs that are:
      // 1. Global (visibility = 'global') and published
      // 2. Client-specific (visibility = 'client_specific' AND client_id = clientId) and published
      // 3. Private (visibility = 'private' AND client_id = clientId) and published
      const { data, error } = await supabase
        .from("faq_articles")
        .select("id, faq_number, title, symptoms, visibility, segment")
        .eq("status", "publicado")
        .or(`visibility.eq.global,and(visibility.eq.client_specific,client_id.eq.${clientId}),and(visibility.eq.private,client_id.eq.${clientId})`);

      if (error) throw error;

      // Optionally filter by segment if provided
      let filtered = data || [];
      if (segment) {
        filtered = filtered.filter(faq => faq.segment === segment);
      }

      return filtered;
    },
    enabled: !!clientId,
  });

  // Filter by search term
  const filteredFaqs = faqs?.filter(faq => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      (faq.faq_number && faq.faq_number.toLowerCase().includes(search)) ||
      faq.title.toLowerCase().includes(search) ||
      faq.symptoms.toLowerCase().includes(search)
    );
  }) || [];

  const selectedFAQ = faqs?.find(f => f.id === selectedFAQId);

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'global': return <Globe className="h-3 w-3" />;
      case 'client_specific': return <Building2 className="h-3 w-3" />;
      case 'private': return <Lock className="h-3 w-3" />;
      default: return null;
    }
  };

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'global': return 'bg-blue-100 text-blue-800';
      case 'client_specific': return 'bg-green-100 text-green-800';
      case 'private': return 'bg-red-100 text-red-800';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (!clientId) return null;

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <BookOpen className="h-4 w-4" />
        Artigo FAQ Relacionado
      </Label>

      {/* Selected FAQ Display */}
      {selectedFAQ && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-sm font-medium truncate">{selectedFAQ.title}</span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 ml-6">
              {selectedFAQ.symptoms}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onSelectFAQ(null)}
            className="flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Search and Selection */}
      {!selectedFAQId && (
        <div className="border rounded-lg">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar artigos por título ou sintomas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <ScrollArea className="h-48">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Carregando artigos...
              </div>
            ) : filteredFaqs.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {searchTerm 
                  ? "Nenhum artigo encontrado para a busca" 
                  : "Nenhum artigo disponível para este cliente"
                }
              </div>
            ) : (
              <div className="divide-y">
                {filteredFaqs.map((faq) => (
                  <button
                    key={faq.id}
                    type="button"
                    onClick={() => onSelectFAQ(faq.id)}
                    className={cn(
                      "w-full p-3 text-left hover:bg-muted/50 transition-colors",
                      selectedFAQId === faq.id && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs px-1.5 py-0", getVisibilityColor(faq.visibility || 'private'))}
                      >
                        {getVisibilityIcon(faq.visibility || 'private')}
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground mr-1.5">{faq.faq_number}</span>
                      <span className="text-sm font-medium truncate flex-1">
                        {faq.title}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {faq.segment}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 ml-6">
                      {faq.symptoms}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Vincule uma FAQ existente para ajudar na resolução do problema
      </p>
    </div>
  );
}
