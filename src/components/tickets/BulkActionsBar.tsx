import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Users, 
  UserCircle, 
  ListChecks, 
  AlertCircle, 
  X 
} from "lucide-react";

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onAssignAnalyst: () => void;
  onAssignTeam: () => void;
  onChangeStatus: (status: string) => void;
  onChangePriority: (priority: string) => void;
}

export function BulkActionsBar({ 
  selectedCount, 
  onClearSelection,
  onAssignAnalyst,
  onAssignTeam,
  onChangeStatus,
  onChangePriority
}: BulkActionsBarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg px-6 py-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5" />
          <span className="font-semibold">{selectedCount} ticket(s) selecionado(s)</span>
        </div>
        
        <div className="h-6 w-px bg-primary-foreground/20" />
        
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onAssignAnalyst}
          >
            <UserCircle className="h-4 w-4 mr-2" />
            Atribuir Analista
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={onAssignTeam}
          >
            <Users className="h-4 w-4 mr-2" />
            Atribuir Time
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm">
                <AlertCircle className="h-4 w-4 mr-2" />
                Alterar Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Escolha o Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onChangeStatus("novo")}>
                Novo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeStatus("em_atendimento")}>
                Em Atendimento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeStatus("aguardando_cliente")}>
                Aguardando Cliente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeStatus("resolvido")}>
                Resolvido
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeStatus("fechado")}>
                Fechado
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm">
                Alterar Prioridade
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Escolha a Prioridade</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {["P1", "P2", "P3", "P4"].map((priority) => (
                <DropdownMenuItem key={priority} onClick={() => onChangePriority(priority)}>
                  {priority}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClearSelection}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
