import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const SLAAcknowledge = () => {
  const { notificationId, token } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "already" | "error">("loading");
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const acknowledgeNotification = async () => {
      if (!notificationId || !token) {
        setStatus("error");
        setMessage("Parâmetros inválidos");
        return;
      }

      try {
        // Fetch notification
        const { data: notification, error: fetchError } = await supabase
          .from("sla_notifications")
          .select("id, ticket_id, acknowledgment_token, acknowledged_at")
          .eq("id", notificationId)
          .maybeSingle();

        if (fetchError || !notification) {
          setStatus("error");
          setMessage("Notificação não encontrada");
          return;
        }

        // Validate token
        if (notification.acknowledgment_token !== token) {
          setStatus("error");
          setMessage("Token inválido");
          return;
        }

        setTicketId(notification.ticket_id);

        // Check if already acknowledged
        if (notification.acknowledged_at) {
          setStatus("already");
          setMessage("Esta notificação já foi confirmada anteriormente.");
          return;
        }

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        // Update notification
        const { error: updateError } = await supabase
          .from("sla_notifications")
          .update({
            acknowledged_at: new Date().toISOString(),
            acknowledged_by: user?.id || null,
          })
          .eq("id", notificationId);

        if (updateError) {
          console.error("Error updating notification:", updateError);
          setStatus("error");
          setMessage("Erro ao confirmar ciência");
          return;
        }

        setStatus("success");
        setMessage("Ciência confirmada com sucesso! Você não receberá novas notificações sobre este alerta por 12 horas.");
      } catch (error) {
        console.error("Unexpected error:", error);
        setStatus("error");
        setMessage("Erro interno do servidor");
      }
    };

    acknowledgeNotification();
  }, [notificationId, token]);

  const handleNavigate = () => {
    if (ticketId) {
      navigate(`/tickets/${ticketId}`);
    } else {
      navigate("/tickets");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-primary/10 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {status === "loading" ? (
          <>
            <Loader2 className="h-16 w-16 mx-auto mb-6 text-primary animate-spin" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Processando...
            </h1>
            <p className="text-muted-foreground">
              Confirmando sua ciência do alerta de SLA
            </p>
          </>
        ) : status === "success" || status === "already" ? (
          <>
            <CheckCircle className="h-16 w-16 mx-auto mb-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {status === "success" ? "Ciência Confirmada" : "Já Confirmado"}
            </h1>
            <p className="text-muted-foreground mb-6">
              {message}
            </p>
            <Button onClick={handleNavigate} className="w-full">
              {ticketId ? "Ver Ticket" : "Ver Todos os Tickets"}
            </Button>
            {status === "success" && (
              <div className="mt-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                <strong>💡 Nota:</strong> Novas notificações para este ticket serão silenciadas por 12 horas.
              </div>
            )}
          </>
        ) : (
          <>
            <XCircle className="h-16 w-16 mx-auto mb-6 text-destructive" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Erro
            </h1>
            <p className="text-muted-foreground mb-6">
              {message}
            </p>
            <Button onClick={handleNavigate} variant="outline" className="w-full">
              Ir para Tickets
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default SLAAcknowledge;
