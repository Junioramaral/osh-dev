import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ArrowUp, ArrowDown, ChevronDown, ChevronUp } from "lucide-react";

export interface RFCStep {
  id: string;
  descricao: string;
  procedimento: string;
  scripts: string;
  ordem: number;
}

interface RFCStepBuilderProps {
  steps: RFCStep[];
  onStepsChange: (steps: RFCStep[]) => void;
}

export default function RFCStepBuilder({ steps, onStepsChange }: RFCStepBuilderProps) {
  const [newStep, setNewStep] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAdd = () => {
    const trimmed = newStep.trim();
    if (!trimmed) return;
    const next: RFCStep = {
      id: crypto.randomUUID(),
      descricao: trimmed,
      procedimento: "",
      scripts: "",
      ordem: steps.length,
    };
    onStepsChange([...steps, next]);
    setNewStep("");
    setExpandedId(next.id);
  };

  const handleDelete = (id: string) => {
    const updated = steps
      .filter((s) => s.id !== id)
      .map((s, i) => ({ ...s, ordem: i }));
    onStepsChange(updated);
    if (expandedId === id) setExpandedId(null);
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

  const updateStep = (id: string, field: keyof RFCStep, value: string) => {
    onStepsChange(steps.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
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

      {/* Lista de passos como cards accordion */}
      {steps.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          Nenhum passo adicionado. Adicione pelo menos um passo para descrever o plano.
        </p>
      ) : (
        <ol className="space-y-2">
          {steps.map((step, index) => {
            const isExpanded = expandedId === step.id;
            return (
              <li key={step.id} className="rounded-md border border-border bg-card overflow-hidden">
                {/* Header do card */}
                <div
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleExpand(step.id)}
                >
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium truncate">
                    {step.descricao || <span className="text-muted-foreground italic">Sem título</span>}
                  </span>
                  <div
                    className="flex gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
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
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                </div>

                {/* Body expandido */}
                {isExpanded && (
                  <div className="border-t border-border px-3 pb-3 pt-3 space-y-3 bg-muted/20">
                    {/* Título do Passo */}
                    <div className="space-y-1">
                      <Label className="text-xs">Título do Passo *</Label>
                      <Input
                        value={step.descricao}
                        onChange={(e) => updateStep(step.id, "descricao", e.target.value)}
                        placeholder="Ex: Instalar Linux"
                        className="text-sm"
                      />
                    </div>

                    {/* Procedimento Detalhado */}
                    <div className="space-y-1">
                      <Label className="text-xs">Procedimento Detalhado</Label>
                      <Textarea
                        value={step.procedimento}
                        onChange={(e) => updateStep(step.id, "procedimento", e.target.value)}
                        placeholder="Descreva o procedimento passo a passo..."
                        rows={4}
                        className="text-sm resize-none"
                      />
                    </div>

                    {/* Scripts / Comandos */}
                    <div className="space-y-1">
                      <Label className="text-xs">Scripts / Comandos</Label>
                      <Textarea
                        value={step.scripts}
                        onChange={(e) => updateStep(step.id, "scripts", e.target.value)}
                        placeholder="# Cole seus scripts ou comandos aqui..."
                        rows={4}
                        className="font-mono text-sm resize-none bg-zinc-900 text-green-400 border-zinc-700 placeholder:text-zinc-500 focus-visible:ring-zinc-500"
                      />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
