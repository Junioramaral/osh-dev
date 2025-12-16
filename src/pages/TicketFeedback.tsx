import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export default function TicketFeedback() {
  const { ticketId, token } = useParams<{ ticketId: string; token: string }>();
  const [searchParams] = useSearchParams();
  const presetRating = searchParams.get("rating");

  const [rating, setRating] = useState<number>(presetRating ? parseInt(presetRating) : 0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [ticketInfo, setTicketInfo] = useState<{ ticket_number: string; title: string } | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTicketInfo = async () => {
      if (!ticketId || !token) {
        setError("Link inválido. Por favor, use o link enviado no email.");
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase.functions.invoke("submit-feedback", {
        body: { ticketId, token, action: "validate" },
      });

      if (fetchError) {
        console.error("Error validating ticket:", fetchError);
        setError("Não foi possível validar o ticket. Por favor, tente novamente.");
        setIsLoading(false);
        return;
      }

      if (data.alreadySubmitted) {
        setAlreadySubmitted(true);
        setTicketInfo(data.ticket);
      } else if (data.valid) {
        setTicketInfo(data.ticket);
      } else {
        setError(data.error || "Link inválido ou expirado.");
      }

      setIsLoading(false);
    };

    fetchTicketInfo();
  }, [ticketId, token]);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Por favor, selecione uma avaliação.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const { data, error: submitError } = await supabase.functions.invoke("submit-feedback", {
      body: {
        ticketId,
        token,
        rating,
        comment: comment.trim() || null,
        action: "submit",
      },
    });

    if (submitError || !data?.success) {
      console.error("Error submitting feedback:", submitError);
      setError(data?.error || "Erro ao enviar avaliação. Por favor, tente novamente.");
      setIsSubmitting(false);
      return;
    }

    setSubmitSuccess(true);
    setIsSubmitting(false);
  };

  const ratingLabels = ["Péssimo", "Ruim", "Regular", "Bom", "Excelente"];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Carregando...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !ticketInfo) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-center text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (alreadySubmitted || submitSuccess) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {submitSuccess ? "Obrigado pela sua avaliação!" : "Avaliação já enviada"}
            </h2>
            <p className="text-center text-muted-foreground">
              {submitSuccess
                ? "Sua opinião é muito importante para continuarmos melhorando nossos serviços."
                : "Este ticket já foi avaliado anteriormente. Agradecemos seu feedback!"}
            </p>
            {ticketInfo && (
              <div className="mt-4 p-3 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Ticket #{ticketInfo.ticket_number}</p>
                <p className="text-sm font-medium">{ticketInfo.title}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Star className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Avaliação de Atendimento</CardTitle>
          <CardDescription>
            {ticketInfo && (
              <span className="block mt-2">
                Ticket #{ticketInfo.ticket_number} - {ticketInfo.title}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Star Rating */}
          <div className="space-y-3">
            <Label className="text-center block">Como você avalia nosso atendimento?</Label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                >
                  <Star
                    className={cn(
                      "h-10 w-10 transition-colors",
                      (hoveredRating || rating) >= star
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/30"
                    )}
                  />
                </button>
              ))}
            </div>
            {(hoveredRating || rating) > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                {ratingLabels[(hoveredRating || rating) - 1]}
              </p>
            )}
            <div className="flex justify-between text-xs text-muted-foreground px-2">
              <span>Péssimo</span>
              <span>Excelente</span>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Comentário (opcional)</Label>
            <Textarea
              id="comment"
              placeholder="Conte-nos mais sobre sua experiência..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Avaliação"
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Sua avaliação é anônima e nos ajuda a melhorar continuamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
