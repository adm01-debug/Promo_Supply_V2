import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import type { ContractItem } from "@/types/contract";
import { formatCurrency } from "@/lib/utils";

interface ContractItemsEditorProps {
  items: ContractItem[];
  totalValue: number;
  onAddItem: () => void;
  onUpdateItem: (index: number, field: keyof ContractItem, value: string | number) => void;
  onRemoveItem: (index: number) => void;
}

export function ContractItemsEditor({ items, totalValue, onAddItem, onUpdateItem, onRemoveItem }: ContractItemsEditorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Itens do Contrato</Label>
        <Button type="button" variant="outline" size="sm" onClick={onAddItem}>
          <Plus className="w-4 h-4 mr-1" />
          Adicionar Item
        </Button>
      </div>

      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Item {index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveItem(index)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 sm:gap-3">
                <div className="md:col-span-2">
                  <Input
                    placeholder="Nome do item"
                    value={item.item_name}
                    onChange={(e) => onUpdateItem(index, 'item_name', e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    placeholder="Unidade"
                    value={item.unit}
                    onChange={(e) => onUpdateItem(index, 'unit', e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="Qtd"
                    value={item.quantity}
                    onChange={(e) => onUpdateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="Preço Unit."
                    value={item.unit_price}
                    onChange={(e) => onUpdateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Valor Total</p>
          <p className="text-2xl font-bold">
            {formatCurrency(totalValue)}
          </p>
        </div>
      </div>
    </div>
  );
}
