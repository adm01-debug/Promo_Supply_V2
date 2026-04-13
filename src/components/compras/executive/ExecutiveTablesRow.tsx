import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency } from './executiveDashboardData';

interface Supplier {
  name: string; spend: number; previousSpend: number;
  orders: number; savings: number; compliance: number;
  categories: string[];
}

interface Buyer {
  name: string; orders: number; previousOrders: number;
  savings: number; previousSavings: number; avgCycle: number;
  compliance: number; categories: string[]; suppliers: string[];
}

interface Props {
  filteredSuppliers: Supplier[];
  filteredBuyers: Buyer[];
  showComparison: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSupplierDrillDown: (s: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onBuyerDrillDown: (b: any) => void;
}

export const ExecutiveTablesRow = ({ filteredSuppliers, filteredBuyers, showComparison, onSupplierDrillDown, onBuyerDrillDown }: Props) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Suppliers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top 5 Fornecedores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredSuppliers.length > 0 ? filteredSuppliers.map((supplier, index) => {
              const spendChange = ((supplier.spend - supplier.previousSpend) / supplier.previousSpend) * 100;
              return (
                <div
                  key={supplier.name}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onSupplierDrillDown(supplier)}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{supplier.name}</p>
                    <p className="text-sm text-muted-foreground">{supplier.orders} pedidos</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(supplier.spend)}</p>
                    {showComparison ? (
                      <p className={`text-xs flex items-center justify-end gap-1 ${spendChange > 0 ? 'text-success' : 'text-destructive'}`}>
                        {spendChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(spendChange).toFixed(1)}% vs anterior
                      </p>
                    ) : (
                      <p className="text-sm text-success">+{formatCurrency(supplier.savings)}</p>
                    )}
                  </div>
                  <Badge variant={supplier.compliance >= 90 ? 'default' : supplier.compliance >= 85 ? 'secondary' : 'destructive'}>
                    {supplier.compliance}%
                  </Badge>
                </div>
              );
            }) : (
              <p className="text-center text-muted-foreground py-4">Nenhum fornecedor encontrado para os filtros selecionados</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Buyer Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Performance dos Compradores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredBuyers.length > 0 ? filteredBuyers.map((buyer, index) => {
              const savingsChange = ((buyer.savings - buyer.previousSavings) / buyer.previousSavings) * 100;
              const ordersChange = ((buyer.orders - buyer.previousOrders) / buyer.previousOrders) * 100;
              return (
                <div
                  key={buyer.name}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onBuyerDrillDown(buyer)}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-chart-2/20 text-chart-2 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{buyer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {buyer.orders} pedidos
                      {showComparison && (
                        <span className={ordersChange > 0 ? 'text-success' : 'text-destructive'}>
                          {' '}({ordersChange > 0 ? '+' : ''}{ordersChange.toFixed(0)}%)
                        </span>
                      )}
                      {' '}• {buyer.avgCycle} dias
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-success">{formatCurrency(buyer.savings)}</p>
                    {showComparison ? (
                      <p className={`text-xs flex items-center justify-end gap-1 ${savingsChange > 0 ? 'text-success' : 'text-destructive'}`}>
                        {savingsChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(savingsChange).toFixed(1)}%
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">economia</p>
                    )}
                  </div>
                  <Badge variant={buyer.compliance >= 95 ? 'default' : buyer.compliance >= 90 ? 'secondary' : 'outline'}>
                    {buyer.compliance}%
                  </Badge>
                </div>
              );
            }) : (
              <p className="text-center text-muted-foreground py-4">Nenhum comprador encontrado para os filtros selecionados</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
