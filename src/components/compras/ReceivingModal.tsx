import { useState, useCallback } from "react";
import { Package, Check, AlertCircle, Loader2, RefreshCw } from "lucide-react";
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

  const [generateComplementary, setGenerateComplementary] = useState(true);

  const pendingItems = items.filter((item) => {
    const received = receivedQuantities[item.id] || 0;
    return received < item.quantidade;
  });
  const hasPending = isPartial && pendingItems.length > 0;

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

      // Auto-generate complementary order for remaining balance
      if (isPartial && generateComplementary && pendingItems.length > 0) {
        // Fetch original pedido data
        const { data: originalPedido } = await supabase
          .from("pedidos")
          .select("fornecedor_id, solicitacao_id, cotacao_id, condicao_pagamento, endereco_entrega, observacoes")
          .eq("id", pedidoId)
          .single();

        if (originalPedido) {
          const complementaryItems = pendingItems.map((item) => {
            const received = receivedQuantities[item.id] || 0;
            const remaining = item.quantidade - received;
            return {
              descricao: item.descricao,
              quantidade: remaining,
              unidade: item.unidade || "un",
              valor_unitario: item.valor_unitario,
              valor_total: remaining * item.valor_unitario,
            };
          });

          const complementaryTotal = complementaryItems.reduce((s, i) => s + i.valor_total, 0);

          // Generate number
          const { data: numData } = await supabase.rpc("generate_sequential_number", {
            prefix: "PED",
            table_name: "pedidos",
          });
          const numero = numData || `PED-${Date.now()}`;

          const { data: newPedido, error: pedError } = await supabase
            .from("pedidos")
            .insert({
              numero,
              fornecedor_id: originalPedido.fornecedor_id,
              solicitacao_id: originalPedido.solicitacao_id,
              cotacao_id: originalPedido.cotacao_id,
              valor_total: complementaryTotal,
              condicao_pagamento: originalPedido.condicao_pagamento,
              endereco_entrega: originalPedido.endereco_entrega,
              observacoes: `Pedido complementar ref. ${pedidoNumero} — saldo de recebimento parcial`,
              data_previsao: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            })
            .select("id")
            .single();

          if (!pedError && newPedido) {
            await supabase.from("pedido_itens").insert(
              complementaryItems.map((item) => ({
                pedido_id: newPedido.id,
                ...item,
              }))
            );
            toast.info(`Pedido complementar ${numero} criado com ${complementaryItems.length} item(ns) pendente(s)`);
          }
        }
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
  }, [items, receivedQuantities, isComplete, isPartial, pedidoId, pedidoNumero, generateComplementary, pendingItems, onSuccess, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="dialog-desc" className="max-w-2xl max-h-[80vh] overflow-y-auto">
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
                <Badge className="bg-success/10 text-success border-green-500/20">
                  <Check className="w-3 h-3 mr-1" />
                  Completo
                </Badge>
              )}
              {isPartial && (
                <Badge className="bg-warning/10 text-warning border-orange-500/20">
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
                      ? "border-green-500/30 bg-success/5"
                      : received > 0
                      ? "border-orange-500/30 bg-warning/5"
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
                      {itemComplete && <Check className="w-4 h-4 text-success" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Complementary order option */}
          {hasPending && (
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateComplementary}
                  onChange={(e) => setGenerateComplementary(e.target.checked)}
                  className="mt-0.5 rounded border-border"
                />
                <div>
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-primary" />
                    Gerar pedido complementar para saldo pendente
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {pendingItems.length} item(ns) com saldo:{" "}
                    {pendingItems.map((item) => {
                      const remaining = item.quantidade - (receivedQuantities[item.id] || 0);
                      return `${item.descricao} (${remaining} ${item.unidade || "un"})`;
                    }).join(", ")}
                  </p>
                </div>
              </label>
            </div>
          )}
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
