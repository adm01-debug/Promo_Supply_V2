import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { type DrillDownData, formatCurrency, pendingItems } from './executiveDashboardData';

interface Props {
  drillDown: DrillDownData | null;
  onClose: () => void;
}

export const ExecutiveDrillDownModal = ({ drillDown, onClose }: Props) => {
  return (
    <Dialog open={!!drillDown} onOpenChange={() => onClose()}>
      <DialogContent aria-describedby="dialog-desc" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {drillDown?.type === 'category' && `Detalhes: ${drillDown.data?.name}`}
            {drillDown?.type === 'supplier' && `Fornecedor: ${drillDown.data?.name}`}
            {drillDown?.type === 'buyer' && `Comprador: ${drillDown.data?.name}`}
            {drillDown?.type === 'pending' && 'Ações Pendentes'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {drillDown?.type === 'category' && drillDown.data && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Spend Total</p>
                  <p className="text-xl font-bold">{formatCurrency(drillDown.data.value)}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">% do Total</p>
                  <p className="text-xl font-bold">{drillDown.data.percentage}%</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Qtd Pedidos</p>
                  <p className="text-xl font-bold">{drillDown.data.orders}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Clique no gráfico para ver mais detalhes sobre fornecedores e histórico de preços desta categoria.
              </p>
            </>
          )}

          {drillDown?.type === 'supplier' && drillDown.data && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Spend Total</p>
                <p className="text-xl font-bold">{formatCurrency(drillDown.data.spend)}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Economia Gerada</p>
                <p className="text-xl font-bold text-success">{formatCurrency(drillDown.data.savings)}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Pedidos</p>
                <p className="text-xl font-bold">{drillDown.data.orders}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Compliance</p>
                <p className="text-xl font-bold">{drillDown.data.compliance}%</p>
              </div>
            </div>
          )}

          {drillDown?.type === 'buyer' && drillDown.data && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Pedidos Realizados</p>
                <p className="text-xl font-bold">{drillDown.data.orders}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Economia Gerada</p>
                <p className="text-xl font-bold text-success">{formatCurrency(drillDown.data.savings)}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Tempo Médio</p>
                <p className="text-xl font-bold">{drillDown.data.avgCycle} dias</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Compliance</p>
                <p className="text-xl font-bold">{drillDown.data.compliance}%</p>
              </div>
            </div>
          )}

          {drillDown?.type === 'pending' && (
            <div className="space-y-2 max-h-96 overflow-auto">
              {pendingItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border ${
                    item.priority === 'critical' ? 'border-destructive bg-destructive/5' :
                    item.priority === 'high' ? 'border-amber-500 bg-warning/5' :
                    'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={item.priority === 'critical' ? 'destructive' : item.priority === 'high' ? 'default' : 'secondary'}>
                          {item.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{item.id}</span>
                      </div>
                      <p className="font-medium">{item.item}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(item.value)}</p>
                      <p className="text-xs text-muted-foreground">{item.days} dias</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
