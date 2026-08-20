import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Holiday {
  id: string;
  holiday_date: string;
  name: string;
  is_automatic: boolean;
  created_at: string;
}

interface HolidaysSectionProps {
  isReadOnly: boolean;
}

export default function HolidaysSection({ isReadOnly }: HolidaysSectionProps) {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newName, setNewName] = useState("");
  const [importing, setImporting] = useState(false);

  const { data: holidays, isLoading } = useQuery({
    queryKey: ["sla_holidays", selectedYear],
    queryFn: async () => {
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;
      const { data, error } = await supabase
        .from("sla_holidays")
        .select("*")
        .gte("holiday_date", startDate)
        .lte("holiday_date", endDate)
        .order("holiday_date");
      if (error) throw error;
      return data as Holiday[];
    },
  });

  const importHolidays = async () => {
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-holidays", {
        body: { year: selectedYear },
      });
      if (error) throw error;

      const holidaysToInsert = data.holidays.map((h: any) => ({
        tenant_id: tenantId,
        holiday_date: h.date,
        name: h.name,
        is_automatic: true,
      }));

      const { error: upsertError } = await supabase
        .from("sla_holidays")
        .upsert(holidaysToInsert, { onConflict: "tenant_id,holiday_date" });
      if (upsertError) throw upsertError;

      queryClient.invalidateQueries({ queryKey: ["sla_holidays", selectedYear] });
      toast.success(`${holidaysToInsert.length} feriados de ${selectedYear} importados com sucesso`);
    } catch (err: any) {
      toast.error("Erro ao importar feriados: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const addHolidayMutation = useMutation({
    mutationFn: async ({ date, name }: { date: string; name: string }) => {
      const { error } = await supabase
        .from("sla_holidays")
        .upsert({ tenant_id: tenantId, holiday_date: date, name, is_automatic: false }, { onConflict: "tenant_id,holiday_date" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla_holidays"] });
      toast.success("Feriado adicionado");
      setAddDialogOpen(false);
      setNewDate("");
      setNewName("");
    },
    onError: (err: any) => toast.error("Erro: " + err.message),
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sla_holidays")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla_holidays"] });
      toast.success("Feriado removido");
    },
    onError: (err: any) => toast.error("Erro: " + err.message),
  });

  const handleAdd = () => {
    if (!newDate || !newName.trim()) {
      toast.error("Preencha data e nome do feriado");
      return;
    }
    addHolidayMutation.mutate({ date: newDate, name: newName.trim() });
  };

  const formatDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return format(date, "dd/MM/yyyy (EEEE)", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Feriados
        </CardTitle>
        <CardDescription>
          Feriados são excluídos do cálculo de SLA em horas úteis (P3/P4). 
          Importe feriados nacionais automaticamente ou adicione manualmente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Label>Ano:</Label>
            <div className="flex gap-1">
              {years.map((year) => (
                <Button
                  key={year}
                  variant={selectedYear === year ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedYear(year)}
                >
                  {year}
                </Button>
              ))}
            </div>
          </div>
          {!isReadOnly && (
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={importHolidays}
                disabled={importing}
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Importar Feriados {selectedYear}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setNewDate(`${selectedYear}-01-01`);
                  setAddDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : holidays && holidays.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Origem</TableHead>
                  {!isReadOnly && <TableHead className="w-16"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((holiday) => (
                  <TableRow key={holiday.id}>
                    <TableCell className="font-mono text-sm">
                      {formatDate(holiday.holiday_date)}
                    </TableCell>
                    <TableCell>{holiday.name}</TableCell>
                    <TableCell>
                      <Badge variant={holiday.is_automatic ? "secondary" : "outline"}>
                        {holiday.is_automatic ? "Automático" : "Manual"}
                      </Badge>
                    </TableCell>
                    {!isReadOnly && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteHolidayMutation.mutate(holiday.id)}
                          disabled={deleteHolidayMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum feriado configurado para {selectedYear}</p>
            {!isReadOnly && (
              <p className="text-sm mt-1">
                Clique em "Importar Feriados" para buscar feriados nacionais automaticamente.
              </p>
            )}
          </div>
        )}

        {isReadOnly && (
          <p className="text-sm text-purple-600">(Somente leitura)</p>
        )}
      </CardContent>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Feriado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="holiday-date">Data</Label>
              <Input
                id="holiday-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="holiday-name">Nome</Label>
              <Input
                id="holiday-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Feriado Municipal"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdd} disabled={addHolidayMutation.isPending}>
              {addHolidayMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
