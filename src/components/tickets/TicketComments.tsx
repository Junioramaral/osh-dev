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
import { Send, Paperclip, Info, Lock, Mail } from "lucide-react";
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
            {comment.is_internal ? (
              <Badge variant="outline" className="bg-yellow-100 border-yellow-300 text-yellow-800">
                <Lock className="h-3 w-3 mr-1" />
                Interno
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-blue-100 border-blue-300 text-blue-800">
                <Mail className="h-3 w-3 mr-1" />
                Enviado ao cliente
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
      // Fetch ticket details first
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('contact_email, contact_name, ticket_number, title, first_response_at')
        .eq('id', ticketId)
        .single();
      
      if (ticketError) throw ticketError;
      
      // Insert comment
      const { data: commentData, error: commentError } = await supabase
        .from('ticket_comments')
        .insert({
          ticket_id: ticketId,
          author_id: user?.id,
          content,
          is_internal
        })
        .select('*, profiles(full_name)')
        .single();
      
      if (commentError) throw commentError;
      
      // Check and mark first response
      if (!ticket?.first_response_at) {
        await supabase
          .from('tickets')
          .update({ first_response_at: new Date().toISOString() })
          .eq('id', ticketId);
      }
      
      // Send email notification if comment is external
      if (!is_internal) {
        try {
          const { error: emailError } = await supabase.functions.invoke('send-comment-notification', {
            body: {
              ticketId,
              commentContent: content,
              authorName: commentData.profiles?.full_name || 'Equipe de Suporte',
              contactEmail: ticket.contact_email,
              contactName: ticket.contact_name,
              ticketNumber: ticket.ticket_number,
              ticketTitle: ticket.title,
            }
          });
          
          if (emailError) {
            console.error('Error sending email notification:', emailError);
            // Don't throw error - comment was saved successfully
          }
        } catch (error) {
          console.error('Error calling email notification function:', error);
          // Don't throw error - comment was saved successfully
        }
      }
      
      return { commentData, isExternal: !is_internal };
    },
    onSuccess: (data) => {
      setNewComment('');
      setIsInternal(false);
      queryClient.invalidateQueries({ queryKey: ['ticket-comments', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-detail', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-history', ticketId] });
      
      if (data.isExternal) {
        toast({ 
          title: 'Comentário enviado e cliente notificado por email',
          description: 'O cliente receberá uma notificação sobre esta atualização'
        });
      } else {
        toast({ title: 'Comentário interno adicionado com sucesso' });
      }
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
    
    if (newComment.length > 10000) {
      toast({ 
        title: 'Comentário muito longo', 
        description: 'O comentário deve ter no máximo 10.000 caracteres',
        variant: 'destructive' 
      });
      return;
    }
    
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
        <div className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Adicionar comentário..."
            className="min-h-[100px]"
            maxLength={10000}
          />
          <p className="text-xs text-muted-foreground text-right">
            {newComment.length} / 10.000 caracteres
          </p>
        </div>
        
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
                    <p className="max-w-xs text-xs">
                      {isInternal 
                        ? "🔒 O cliente NÃO receberá este comentário" 
                        : "📧 O cliente receberá este comentário por email"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isInternal && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Cliente será notificado
              </span>
            )}
            <Button 
              onClick={handleSubmit} 
              disabled={!newComment.trim() || addCommentMutation.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
