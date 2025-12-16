import { Server } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReportCoverProps {
  clientName: string;
  month: number;
  year: number;
}

const ReportCover = ({ clientName, month, year }: ReportCoverProps) => {
  const competencyDate = new Date(year, month - 1, 1);
  const competencyText = format(competencyDate, "MMMM 'de' yyyy", { locale: ptBR });
  const generationDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="print:page-break-after flex flex-col items-center justify-center min-h-[500px] bg-gradient-to-br from-primary/10 via-background to-primary/5 rounded-lg border p-12 text-center">
      {/* Logo */}
      <div className="flex items-center justify-center w-24 h-24 bg-primary rounded-2xl mb-8 shadow-lg">
        <Server className="w-12 h-12 text-primary-foreground" />
      </div>

      {/* Company Name */}
      <h1 className="text-4xl font-bold text-primary mb-2 tracking-tight">
        OTIMIZZO
      </h1>
      <p className="text-lg text-muted-foreground mb-12">Service Hub</p>

      {/* Report Title */}
      <div className="space-y-2 mb-12">
        <h2 className="text-2xl font-semibold text-foreground">
          Relatório Mensal de Atendimento
        </h2>
        <div className="w-24 h-1 bg-primary mx-auto rounded-full" />
      </div>

      {/* Client Info */}
      <div className="space-y-4 mb-12">
        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-wider">Cliente</p>
          <p className="text-xl font-semibold text-foreground">{clientName}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-wider">Competência</p>
          <p className="text-xl font-semibold text-foreground capitalize">{competencyText}</p>
        </div>
      </div>

      {/* Generation Date */}
      <p className="text-sm text-muted-foreground">
        Gerado em {generationDate}
      </p>
    </div>
  );
};

export default ReportCover;
