import { useRef, useState } from "react";
import { useTicketRFCSteps } from "@/hooks/useTicketDetail";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Send, Loader2, CheckCircle2, Clock, Play } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

function formatDuration(startedAt: string | null, concludedAt: string | null): string {
  if (!startedAt || !concludedAt) return "—";
  const diffMs = new Date(concludedAt).getTime() - new Date(startedAt).getTime();
  if (diffMs < 0) return "—";
  const totalMinutes = Math.round(diffMs / 60000);
  if (totalMinutes < 60) return `${totalMinutes}min`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

function getDurationMinutes(startedAt: string | null, concludedAt: string | null): number {
  if (!startedAt || !concludedAt) return 0;
  const diffMs = new Date(concludedAt).getTime() - new Date(startedAt).getTime();
  return diffMs > 0 ? Math.round(diffMs / 60000) : 0;
}

function formatTotalDuration(totalMinutes: number): string {
  if (totalMinutes === 0) return "—";
  if (totalMinutes < 60) return `${totalMinutes}min`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

interface RFCReportPreviewProps {
  ticket: any;
}

export default function RFCReportPreview({ ticket }: RFCReportPreviewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const { data: steps = [], isLoading } = useTicketRFCSteps(ticket.id);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const { profile } = useAuth();

  const completedCount = steps.filter(s => s.status_concluido).length;
  const progressPercent = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;
  const totalMinutes = steps.reduce((acc, s) => acc + getDurationMinutes(s.started_at, s.concluded_at), 0);

  const generatePDF = async () => {
    if (!reportRef.current) return null;
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 10;

    pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
    heightLeft -= (pdfHeight - 20);

    while (heightLeft > 0) {
      position = -(pdfHeight - 20) + 10;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 10, position + (pdfHeight - 20) * (Math.ceil(imgHeight / (pdfHeight - 20)) - Math.ceil(heightLeft / (pdfHeight - 20))), imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20);
    }

    return pdf;
  };

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const pdf = await generatePDF();
      if (pdf) {
        pdf.save(`RFC-${ticket.ticket_number}-Relatorio.pdf`);
        toast.success("PDF baixado com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar o PDF");
    } finally {
      setGenerating(false);
    }
  };

  const handleSendToClient = async () => {
    setSending(true);
    try {
      const pdf = await generatePDF();
      if (!pdf) throw new Error("Falha ao gerar PDF");

      const pdfBlob = pdf.output("blob");
      const fileName = `rfc-report-${ticket.ticket_number}.pdf`;
      const filePath = `${ticket.client_id}/${ticket.id}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("tickets")
        .upload(filePath, pdfBlob, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("tickets")
        .getPublicUrl(filePath);

      // Get signed URL (bucket is private)
      const { data: signedData, error: signedError } = await supabase.storage
        .from("tickets")
        .createSignedUrl(filePath, 60 * 60 * 24 * 30); // 30 days

      if (signedError) throw signedError;

      // Send email via edge function
      const { error: sendError } = await supabase.functions.invoke("send-rfc-report", {
        body: {
          ticketId: ticket.id,
          ticketNumber: ticket.ticket_number,
          ticketTitle: ticket.title,
          contactEmail: ticket.contact_email,
          contactName: ticket.contact_name,
          clientName: ticket.clients?.name || "Cliente",
          reportUrl: signedData.signedUrl,
          analystName: profile?.full_name || "Analista",
        },
      });

      if (sendError) throw sendError;

      // Add internal comment
      await supabase.from("ticket_comments").insert({
        ticket_id: ticket.id,
        author_id: profile?.id,
        content: `📄 Relatório RFC enviado por email para ${ticket.contact_name} (${ticket.contact_email})`,
        is_internal: true,
      });

      toast.success("Relatório enviado com sucesso para o cliente!");
    } catch (error: any) {
      console.error("Erro ao enviar relatório:", error);
      toast.error(`Erro ao enviar relatório: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={handleDownload} disabled={generating || sending}>
          {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
          Baixar PDF
        </Button>
        <Button onClick={handleSendToClient} disabled={generating || sending}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
          Enviar Relatório ao Cliente
        </Button>
      </div>

      {/* Report preview */}
      <Card className="overflow-hidden">
        <div ref={reportRef} className="bg-white text-black p-8 space-y-6" style={{ minWidth: 700 }}>
          {/* Header */}
          <div className="border-b-2 border-green-600 pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-green-700">OTIMIZZO</h1>
                <p className="text-sm text-gray-500">Relatório de Execução RFC</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-800">RFC #{ticket.ticket_number}</p>
                <p className="text-sm text-gray-500">
                  {format(new Date(ticket.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
          </div>

          {/* Ticket info */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Cliente</p>
              <p className="text-sm font-medium">{ticket.clients?.name || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Contato</p>
              <p className="text-sm font-medium">{ticket.contact_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Segmento</p>
              <p className="text-sm font-medium">{ticket.segment}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Analista</p>
              <p className="text-sm font-medium">{ticket.profiles?.full_name || "—"}</p>
            </div>
          </div>

          {/* Planning */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-2 border-b border-gray-200 pb-1">
              📋 Planejamento
            </h2>
            <h3 className="font-semibold text-gray-700">{ticket.title}</h3>
            {ticket.description && (
              <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{ticket.description}</p>
            )}
          </div>

          {/* Progress */}
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium text-green-800">Progresso da Execução</span>
              <span className="text-green-700 font-semibold">
                {completedCount}/{steps.length} passos ({progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-green-200 rounded-full h-3">
              <div
                className="bg-green-600 h-3 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Steps table */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-2 border-b border-gray-200 pb-1">
              ⚙️ Passos de Execução
            </h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-1.5 text-left w-12">#</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left">Descrição</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-center w-24">Status</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-center w-32">Início</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-center w-32">Fim</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-center w-20">Duração</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left w-28">Responsável</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((step) => {
                  const isDone = step.status_concluido;
                  const isInProgress = !!step.started_at && !isDone;
                  return (
                    <tr key={step.id}>
                      <td className="border border-gray-300 px-2 py-1.5 font-mono text-xs">
                        {String(step.ordem + 1).padStart(2, "0")}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5">{step.descricao}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                          isDone ? "bg-green-100 text-green-800" :
                          isInProgress ? "bg-amber-100 text-amber-800" :
                          "bg-blue-100 text-blue-800"
                        }`}>
                          {isDone ? "Concluído" : isInProgress ? "Em andamento" : "Pendente"}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center text-xs text-gray-600">
                        {step.started_at
                          ? format(new Date(step.started_at), "dd/MM/yy HH:mm", { locale: ptBR })
                          : "—"}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center text-xs text-gray-600">
                        {step.concluded_at
                          ? format(new Date(step.concluded_at), "dd/MM/yy HH:mm", { locale: ptBR })
                          : "—"}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center font-medium">
                        {formatDuration(step.started_at, step.concluded_at)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-600">
                        {step.concluded_by_name || step.started_by_name || "—"}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-100 font-semibold">
                  <td colSpan={5} className="border border-gray-300 px-2 py-1.5 text-right">
                    Tempo Total de Execução
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-center">
                    {formatTotalDuration(totalMinutes)}
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5" />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Detalhamento e Observações */}
          {steps.filter(s => s.procedimento || s.observacao).length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-3 border-b border-gray-200 pb-1">
                📝 Detalhamento e Observações
              </h2>
              <div className="space-y-3">
                {steps
                  .filter(s => s.procedimento || s.observacao)
                  .map((step) => (
                    <div
                      key={step.id}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                      style={{ pageBreakInside: 'avoid' }}
                    >
                      <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
                        <p className="font-semibold text-sm text-gray-800">
                          Passo {String(step.ordem + 1).padStart(2, "0")} — {step.descricao}
                        </p>
                      </div>
                      <div className="p-3 space-y-2">
                        {step.procedimento && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Procedimento</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{step.procedimento}</p>
                          </div>
                        )}
                        {step.observacao && (
                          <div className="bg-amber-50 border border-amber-200 rounded p-2">
                            <p className="text-xs font-semibold text-amber-700 uppercase mb-1">Observações do Analista</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{step.observacao}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Conclusion */}
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
            <p className="text-green-800 font-medium">
              ✅ RFC executada com sucesso
            </p>
            {ticket.resolved_at && (
              <p className="text-sm text-green-600 mt-1">
                Concluída em {format(new Date(ticket.resolved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-3 text-center">
            <p className="text-xs text-gray-400">
              Relatório gerado automaticamente pelo sistema Otimizzo em{" "}
              {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
