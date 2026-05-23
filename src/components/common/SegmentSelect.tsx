import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAvailableSegments, type SegmentCode } from "@/hooks/useAvailableSegments";

interface SegmentSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  /** When set (and user is internal), restrict segments to this client's contract. */
  clientId?: string | null;
  /** Show the "Todos Segmentos" option (default true). */
  includeAll?: boolean;
  /** Use short labels "DB"/"APP" instead of "Banco de Dados"/"Aplicação". */
  shortLabels?: boolean;
  className?: string;
  placeholder?: string;
  /** Hide entirely when only one segment is available. */
  hideWhenSingle?: boolean;
}

const LABELS_LONG: Record<SegmentCode, string> = {
  DB: "Banco de Dados",
  APP: "Aplicação",
};
const LABELS_SHORT: Record<SegmentCode, string> = {
  DB: "DB",
  APP: "APP",
};

export function SegmentSelect({
  value,
  onValueChange,
  clientId,
  includeAll = true,
  shortLabels = false,
  className,
  placeholder = "Segmento",
  hideWhenSingle = false,
}: SegmentSelectProps) {
  const { segments } = useAvailableSegments(clientId);
  const labels = shortLabels ? LABELS_SHORT : LABELS_LONG;

  // Sanitize current value when segments list changes.
  useEffect(() => {
    if (segments.length === 0) return;
    if (value === "all") {
      if (segments.length === 1) onValueChange(segments[0]);
      return;
    }
    if (!segments.includes(value as SegmentCode)) {
      onValueChange(segments.length === 1 ? segments[0] : "all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments.join(",")]);

  if (segments.length === 0) return null;
  if (segments.length === 1 && hideWhenSingle) return null;

  const singleLocked = segments.length === 1;

  return (
    <Select
      value={singleLocked ? segments[0] : value}
      onValueChange={onValueChange}
      disabled={singleLocked}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && !singleLocked && (
          <SelectItem value="all">Todos Segmentos</SelectItem>
        )}
        {segments.map((s) => (
          <SelectItem key={s} value={s}>
            {labels[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}