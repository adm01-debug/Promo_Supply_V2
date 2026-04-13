import {
  Check, Loader2, CheckCircle2, X, Save, Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { PendingOrder } from "./recebimentoHelpers";

interface ReceivingFormViewProps {
  order: PendingOrder;
  receivedQty: Record<string, number>;
  itemNotes: Record<string, string>;
  generalNote: string;
  saving: boolean;
  isOnline: boolean;
  onBack: () => void;
  onSetReceivedQty: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onSetItemNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSetGeneralNote: (note: string) => void;
  onSave: () => void;
  totalOrdered: number;
  totalReceived: number;
  progress: number;
}

export function ReceivingFormView({
  order, receivedQty, itemNotes, generalNote, saving, isOnline,
  onBack, onSetReceivedQty, onSetItemNotes, onSetGeneralNote, onSave,
  totalOrdered, totalReceived, progress,
}: ReceivingFormViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <X className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <Badge variant="outline" className="font-mono">{order.numero}</Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" />
            {order.fornecedor_nome}
          </CardTitle>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {totalReceived} / {totalOrdered} itens conferidos
            </span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>
      </Card>

      {/* Items */}
      <div className="space-y-2">
        {order.itens.map(item => {
          const received = receivedQty[item.id] || 0;
          const itemComplete = received >= item.quantidade;

          return (
            <Card
              key={item.id}
              className={cn(
                "transition-colors",
                itemComplete ? "border-success/30 bg-success/5" :
                received > 0 ? "border-warning/30 bg-warning/5" : ""
              )}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      Pedido: {item.quantidade} {item.unidade || "un"} × R$ {item.valor_unitario.toFixed(2)}
                    </p>
                  </div>
                  {itemComplete && <CheckCircle2 className="w-5 h-5 text-success shrink-0" />}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Label className="text-xs whitespace-nowrap">Qty Recebida:</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => onSetReceivedQty(prev => ({
                          ...prev,
                          [item.id]: Math.max(0, (prev[item.id] || 0) - 1),
                        }))}
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        min={0}
                        value={received}
                        onChange={e => onSetReceivedQty(prev => ({
                          ...prev,
                          [item.id]: Math.max(0, parseInt(e.target.value) || 0),
                        }))}
                        className="w-16 text-center h-8"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => onSetReceivedQty(prev => ({
                          ...prev,
                          [item.id]: (prev[item.id] || 0) + 1,
                        }))}
                      >
                        +
                      </Button>
                    </div>
                    <span className="text-xs text-muted-foreground">/ {item.quantidade}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => onSetReceivedQty(prev => ({
                      ...prev,
                      [item.id]: item.quantidade,
                    }))}
                  >
                    <Check className="w-3 h-3 mr-1" /> Tudo
                  </Button>
                </div>

                <Input
                  placeholder="Observação sobre este item..."
                  value={itemNotes[item.id] || ""}
                  onChange={e => onSetItemNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                  className="h-8 text-xs"
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-sm">Observações Gerais</Label>
        <Textarea
          value={generalNote}
          onChange={e => onSetGeneralNote(e.target.value)}
          placeholder="Notas sobre a entrega, condição da embalagem, etc."
          rows={3}
        />
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          Cancelar
        </Button>
        <Button
          className="flex-1"
          onClick={onSave}
          disabled={saving || totalReceived === 0}
        >
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Save className="w-4 h-4 mr-2" />
          {isOnline ? "Registrar Recebimento" : "Salvar Offline"}
        </Button>
      </div>
    </div>
  );
}
