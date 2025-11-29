import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface BulkAssignAnalystDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (analystId: string) => void;
  selectedCount: number;
}

export function BulkAssignAnalystDialog({
  open,
  onOpenChange,
  onConfirm,
  selectedCount
}: BulkAssignAnalystDialogProps) {
  const [selectedAnalyst, setSelectedAnalyst] = useState<string>("");

  // Buscar analistas Otimizzo ativos
  const { data: analysts, isLoading } = useQuery({
    queryKey: ["otimizzo-analysts"],
    queryFn: async () => {
      // Buscar perfis do tenant Otimizzo
      const { data: otimizzoTenant } = await supabase
        .from("clients")
        .select("id")
        .eq("tenant_type", "otimizzo")
        .single();

      if (!otimizzoTenant) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, team_id, teams(name, segment)")
        .eq("client_id", otimizzoTenant.id)
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      return data?.map(analyst => ({
        ...analyst,
        teams: analyst.teams && Array.isArray(analyst.teams) && analyst.teams.length > 0 
          ? analyst.teams[0] 
          : null
      })) || [];
    },
    enabled: open,
  });

  const handleConfirm = () => {
    if (selectedAnalyst) {
      onConfirm(selectedAnalyst);
      setSelectedAnalyst("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Atribuir Analista ({selectedCount} tickets)
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <RadioGroup value={selectedAnalyst} onValueChange={setSelectedAnalyst}>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {analysts?.map((analyst) => (
                <div
                  key={analyst.id}
                  className="flex items-center space-x-3 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer"
                  onClick={() => setSelectedAnalyst(analyst.id)}
                >
                  <RadioGroupItem value={analyst.id} id={analyst.id} />
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {analyst.full_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Label
                      htmlFor={analyst.id}
                      className="font-medium cursor-pointer"
                    >
                      {analyst.full_name}
                    </Label>
                    {analyst.teams && (
                      <p className="text-sm text-muted-foreground">
                        {analyst.teams.name} - {analyst.teams.segment}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </RadioGroup>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedAnalyst}>
            Atribuir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
