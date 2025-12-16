import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeedbackRequest {
  ticketId: string;
  token: string;
  action: "validate" | "submit";
  rating?: number;
  comment?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { ticketId, token, action, rating, comment }: FeedbackRequest = await req.json();

    console.log("Feedback request:", { ticketId, token, action, rating });

    // Validate required fields
    if (!ticketId || !token) {
      return new Response(
        JSON.stringify({ error: "Missing required fields", valid: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch ticket with feedback token
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("id, ticket_number, title, feedback_token, csat_submitted_at, csat_rating")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      console.error("Ticket not found:", ticketError?.message);
      return new Response(
        JSON.stringify({ error: "Ticket not found", valid: false }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate token
    if (ticket.feedback_token !== token) {
      console.error("Invalid feedback token");
      return new Response(
        JSON.stringify({ error: "Invalid token", valid: false }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle validation action
    if (action === "validate") {
      const alreadySubmitted = ticket.csat_submitted_at !== null;
      return new Response(
        JSON.stringify({
          valid: true,
          alreadySubmitted,
          ticket: {
            ticket_number: ticket.ticket_number,
            title: ticket.title,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle submit action
    if (action === "submit") {
      // Check if already submitted
      if (ticket.csat_submitted_at !== null) {
        return new Response(
          JSON.stringify({ error: "Feedback already submitted", success: false }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate rating
      if (!rating || rating < 1 || rating > 5) {
        return new Response(
          JSON.stringify({ error: "Invalid rating. Must be between 1 and 5.", success: false }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update ticket with CSAT data
      const { error: updateError } = await supabase
        .from("tickets")
        .update({
          csat_rating: rating,
          csat_comment: comment || null,
          csat_submitted_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      if (updateError) {
        console.error("Error updating ticket:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to save feedback", success: false }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Feedback submitted successfully for ticket:", ticketId, "Rating:", rating);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in submit-feedback function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
