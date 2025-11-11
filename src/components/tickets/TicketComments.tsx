import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTicketComments } from "@/hooks/useTicketDetail";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Send, Paperclip, Info, Lock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface CommentCardProps {
  comment: any;
}

function CommentCard({ comment }: CommentCardProps) {
  return (
    <Card className={`mb-4 ${comment.is_internal ? 'border-yellow-200 bg-yellow-50/50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {comment.profiles?.full_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{comment.profiles?.full_name || 'Usuário'}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(comment.created_at), 'dd/MM/yyyy HH:mm')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {comment.is_internal && (
              <Badge variant="outline" className="bg-yellow-100 border-yellow-300">
                <Lock className="h-3 w-3 mr-1" />
                Interno
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
      </CardContent>
    </Card>
  );
}

interface TicketCommentsProps {
  ticketId: string;
}

export default function TicketComments({ ticketId }: TicketCommentsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: comments, isLoading } = useTicketComments(ticketId);
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const addCommentMutation = useMutation({
    mutationFn: async ({ content, is_internal }: { content: string; is_internal: boolean }) => {
      const { data, error } = await supabase
        .from('ticket_comments')
        .insert({
          ticket_id: ticketId,
          author_id: user?.id,
          content,
          is_internal
        })
        .select()
        .single();
      if (error) throw error;
      
      // Check and mark first response
      const { data: ticket } = await supabase
        .from('tickets')
        .select('first_response_at')
        .eq('id', ticketId)
        .single();
      
      if (!ticket?.first_response_at) {
        await supabase
          .from('tickets')
          .update({ first_response_at: new Date().toISOString() })
          .eq('id', ticketId);
      }
      
      return data;
    },
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['ticket-comments', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-detail', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-history', ticketId] });
      toast({ title: 'Comentário adicionado com sucesso' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro ao adicionar comentário', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });
  
  const handleSubmit = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate({ content: newComment, is_internal: isInternal });
  };
  
  return (
    <div className="space-y-4">
      <ScrollArea className="h-[400px]">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Carregando comentários...</p>
        ) : comments && comments.length > 0 ? (
          comments.map((comment) => <CommentCard key={comment.id} comment={comment} />)
        ) : (
          <p className="text-center text-muted-foreground py-8">Nenhum comentário ainda</p>
        )}
      </ScrollArea>
      
      <Card className="p-4">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Adicionar comentário..."
          className="min-h-[100px] mb-4"
        />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={isInternal} onCheckedChange={setIsInternal} id="internal" />
              <Label htmlFor="internal" className="text-sm cursor-pointer">Comentário interno</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">Comentários internos são visíveis apenas para a equipe</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          <Button 
            onClick={handleSubmit} 
            disabled={!newComment.trim() || addCommentMutation.isPending}
          >
            <Send className="h-4 w-4 mr-2" />
            Enviar
          </Button>
        </div>
      </Card>
    </div>
  );
}
