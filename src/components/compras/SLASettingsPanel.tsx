import { useState, forwardRef } from 'react';
import { Settings2, RotateCcw, Save, Bell, Mail, Clock, AlertTriangle, Building2, Percent, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { useSLASettings, SLASettings, SupplierAlertConfig } from '@/stores/slaSettingsStore';
import { toast } from "@/lib/feedbackToast";

// Known suppliers for configuration
const KNOWN_SUPPLIERS = [
  { id: 'xbz', name: 'XBZ Brindes' },
  { id: 'tech', name: 'Tech Brindes' },
  { id: 'stricker', name: 'Stricker / Spot Gifts' },
  { id: 'premium', name: 'Premium Gifts' },
  { id: 'asia', name: 'Asia Import' },
  { id: 'eco', name: 'Eco Brindes' },
];

const DEFAULT_SETTINGS: SLASettings = {
  warningThresholdDays: 3,
  criticalThresholdDays: 1,
  checkIntervalMinutes: 1,
  enableBrowserNotifications: true,
  enableEmailNotifications: true,
  emailRecipients: ['compras@promobrindes.com.br'],
  supplierSLAThreshold: 85,
  enableSupplierAlerts: true,
  supplierAlertConfigs: [],
};

// Supplier individual threshold configuration component
interface SupplierThresholdConfigProps {
  globalThreshold: number;
  supplierConfigs: SupplierAlertConfig[];
  onConfigChange: (configs: SupplierAlertConfig[]) => void;
}

const SupplierThresholdConfig = ({
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

export const SLASettingsPanel = forwardRef<HTMLDivElement>((_props, ref) => {
  const { settings, updateSettings, resetToDefaults } = useSLASettings();
  const [localSettings, setLocalSettings] = useState<SLASettings>(settings);
  const [open, setOpen] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setLocalSettings(settings);
    }
    setOpen(isOpen);
  };

  const handleSave = () => {
    if (localSettings.warningThresholdDays < localSettings.criticalThresholdDays) {
      toast.error('O threshold de atenção deve ser maior que o crítico');
      return;
    }
    if (localSettings.warningThresholdDays < 1 || localSettings.criticalThresholdDays < 1) {
      toast.error('Os thresholds devem ser pelo menos 1 dia');
      return;
    }
    if (localSettings.checkIntervalMinutes < 1) {
      toast.error('O intervalo de verificação deve ser pelo menos 1 minuto');
      return;
    }
    if (localSettings.supplierSLAThreshold < 50 || localSettings.supplierSLAThreshold > 100) {
      toast.error('O threshold de SLA do fornecedor deve estar entre 50% e 100%');
      return;
    }

    updateSettings(localSettings);
    toast.success('Configurações de SLA salvas');
    setOpen(false);
  };

  const handleReset = () => {
    resetToDefaults();
    setLocalSettings(DEFAULT_SETTINGS);
    toast.info('Configurações restauradas para o padrão');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings2 className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Configurações de SLA
          </DialogTitle>
          <DialogDescription>
            Configure os limites de alerta e canais de notificação para monitoramento de SLA.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Order Thresholds Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Limites de Alerta - Pedidos (dias antes do prazo)
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="warning" className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-warning" />
                  Atenção
                </Label>
                <Input
                  id="warning"
                  type="number"
                  min={1}
                  max={30}
                  value={localSettings.warningThresholdDays}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      warningThresholdDays: parseInt(e.target.value) || 1,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Alerta quando faltarem {localSettings.warningThresholdDays} dias
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="critical" className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-destructive" />
                  Crítico
                </Label>
                <Input
                  id="critical"
                  type="number"
                  min={1}
                  max={30}
                  value={localSettings.criticalThresholdDays}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      criticalThresholdDays: parseInt(e.target.value) || 1,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Alerta urgente quando faltar {localSettings.criticalThresholdDays} dia(s)
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Supplier SLA Threshold */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Alertas de Fornecedor
              </h4>
              <Switch
                checked={localSettings.enableSupplierAlerts}
                onCheckedChange={(checked) =>
                  setLocalSettings({
                    ...localSettings,
                    enableSupplierAlerts: checked,
                  })
                }
              />
            </div>

            {localSettings.enableSupplierAlerts && (
              <div className="space-y-4 pl-2 border-l-2 border-primary/20">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Percent className="h-3 w-3" />
                    Threshold Global de SLA
                  </Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[localSettings.supplierSLAThreshold]}
                      onValueChange={(value) =>
                        setLocalSettings({
                          ...localSettings,
                          supplierSLAThreshold: value[0],
                        })
                      }
                      min={50}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-lg font-bold w-14 text-right">
                      {localSettings.supplierSLAThreshold}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Threshold padrão para todos os fornecedores
                  </p>
                </div>

                <Separator className="my-3" />

                <SupplierThresholdConfig
                  globalThreshold={localSettings.supplierSLAThreshold}
                  supplierConfigs={localSettings.supplierAlertConfigs}
                  onConfigChange={(configs) =>
                    setLocalSettings({
                      ...localSettings,
                      supplierAlertConfigs: configs,
                    })
                  }
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Check Interval */}
          <div className="space-y-2">
            <Label htmlFor="interval" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Intervalo de Verificação (minutos)
            </Label>
            <Input
              id="interval"
              type="number"
              min={1}
              max={60}
              value={localSettings.checkIntervalMinutes}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  checkIntervalMinutes: parseInt(e.target.value) || 1,
                })
              }
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              O sistema verificará os prazos a cada {localSettings.checkIntervalMinutes} minuto(s)
            </p>
          </div>

          <Separator />

          {/* Notification Channels */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Canais de Notificação</h4>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="browser-notifications">Notificações do Navegador</Label>
              </div>
              <Switch
                id="browser-notifications"
                checked={localSettings.enableBrowserNotifications}
                onCheckedChange={(checked) =>
                  setLocalSettings({
                    ...localSettings,
                    enableBrowserNotifications: checked,
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="email-notifications">Notificações por Email (Mock)</Label>
              </div>
              <Switch
                id="email-notifications"
                checked={localSettings.enableEmailNotifications}
                onCheckedChange={(checked) =>
                  setLocalSettings({
                    ...localSettings,
                    enableEmailNotifications: checked,
                  })
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Restaurar Padrão
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
SLASettingsPanel.displayName = 'SLASettingsPanel';
