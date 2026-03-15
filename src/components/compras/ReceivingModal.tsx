import { useState, useCallback } from "react";
import { Package, Check, AlertCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PedidoItem {
  id: string;
  descricao: string;
  quantidade: number;
  quantidade_recebida: number | null;
  unidade: string | null;
  valor_unitario: number;
  valor_total: number;
}

interface ReceivingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: string;
  pedidoNumero: string;
  items: PedidoItem[];
  onSuccess?: () => void;
}

export function ReceivingModal({
  open,
  onOpenChange,
  pedidoId,
  pedidoNumero,
  items,
  onSuccess,
}: ReceivingModalProps) {
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    items.forEach((item) => {
      initial[item.id] = item.quantidade_recebida || 0;
    });
    return initial;
  });
  const [saving, setSaving] = useState(false);

  const handleQuantityChange = useCallback((itemId: string, value: number) => {
    setReceivedQuantities((prev) => ({
      ...prev,
      [itemId]: Math.max(0, value),
    }));
  }, []);

  const totalOrdered = items.reduce((sum, i) => sum + i.quantidade, 0);
  const totalReceived = Object.values(receivedQuantities).reduce((sum, q) => sum + q, 0);
  const receivingProgress = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;
  const isComplete = items.every((item) => (receivedQuantities[item.id] || 0) >= item.quantidade);
  const isPartial = totalReceived > 0 && !isComplete;

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Update each item's quantidade_recebida
      for (const item of items) {
        const qty = receivedQuantities[item.id] || 0;
        await supabase
          .from("pedido_itens")
          .update({ quantidade_recebida: qty })
          .eq("id", item.id);
      }

      // Update pedido status based on receiving
      const newStatus = isComplete ? "entregue" : isPartial ? "parcial" : undefined;
      if (newStatus) {
        await supabase
          .from("pedidos")
          .update({
            status: newStatus,
            ...(isComplete ? { data_entrega: new Date().toISOString().split("T")[0] } : {}),
          })
          .eq("id", pedidoId);
      }

      toast.success(
        isComplete
          ? "Recebimento completo registrado!"
          : "Recebimento parcial registrado!"
      );
      onSuccess?.();
      onOpenChange(false);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao registrar recebimento: " + msg);
    } finally {
      setSaving(false);
    }
  }, [items, receivedQuantities, isComplete, isPartial, pedidoId, onSuccess, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Conferência de Recebimento — {pedidoNumero}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso do Recebimento</span>
              <span className="font-medium text-foreground">
                {totalReceived} / {totalOrdered} ({Math.round(receivingProgress)}%)
              </span>
            </div>
            <Progress value={receivingProgress} className="h-2" />
            <div className="flex gap-2">
              {isComplete && (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  <Check className="w-3 h-3 mr-1" />
                  Completo
                </Badge>
              )}
              {isPartial && (
                <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Parcial
                </Badge>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            {items.map((item) => {
              const received = receivedQuantities[item.id] || 0;
              const itemComplete = received >= item.quantidade;

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border ${
                    itemComplete
                      ? "border-green-500/30 bg-green-500/5"
                      : received > 0
                      ? "border-orange-500/30 bg-orange-500/5"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.descricao}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Pedido: {item.quantidade} {item.unidade || "un"} × R${" "}
                        {item.valor_unitario.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">
                        Recebido:
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={item.quantidade * 2}
                        value={received}
                        onChange={(e) =>
                          handleQuantityChange(item.id, parseInt(e.target.value) || 0)
                        }
                        className="w-20 text-center"
                      />
                      <span className="text-xs text-muted-foreground">
                        / {item.quantidade}
                      </span>
                      {itemComplete && <Check className="w-4 h-4 text-green-500" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || totalReceived === 0}
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isComplete ? "Confirmar Recebimento Total" : "Registrar Recebimento Parcial"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
