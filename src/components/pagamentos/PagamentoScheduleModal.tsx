import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import type { Pagamento } from "@/hooks/usePagamentos";

interface Props {
  pagamentos: Pagamento[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (ids: string[], date: string) => Promise<boolean>;
}

export const PagamentoScheduleModal = ({ pagamentos, open, onOpenChange, onSchedule }: Props) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [scheduling, setScheduling] = useState(false);

  const totalValor = pagamentos.reduce((s, p) => s + (p.valor - (p.valor_pago || 0)), 0);
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleSchedule = async () => {
    if (!selectedDate) {
      toast({ title: "Selecione uma data", variant: "destructive" });
      return;
    }
    setScheduling(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const success = await onSchedule(pagamentos.map(p => p.id), dateStr);
      if (success) {
        toast({ title: "Agendamento realizado!", description: `${pagamentos.length} pagamento(s) agendado(s) para ${format(selectedDate, 'dd/MM/yyyy')}` });
        onOpenChange(false);
      }
    } finally {
      setScheduling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Agendar Pagamentos
          </DialogTitle>
          <DialogDescription>
            Agende {pagamentos.length} pagamento(s) para uma data futura
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pagamentos selecionados</span>
              <Badge variant="secondary">{pagamentos.length}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor total</span>
              <span className="font-bold text-primary">{fmt(totalValor)}</span>
            </div>
          </div>

          {/* Calendar */}
          <div>
            <Label className="mb-2 block">Data de pagamento</Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < new Date()}
              locale={ptBR}
              className="rounded-md border mx-auto"
            />
          </div>

          {selectedDate && (
            <p className="text-sm text-center text-muted-foreground">
              Agendado para: <strong>{format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</strong>
            </p>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleSchedule} disabled={!selectedDate || scheduling}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {scheduling ? "Agendando..." : "Confirmar Agendamento"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
