import { Building2, AlertTriangle, AlertCircle, RefreshCw, Trash2, TestTube } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSupplierSLAMonitor, SupplierAlert } from '@/hooks/useSupplierSLAMonitor';
import { useSLASettings } from '@/stores/slaSettingsStore';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const AlertItem = ({ alert }: { alert: SupplierAlert }) => {
  const Icon = alert.type === 'critical' ? AlertCircle : AlertTriangle;
  const colorClass = alert.type === 'critical' ? 'text-destructive' : 'text-warning';

  return (
    <div className={cn(
      "p-3 border-b border-border last:border-b-0",
      alert.type === 'critical' ? 'bg-destructive/5' : 'bg-warning/5'
    )}>
      <div className="flex items-start gap-3">
        <Icon className={cn("h-5 w-5 mt-0.5", colorClass)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{alert.supplierName}</span>
            <Badge 
              variant={alert.type === 'critical' ? 'destructive' : 'outline'}
              className="text-xs"
            >
              {alert.slaCompliance}% SLA
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {alert.message}
          </p>
          <span className="text-xs text-muted-foreground mt-1 block">
            {formatDistanceToNow(alert.createdAt, { addSuffix: true, locale: ptBR })}
          </span>
        </div>
      </div>
    </div>
  );
};

export const SupplierAlertsPanel = () => {
  const { settings } = useSLASettings();
  const { 
    supplierAlerts, 
    supplierData,
    checkSupplierSLA, 
    triggerTestSupplierAlert,
    clearSupplierAlerts 
  } = useSupplierSLAMonitor();

  if (!settings.enableSupplierAlerts) {
    return null;
  }

  const underperformingSuppliers = supplierData.filter(
    (s) => s.slaCompliance < settings.supplierSLAThreshold
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Alertas de Fornecedores
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Threshold: {settings.supplierSLAThreshold}%
            </Badge>
            {underperformingSuppliers.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {underperformingSuppliers.length} abaixo
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status Summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{supplierData.length}</p>
            <p className="text-xs text-muted-foreground">Monitorados</p>
          </div>
          <div className="p-2 rounded-lg bg-success/10">
            <p className="text-2xl font-bold text-success">
              {supplierData.filter((s) => s.slaCompliance >= settings.supplierSLAThreshold).length}
            </p>
            <p className="text-xs text-muted-foreground">OK</p>
          </div>
          <div className="p-2 rounded-lg bg-destructive/10">
            <p className="text-2xl font-bold text-destructive">
              {underperformingSuppliers.length}
            </p>
            <p className="text-xs text-muted-foreground">Abaixo</p>
          </div>
        </div>

        {/* Alerts List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Alertas Recentes</span>
            <span className="text-xs text-muted-foreground">
              {supplierAlerts.length} alerta(s)
            </span>
          </div>
          
          <ScrollArea className="h-[200px] border border-border rounded-lg">
            {supplierAlerts.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum alerta de fornecedor</p>
                <p className="text-xs mt-1">
                  Alertas aparecem quando SLA cai abaixo de {settings.supplierSLAThreshold}%
                </p>
              </div>
            ) : (
              supplierAlerts.slice(0, 10).map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))
            )}
          </ScrollArea>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={checkSupplierSLA}
            className="flex-1 gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Verificar Agora
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={triggerTestSupplierAlert}
            className="gap-1"
          >
            <TestTube className="h-3 w-3" />
            Testar
          </Button>
          {supplierAlerts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSupplierAlerts}
              className="gap-1"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
