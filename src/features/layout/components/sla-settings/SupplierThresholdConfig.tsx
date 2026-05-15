import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { SupplierAlertConfig } from '@/stores/slaSettingsStore';

export const KNOWN_SUPPLIERS = [
  { id: 'xbz', name: 'XBZ Brindes' },
  { id: 'tech', name: 'Tech Brindes' },
  { id: 'stricker', name: 'Stricker / Spot Gifts' },
  { id: 'premium', name: 'Premium Gifts' },
  { id: 'asia', name: 'Asia Import' },
  { id: 'eco', name: 'Eco Brindes' },
];

interface SupplierThresholdConfigProps {
  globalThreshold: number;
  supplierConfigs: SupplierAlertConfig[];
  onConfigChange: (configs: SupplierAlertConfig[]) => void;
}

export const SupplierThresholdConfig = ({
  globalThreshold,
  supplierConfigs,
  onConfigChange,
}: SupplierThresholdConfigProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const getSupplierConfig = (supplierId: string): SupplierAlertConfig | undefined => {
    return supplierConfigs.find((c) => c.supplierId === supplierId);
  };

  const updateSupplierConfig = (
    supplierId: string,
    supplierName: string,
    updates: Partial<SupplierAlertConfig>
  ) => {
    const existing = supplierConfigs.find((c) => c.supplierId === supplierId);
    if (existing) {
      onConfigChange(
        supplierConfigs.map((c) =>
          c.supplierId === supplierId ? { ...c, ...updates } : c
        )
      );
    } else {
      onConfigChange([
        ...supplierConfigs,
        {
          supplierId,
          supplierName,
          enabled: updates.enabled ?? true,
          customThreshold: updates.customThreshold,
        },
      ]);
    }
  };

  const hasCustomConfig = (supplierId: string): boolean => {
    const config = getSupplierConfig(supplierId);
    return config?.customThreshold !== undefined || config?.enabled === false;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between gap-2 h-auto py-2">
          <span className="text-sm font-medium">Configurações por Fornecedor</span>
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-3">
        <p className="text-xs text-muted-foreground mb-3">
          Configure thresholds individuais ou desative alertas para fornecedores específicos
        </p>
        {KNOWN_SUPPLIERS.map((supplier) => {
          const config = getSupplierConfig(supplier.id);
          const isEnabled = config?.enabled !== false;
          const customThreshold = config?.customThreshold;

          return (
            <div
              key={supplier.id}
              className={`p-3 rounded-lg border ${
                hasCustomConfig(supplier.id)
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border bg-muted/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{supplier.name}</span>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) =>
                    updateSupplierConfig(supplier.id, supplier.name, { enabled: checked })
                  }
                />
              </div>
              {isEnabled && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`custom-${supplier.id}`}
                      checked={customThreshold !== undefined}
                      onChange={(e) =>
                        updateSupplierConfig(supplier.id, supplier.name, {
                          customThreshold: e.target.checked ? globalThreshold : undefined,
                        })
                      }
                      className="rounded border-border"
                    />
                    <Label htmlFor={`custom-${supplier.id}`} className="text-xs">
                      Threshold personalizado
                    </Label>
                  </div>
                  {customThreshold !== undefined && (
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[customThreshold]}
                        onValueChange={(value) =>
                          updateSupplierConfig(supplier.id, supplier.name, {
                            customThreshold: value[0],
                          })
                        }
                        min={50}
                        max={100}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-sm font-bold w-12 text-right">
                        {customThreshold}%
                      </span>
                    </div>
                  )}
                  {customThreshold === undefined && (
                    <p className="text-xs text-muted-foreground">
                      Usando threshold global: {globalThreshold}%
                    </p>
                  )}
                </div>
              )}
              {!isEnabled && (
                <p className="text-xs text-muted-foreground">Alertas desativados</p>
              )}
            </div>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
};
