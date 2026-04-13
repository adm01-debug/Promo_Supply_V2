import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { formatCurrency } from './executiveDashboardData';

interface PendingItem {
  id: string; type: string; item: string;
  value: number; days: number; priority: string;
  category: string; supplier: string;
}

interface Props {
  items: PendingItem[];
}

export const ExecutivePendingActions = ({ items }: Props) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Ações Pendentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.length > 0 ? items.slice(0, 6).map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-lg border ${
                item.priority === 'critical' ? 'border-destructive bg-destructive/5' :
                item.priority === 'high' ? 'border-amber-500 bg-warning/5' :
                'border-border'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <Badge variant={
                  item.priority === 'critical' ? 'destructive' :
                  item.priority === 'high' ? 'default' : 'secondary'
                }>
                  {item.type}
                </Badge>
                <span className="text-xs text-muted-foreground">{item.days}d</span>
              </div>
              <p className="font-medium text-sm mb-1">{item.item}</p>
              <p className="text-lg font-bold">{formatCurrency(item.value)}</p>
            </div>
          )) : (
            <p className="text-center text-muted-foreground py-4 col-span-3">Nenhuma ação pendente para os filtros selecionados</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
