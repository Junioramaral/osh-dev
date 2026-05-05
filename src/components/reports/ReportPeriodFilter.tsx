import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeftRight, CalendarRange } from "lucide-react";
import {
  ReportPeriodState,
  PeriodPreset,
  defaultComparison,
} from "@/lib/reportPeriod";

interface Props {
  value: ReportPeriodState;
  onChange: (v: ReportPeriodState) => void;
  /** Hide the comparison toggle (e.g. for reports that don't support it yet) */
  allowComparison?: boolean;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "current-month", label: "Mês Atual" },
  { value: "last-month", label: "Mês Anterior" },
  { value: "last-3-months", label: "Últimos 3 Meses" },
  { value: "last-6-months", label: "Últimos 6 Meses" },
  { value: "specific", label: "Mês Específico" },
];

const ReportPeriodFilter = ({ value, onChange, allowComparison = true }: Props) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  const switchToSingle = () =>
    onChange({ mode: "single", period: { preset: "current-month" } });
  const switchToComparison = () =>
    onChange({ mode: "comparison", ...defaultComparison() });

  return (
    <div className="space-y-3 print:hidden">
      {allowComparison && (
        <div className="inline-flex gap-1 bg-muted p-1 rounded-lg">
          <Button
            type="button"
            size="sm"
            variant={value.mode === "single" ? "default" : "ghost"}
            onClick={switchToSingle}
          >
            <CalendarRange className="h-4 w-4 mr-1" />
            Período
          </Button>
          <Button
            type="button"
            size="sm"
            variant={value.mode === "comparison" ? "default" : "ghost"}
            onClick={switchToComparison}
          >
            <ArrowLeftRight className="h-4 w-4 mr-1" />
            Comparativo
          </Button>
        </div>
      )}

      {value.mode === "single" ? (
        <div className="flex gap-2 flex-wrap">
          <Select
            value={value.period.preset}
            onValueChange={(v) =>
              onChange({
                mode: "single",
                period: {
                  preset: v as PeriodPreset,
                  month:
                    v === "specific"
                      ? value.period.month ?? new Date().getMonth() + 1
                      : undefined,
                  year:
                    v === "specific"
                      ? value.period.year ?? currentYear
                      : undefined,
                },
              })
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {value.period.preset === "specific" && (
            <>
              <Select
                value={(value.period.month ?? new Date().getMonth() + 1).toString()}
                onValueChange={(v) =>
                  onChange({
                    mode: "single",
                    period: { ...value.period, preset: "specific", month: parseInt(v) },
                  })
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((label, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={(value.period.year ?? currentYear).toString()}
                onValueChange={(v) =>
                  onChange({
                    mode: "single",
                    period: { ...value.period, preset: "specific", year: parseInt(v) },
                  })
                }
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Período A
              </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Select
                value={value.a.month.toString()}
                onValueChange={(v) =>
                  onChange({ ...value, a: { ...value.a, month: parseInt(v) } })
                }
              >
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((label, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={value.a.year.toString()}
                onValueChange={(v) =>
                  onChange({ ...value, a: { ...value.a, year: parseInt(v) } })
                }
              >
                <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => (<SelectItem key={y} value={y}>{y}</SelectItem>))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                Período B
              </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Select
                value={value.b.month.toString()}
                onValueChange={(v) =>
                  onChange({ ...value, b: { ...value.b, month: parseInt(v) } })
                }
              >
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((label, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={value.b.year.toString()}
                onValueChange={(v) =>
                  onChange({ ...value, b: { ...value.b, year: parseInt(v) } })
                }
              >
                <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => (<SelectItem key={y} value={y}>{y}</SelectItem>))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ReportPeriodFilter;