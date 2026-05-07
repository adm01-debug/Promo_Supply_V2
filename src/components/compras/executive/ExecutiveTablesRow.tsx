import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
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
          <div className="space-y-1">
            <AnimatePresence mode="popLayout">
              {filteredSuppliers.length > 0 ? filteredSuppliers.map((supplier, index) => {
                const spendChange = ((supplier.spend - supplier.previousSpend) / supplier.previousSpend) * 100;
                return (
                  <motion.div
                    key={supplier.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/60 cursor-pointer transition-all duration-200 group border border-transparent hover:border-border/50 hover:shadow-sm"
                    onClick={() => onSupplierDrillDown(supplier)}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold text-sm transition-transform group-hover:scale-110">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate group-hover:text-primary transition-colors">{supplier.name}</p>
                      <p className="text-xs text-muted-foreground">{supplier.orders} pedidos • {supplier.categories[0]}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(supplier.spend)}</p>
                      {showComparison ? (
                        <p className={`text-[10px] font-medium flex items-center justify-end gap-1 ${spendChange > 0 ? 'text-success' : 'text-destructive'}`}>
                          {spendChange > 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                          {Math.abs(spendChange).toFixed(1)}%
                        </p>
                      ) : (
                        <p className="text-[10px] text-success font-medium">+{formatCurrency(supplier.savings)}</p>
                      )}
                    </div>
                    <div className="w-12 text-right">
                      <Badge 
                        variant={supplier.compliance >= 90 ? 'default' : supplier.compliance >= 85 ? 'secondary' : 'destructive'}
                        className="h-5 px-1.5 text-[10px] font-bold"
                      >
                        {supplier.compliance}%
                      </Badge>
                    </div>
                  </motion.div>
                );
              }) : (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-muted-foreground py-8 text-sm italic"
                >
                  Nenhum fornecedor encontrado para os filtros selecionados
                </motion.p>
              )}
            </AnimatePresence>
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
          <div className="space-y-1">
            <AnimatePresence mode="popLayout">
              {filteredBuyers.length > 0 ? filteredBuyers.map((buyer, index) => {
                const savingsChange = ((buyer.savings - buyer.previousSavings) / buyer.previousSavings) * 100;
                const ordersChange = ((buyer.orders - buyer.previousOrders) / buyer.previousOrders) * 100;
                return (
                  <motion.div
                    key={buyer.name}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/60 cursor-pointer transition-all duration-200 group border border-transparent hover:border-border/50 hover:shadow-sm"
                    onClick={() => onBuyerDrillDown(buyer)}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-chart-2/10 text-chart-2 font-bold text-sm transition-transform group-hover:scale-110">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate group-hover:text-chart-2 transition-colors">{buyer.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-tight">
                        {buyer.orders} pedidos
                        {showComparison && (
                          <span className={ordersChange > 0 ? 'text-success' : 'text-destructive'}>
                            {' '}({ordersChange > 0 ? '↑' : '↓'}{Math.abs(ordersChange).toFixed(0)}%)
                          </span>
                        )}
                        {' '}• {buyer.avgCycle}d ciclo
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-success">{formatCurrency(buyer.savings)}</p>
                      {showComparison ? (
                        <p className={`text-[10px] font-medium flex items-center justify-end gap-1 ${savingsChange > 0 ? 'text-success' : 'text-destructive'}`}>
                          {savingsChange > 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                          {Math.abs(savingsChange).toFixed(1)}%
                        </p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground font-medium italic">economia</p>
                      )}
                    </div>
                    <div className="w-12 text-right">
                      <Badge 
                        variant={buyer.compliance >= 95 ? 'default' : buyer.compliance >= 90 ? 'secondary' : 'outline'}
                        className="h-5 px-1.5 text-[10px] font-bold"
                      >
                        {buyer.compliance}%
                      </Badge>
                    </div>
                  </motion.div>
                );
              }) : (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-muted-foreground py-8 text-sm italic"
                >
                  Nenhum comprador encontrado para os filtros selecionados
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
