import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export type PeriodPreset =
  | "current-month"
  | "last-month"
  | "last-3-months"
  | "last-6-months"
  | "specific";

export type SinglePeriod = {
  preset: PeriodPreset;
  /** 1-12, used only when preset === "specific" */
  month?: number;
  /** YYYY, used only when preset === "specific" */
  year?: number;
};

export type ComparisonPeriod = {
  a: { month: number; year: number };
  b: { month: number; year: number };
};

export type ReportPeriodState =
  | { mode: "single"; period: SinglePeriod }
  | ({ mode: "comparison" } & ComparisonPeriod);

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

export function rangeFromMonthYear(month: number, year: number): DateRange {
  const d = new Date(year, month - 1, 1);
  return {
    start: startOfMonth(d),
    end: endOfMonth(d),
    label: format(d, "MMMM 'de' yyyy", { locale: ptBR }),
  };
}

export function rangeFromSingle(p: SinglePeriod): DateRange {
  const now = new Date();
  switch (p.preset) {
    case "current-month":
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
        label: format(now, "MMMM 'de' yyyy", { locale: ptBR }),
      };
    case "last-month": {
      const d = subMonths(now, 1);
      return {
        start: startOfMonth(d),
        end: endOfMonth(d),
        label: format(d, "MMMM 'de' yyyy", { locale: ptBR }),
      };
    }
    case "last-3-months":
      return {
        start: startOfMonth(subMonths(now, 2)),
        end: endOfMonth(now),
        label: "Últimos 3 meses",
      };
    case "last-6-months":
      return {
        start: startOfMonth(subMonths(now, 5)),
        end: endOfMonth(now),
        label: "Últimos 6 meses",
      };
    case "specific":
      if (p.month && p.year) return rangeFromMonthYear(p.month, p.year);
      return rangeFromSingle({ preset: "current-month" });
  }
}

export function rangesFromState(state: ReportPeriodState): DateRange[] {
  if (state.mode === "single") return [rangeFromSingle(state.period)];
  return [
    rangeFromMonthYear(state.a.month, state.a.year),
    rangeFromMonthYear(state.b.month, state.b.year),
  ];
}

export function defaultReportPeriodState(): ReportPeriodState {
  return { mode: "single", period: { preset: "current-month" } };
}

export function defaultComparison(): ComparisonPeriod {
  const now = new Date();
  const cur = { month: now.getMonth() + 1, year: now.getFullYear() };
  const prev = subMonths(now, 1);
  return {
    a: cur,
    b: { month: prev.getMonth() + 1, year: prev.getFullYear() },
  };
}
