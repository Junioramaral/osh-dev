import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LucideIcon, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export const ENVIRONMENT_LABELS: Record<string, { label: string; color: string }> = {
  prod: { label: "Produção", color: "text-red-600" },
  hom: { label: "Homologação", color: "text-yellow-600" },
  qa: { label: "QA", color: "text-blue-600" },
  dev: { label: "Desenvolvimento", color: "text-green-600" },
};

const ENV_ORDER = ["prod", "hom", "qa", "dev"];

export interface ClientCardData {
  clientId: string;
  clientName: string;
  total: number;
  byEnvironment: Record<string, number>;
}

interface Props {
  items: ClientCardData[];
  icon: LucideIcon;
  onSelect: (item: { id: string; name: string }) => void;
  emptyLabel?: string;
}

export default function ClientEnvironmentCards({ items, icon: Icon, onSelect, emptyLabel }: Props) {
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Icon className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{emptyLabel || "Nenhum cliente encontrado"}</h3>
          <p className="text-muted-foreground text-center max-w-md mb-4">
            Este recurso pertence a um cliente. Cadastre ou selecione um cliente para começar.
          </p>
          <Button onClick={() => navigate("/clients")}>
            <Users className="mr-2 h-4 w-4" />
            Ir para Clientes
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const envEntries = ENV_ORDER
          .filter((env) => item.byEnvironment[env])
          .map((env) => ({ env, count: item.byEnvironment[env], cfg: ENVIRONMENT_LABELS[env] }));
        const otherEnvs = Object.keys(item.byEnvironment)
          .filter((env) => !ENV_ORDER.includes(env))
          .map((env) => ({ env, count: item.byEnvironment[env], cfg: { label: env.toUpperCase(), color: "text-muted-foreground" } }));
        const all = [...envEntries, ...otherEnvs];

        return (
          <Card
            key={item.clientId}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onSelect({ id: item.clientId, name: item.clientName })}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary" />
                <span className="flex-1">{item.clientName}</span>
                <Badge variant="secondary">{item.total}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {all.map(({ env, count, cfg }) => (
                <div key={env} className="flex items-center justify-between text-sm">
                  <span className={cn("font-medium", cfg.color)}>{cfg.label}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
