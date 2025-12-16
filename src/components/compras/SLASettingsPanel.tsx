import { useState } from 'react';
import { Settings2, RotateCcw, Save, Bell, Mail, Clock, AlertTriangle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { useSLASettings } from '@/stores/slaSettingsStore';
import { toast } from 'sonner';

export const SLASettingsPanel = () => {
  const { settings, updateSettings, resetToDefaults } = useSLASettings();
  const [localSettings, setLocalSettings] = useState(settings);
  const [open, setOpen] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setLocalSettings(settings);
    }
    setOpen(isOpen);
  };

  const handleSave = () => {
    // Validation
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

    updateSettings(localSettings);
    toast.success('Configurações de SLA salvas');
    setOpen(false);
  };

  const handleReset = () => {
    resetToDefaults();
    setLocalSettings({
      warningThresholdDays: 3,
      criticalThresholdDays: 1,
      checkIntervalMinutes: 1,
      enableBrowserNotifications: true,
      enableEmailNotifications: true,
      emailRecipients: ['compras@promobrindes.com.br'],
    });
    toast.info('Configurações restauradas para o padrão');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings2 className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
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
          {/* Thresholds Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Limites de Alerta (dias antes do prazo)
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
};
