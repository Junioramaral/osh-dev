import { useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const useRFCStepActions = (ticketId: string | null) => {
  const queryClient = useQueryClient();
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const startStep = useCallback(async (stepId: string) => {
    if (!ticketId) return;

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("rfc_steps")
      .update({
        started_at: new Date().toISOString(),
        started_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", stepId);

    if (error) {
      toast({ title: "Erro ao iniciar atividade", description: error.message, variant: "destructive" });
    }

    queryClient.invalidateQueries({ queryKey: ["rfc-steps", ticketId] });
    queryClient.invalidateQueries({ queryKey: ["client-rfc-steps", ticketId] });
    queryClient.invalidateQueries({ queryKey: ["ticket-rfc-steps", ticketId] });
  }, [ticketId, queryClient]);

  const toggleStep = useCallback(async (stepId: string, currentValue: boolean) => {
    if (!ticketId) return;

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("rfc_steps")
      .update({
        status_concluido: !currentValue,
        concluded_at: !currentValue ? new Date().toISOString() : null,
        concluded_by: !currentValue ? user?.id ?? null : null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", stepId);

    if (error) {
      toast({ title: "Erro ao atualizar passo", description: error.message, variant: "destructive" });
    }

    queryClient.invalidateQueries({ queryKey: ["rfc-steps", ticketId] });
    queryClient.invalidateQueries({ queryKey: ["client-rfc-steps", ticketId] });
    queryClient.invalidateQueries({ queryKey: ["ticket-rfc-steps", ticketId] });
  }, [ticketId, queryClient]);

  const updateObservacao = useCallback((stepId: string, text: string) => {
    if (debounceTimers.current[stepId]) {
      clearTimeout(debounceTimers.current[stepId]);
    }

    debounceTimers.current[stepId] = setTimeout(async () => {
      const { error } = await supabase
        .from("rfc_steps")
        .update({ observacao: text, updated_at: new Date().toISOString() } as any)
        .eq("id", stepId);

      if (error) {
        toast({ title: "Erro ao salvar observação", description: error.message, variant: "destructive" });
      }
    }, 1500);
  }, []);

  return { startStep, toggleStep, updateObservacao };
};
