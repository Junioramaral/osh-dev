import { useState, useEffect } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users } from "lucide-react";

interface BulkAssignTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (teamId: string) => void;
  selectedCount: number;
  currentTeamId?: string | null;
}

export function BulkAssignTeamDialog({
  open,
  onOpenChange,
  onConfirm,
  selectedCount,
  currentTeamId
}: BulkAssignTeamDialogProps) {
  const [selectedTeam, setSelectedTeam] = useState<string>("");

  // Sincronizar com o time atual quando o diálogo abre
  useEffect(() => {
    if (open && currentTeamId) {
      setSelectedTeam(currentTeamId);
    } else if (!open) {
      setSelectedTeam("");
    }
  }, [open, currentTeamId]);

  // Buscar times disponíveis
  const { data: teams, isLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleConfirm = () => {
    if (selectedTeam) {
      onConfirm(selectedTeam);
      setSelectedTeam("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Atribuir Time ({selectedCount} tickets)
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <RadioGroup value={selectedTeam} onValueChange={setSelectedTeam}>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {teams?.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center space-x-3 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer"
                  onClick={() => setSelectedTeam(team.id)}
                >
                  <RadioGroupItem value={team.id} id={team.id} />
                  <div className="flex items-center gap-2 flex-1">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <Label
                        htmlFor={team.id}
                        className="font-medium cursor-pointer"
                      >
                        {team.name}
                      </Label>
                      {team.specialization && (
                        <p className="text-sm text-muted-foreground">
                          {team.specialization}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline">
                      {team.segment}
                    </Badge>
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
          <Button onClick={handleConfirm} disabled={!selectedTeam}>
            Atribuir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
