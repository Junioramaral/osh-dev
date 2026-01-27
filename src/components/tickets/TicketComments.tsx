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
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Send, Paperclip, Info, Lock, Mail, Reply, Plus, ChevronDown, Users } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface CommentCardProps {
  comment: any;
}

function CommentCard({ comment }: CommentCardProps) {
  // Determinar a origem do comentário
  const isEmailReply = comment.source === 'email';
  const isInternal = comment.is_internal;
  
  // Nome do autor
  const authorName = isEmailReply 
    ? `${comment.sender_name || comment.sender_email}${comment.sender_name ? ' (via email)' : ''}`
    : comment.profiles?.full_name || comment.sender_name || 'Usuário';
  
  // Iniciais do avatar
  const avatarInitial = isEmailReply
    ? (comment.sender_name?.[0] || comment.sender_email?.[0] || 'C')
    : (comment.profiles?.full_name?.[0] || 'U');
  
  return (
    <Card className={`mb-4 ${
      isInternal ? 'border-yellow-200 bg-yellow-50/50' : 
      isEmailReply ? 'border-green-200 bg-green-50/50' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {avatarInitial}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{authorName}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(comment.created_at), 'dd/MM/yyyy HH:mm')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isInternal ? (
              <Badge variant="outline" className="bg-yellow-100 border-yellow-300 text-yellow-800">
                <Lock className="h-3 w-3 mr-1" />
                Interno
              </Badge>
            ) : isEmailReply ? (
              <Badge variant="outline" className="bg-green-100 border-green-300 text-green-800">
                <Reply className="h-3 w-3 mr-1" />
                Resposta do cliente
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
  ticket?: {
    analyst_id?: string | null;
    ticket_number?: string;
    title?: string;
    contact_name?: string;
    contact_email?: string;
  };
}

// Otimizzo client/tenant ID for client detection
const OTIMIZZO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export default function TicketComments({ ticketId, ticket }: TicketCommentsProps) {
  const { user, profile, isOtimizzoUser, isSuperAdmin, isViewer, hasRole, tenantId } = useAuth();
  const queryClient = useQueryClient();
  const { data: comments, isLoading } = useTicketComments(ticketId);
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [showCcField, setShowCcField] = useState(false);
  const [ccEmails, setCcEmails] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Validate and parse CC emails
  const validateEmails = (emailString: string): string[] => {
    if (!emailString.trim()) return [];
    
    const emails = emailString.split(',').map(e => e.trim()).filter(Boolean);
    const validEmails: string[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    for (const email of emails) {
      if (emailRegex.test(email)) {
        validEmails.push(email);
      }
    }
    return validEmails;
  };
  
  // IMPROVED: Detect client using profile.client_id as PRIMARY indicator
  // This is more reliable than tenantId from roles which may not be loaded yet
  // A user is a client if their profile.client_id is NOT Otimizzo
  const isClientByProfile = profile?.client_id !== null && 
                            profile?.client_id !== undefined && 
                            profile?.client_id !== OTIMIZZO_TENANT_ID;
  const isClientByTenant = tenantId !== null && tenantId !== OTIMIZZO_TENANT_ID;
  const isClientUser = isClientByProfile || isClientByTenant;
  
  // Debug logging for troubleshooting notification issues
  console.log('[TicketComments] Auth state:', {
    userId: user?.id,
    tenantId,
    isOtimizzoUser,
    isSuperAdmin,
    isClientUser,
    profileName: profile?.full_name
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ content, is_internal, ccEmails }: { content: string; is_internal: boolean; ccEmails: string[] }) => {
      // Fetch ticket details first
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select('contact_email, contact_name, ticket_number, title, first_response_at, analyst_id')
        .eq('id', ticketId)
        .single();
      
      if (ticketError) throw ticketError;
      
      // Insert comment with sender_name for client visibility
      const { data: commentData, error: commentError } = await supabase
        .from('ticket_comments')
        .insert({
          ticket_id: ticketId,
          author_id: user?.id,
          sender_name: profile?.full_name,
          sender_email: user?.email,
          content,
          is_internal
        })
        .select('*, profiles(full_name)')
        .single();
      
      if (commentError) throw commentError;
      
      // Check and mark first response
      if (!ticketData?.first_response_at) {
        await supabase
          .from('tickets')
          .update({ first_response_at: new Date().toISOString() })
          .eq('id', ticketId);
      }
      
      // Debug: Log notification decision
      console.log('[TicketComments] Notification decision:', {
        isClientUser,
        analystId: ticketData?.analyst_id,
        isInternal: is_internal,
        willNotifyAnalyst: isClientUser && ticketData?.analyst_id && !is_internal,
        willNotifyClient: !isClientUser && !is_internal
      });
      
      // If client is commenting (and not internal), notify the analyst
      if (isClientUser && ticketData?.analyst_id && !is_internal) {
        try {
          console.log('[TicketComments] Calling send-analyst-notification...');
          const { error: notifyError } = await supabase.functions.invoke('send-analyst-notification', {
            body: {
              ticketId,
              ticketNumber: ticketData.ticket_number,
              ticketTitle: ticketData.title,
              commentContent: content,
              clientName: ticketData.contact_name,
              clientEmail: ticketData.contact_email,
              ccEmails: ccEmails.length > 0 ? ccEmails : undefined,
            }
          });
          
          if (notifyError) {
            console.error('[TicketComments] Error notifying analyst:', notifyError);
          } else {
            console.log('[TicketComments] Analyst notification sent successfully');
          }
        } catch (error) {
          console.error('[TicketComments] Error calling analyst notification function:', error);
        }
      }
      
      // Send email notification to client if comment is external and from staff (not client)
      if (!is_internal && !isClientUser) {
        try {
          console.log('[TicketComments] Calling send-comment-notification (staff to client)...');
          const { error: emailError } = await supabase.functions.invoke('send-comment-notification', {
            body: {
              ticketId,
              commentId: commentData.id,
              commentContent: content,
              authorName: commentData.profiles?.full_name || 'Equipe de Suporte',
              contactEmail: ticketData.contact_email,
              contactName: ticketData.contact_name,
              ticketNumber: ticketData.ticket_number,
              ticketTitle: ticketData.title,
              ccEmails: ccEmails.length > 0 ? ccEmails : undefined,
            }
          });
          
          if (emailError) {
            console.error('[TicketComments] Error sending email to client:', emailError);
          } else {
            console.log('[TicketComments] Client notification sent successfully');
          }
        } catch (error) {
          console.error('[TicketComments] Error calling client notification function:', error);
        }
      }
      
      return { commentData, isExternal: !is_internal, isClientComment: isClientUser, hasCc: ccEmails.length > 0 };
    },
    onSuccess: (data) => {
      setNewComment('');
      setIsInternal(false);
      setCcEmails('');
      setShowCcField(false);
      queryClient.invalidateQueries({ queryKey: ['ticket-comments', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-detail', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-history', ticketId] });
      
      const ccMessage = data.hasCc ? ' (com cópia)' : '';
      
      if (data.isClientComment) {
        toast({ 
          title: 'Comentário enviado',
          description: `O analista responsável será notificado${ccMessage}`
        });
      } else if (data.isExternal) {
        toast({ 
          title: 'Comentário enviado e cliente notificado por email',
          description: `O cliente receberá uma notificação sobre esta atualização${ccMessage}`
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
    
    const validatedCcEmails = validateEmails(ccEmails);
    addCommentMutation.mutate({ content: newComment, is_internal: isInternal, ccEmails: validatedCcEmails });
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
      
      {/* Comment Form - Hidden for viewers */}
      {!isViewer && (
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
          
          {/* CC Field - Collapsible */}
          {!isInternal && (
            <Collapsible open={showCcField} onOpenChange={setShowCcField} className="mb-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground h-8 px-2">
                  {showCcField ? <ChevronDown className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                  {showCcField ? 'Ocultar CC' : 'Adicionar emails em cópia (CC)'}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={ccEmails}
                      onChange={(e) => setCcEmails(e.target.value)}
                      placeholder="email1@exemplo.com, email2@exemplo.com"
                      className="text-sm"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    Separe múltiplos emails por vírgula. Eles receberão uma cópia da notificação.
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
          
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
                  {ccEmails.trim() ? `Cliente + ${validateEmails(ccEmails).length} CC` : 'Cliente será notificado'}
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
      )}

      {/* Viewer read-only message */}
      {isViewer && (
        <Card className="p-4 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30">
          <p className="text-sm text-purple-600 dark:text-purple-400 text-center">
            Modo somente leitura (Auditor) - Você não pode adicionar comentários
          </p>
        </Card>
      )}
    </div>
  );
}
