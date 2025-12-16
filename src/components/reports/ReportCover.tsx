import { Server } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReportCoverProps {
  clientName?: string;
  month?: number;
  year?: number;
  title?: string;
  subtitle?: string;
  periodLabel?: string;
}

const ReportCover = ({ 
  clientName, 
  month, 
  year, 
  title = "Relatório Mensal de Atendimento",
  subtitle,
  periodLabel 
}: ReportCoverProps) => {
  const competencyText = month && year 
    ? format(new Date(year, month - 1, 1), "MMMM 'de' yyyy", { locale: ptBR })
    : null;
  const generationDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="print-cover flex flex-col items-center justify-center min-h-[500px] print:min-h-[267mm] bg-gradient-to-br from-primary/10 via-background to-primary/5 print:bg-white rounded-lg border print:border-0 p-12 text-center">
      {/* Logo */}
      <div className="flex items-center justify-center w-28 h-28 bg-primary rounded-2xl mb-10 shadow-lg print:shadow-none">
        <Server className="w-14 h-14 text-primary-foreground" />
      </div>

      {/* Company Name */}
      <h1 className="text-5xl font-bold text-primary mb-2 tracking-tight">
        OTIMIZZO
      </h1>
      <p className="text-xl text-muted-foreground mb-16">Service Hub</p>

      {/* Report Title */}
      <div className="space-y-3 mb-16">
        <h2 className="text-3xl font-semibold text-foreground">
          {title}
        </h2>
        {subtitle && (
          <p className="text-lg text-muted-foreground">{subtitle}</p>
        )}
        <div className="w-32 h-1.5 bg-primary mx-auto rounded-full mt-4" />
      </div>

      {/* Client/Period Info */}
      <div className="space-y-6 mb-16">
        {clientName && (
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-widest mb-1">Cliente</p>
            <p className="text-2xl font-semibold text-foreground">{clientName}</p>
          </div>
        )}
        {competencyText && (
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-widest mb-1">Competência</p>
            <p className="text-2xl font-semibold text-foreground capitalize">{competencyText}</p>
          </div>
        )}
        {periodLabel && (
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-widest mb-1">Período</p>
            <p className="text-2xl font-semibold text-foreground">{periodLabel}</p>
          </div>
        )}
      </div>

      {/* Generation Date */}
      <p className="text-sm text-muted-foreground mt-auto">
        Gerado em {generationDate}
      </p>
    </div>
  );
};

export default ReportCover;
