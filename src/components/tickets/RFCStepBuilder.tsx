import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

export interface RFCStep {
  id: string;
  descricao: string;
  ordem: number;
}

interface RFCStepBuilderProps {
  steps: RFCStep[];
  onStepsChange: (steps: RFCStep[]) => void;
}

export default function RFCStepBuilder({ steps, onStepsChange }: RFCStepBuilderProps) {
  const [newStep, setNewStep] = useState("");

  const handleAdd = () => {
    const trimmed = newStep.trim();
    if (!trimmed) return;
    const next: RFCStep = {
      id: crypto.randomUUID(),
      descricao: trimmed,
      ordem: steps.length,
    };
    onStepsChange([...steps, next]);
    setNewStep("");
  };

  const handleDelete = (id: string) => {
    const updated = steps
      .filter((s) => s.id !== id)
      .map((s, i) => ({ ...s, ordem: i }));
    onStepsChange(updated);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...steps];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onStepsChange(updated.map((s, i) => ({ ...s, ordem: i })));
  };

  const moveDown = (index: number) => {
    if (index === steps.length - 1) return;
    const updated = [...steps];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onStepsChange(updated.map((s, i) => ({ ...s, ordem: i })));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-3">
      <Label>Passos do Plano de Implementação</Label>

      {/* Input para novo passo */}
      <div className="flex gap-2">
        <Input
          value={newStep}
          onChange={(e) => setNewStep(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Descreva um passo e pressione Enter ou clique em Adicionar"
        />
        <Button type="button" onClick={handleAdd} variant="outline" size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Lista de passos */}
      {steps.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          Nenhum passo adicionado. Adicione pelo menos um passo para descrever o plano.
        </p>
      ) : (
        <ol className="space-y-2">
          {steps.map((step, index) => (
            <li
              key={step.id}
              className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2"
            >
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {index + 1}
              </span>
              <span className="flex-1 text-sm">{step.descricao}</span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveDown(index)}
                  disabled={index === steps.length - 1}
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(step.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
