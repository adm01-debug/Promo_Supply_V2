import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Users, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency } from './executiveDashboardData';
import { cn } from '@/lib/utils';

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
      <Card className="border-white/5 bg-white/[0.03] backdrop-blur-2xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-3 font-black text-white uppercase tracking-tight">
            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
              <Users className="h-5 w-5" />
            </div>
            Top 5 Suppliers
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
                    className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/[0.04] cursor-pointer transition-all duration-300 group border border-transparent hover:border-white/5"
                    onClick={() => onSupplierDrillDown(supplier)}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 font-black text-xs transition-transform group-hover:scale-110">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-zinc-100 truncate group-hover:text-violet-400 transition-colors">{supplier.name}</p>
                      <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{supplier.orders} pedidos • {supplier.categories[0]}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-white">{formatCurrency(supplier.spend)}</p>
                      {showComparison ? (
                        <p className={cn(
                          "text-[10px] font-black flex items-center justify-end gap-1",
                          spendChange > 0 ? 'text-emerald-400' : 'text-rose-400'
                        )}>
                          {spendChange > 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                          {Math.abs(spendChange).toFixed(1)}%
                        </p>
                      ) : (
                        <p className="text-[10px] text-emerald-400 font-black uppercase">+{formatCurrency(supplier.savings)} savings</p>
                      )}
                    </div>
                    <div className="w-14 text-right">
                      <Badge 
                        className={cn(
                          "h-6 px-2 text-[10px] font-black border-none shadow-sm",
                          supplier.compliance >= 90 ? 'bg-emerald-500/20 text-emerald-400' : supplier.compliance >= 85 ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                        )}
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
                  className="text-center text-zinc-500 py-12 text-xs font-bold uppercase tracking-widest italic"
                >
                  Nenhum fornecedor encontrado para os filtros selecionados
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Buyer Performance */}
      <Card className="border-white/5 bg-white/[0.03] backdrop-blur-2xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-3 font-black text-white uppercase tracking-tight">
            <div className="p-2 rounded-lg bg-fuchsia-500/10 text-fuchsia-400">
              <Zap className="h-5 w-5" />
            </div>
            Buyer Performance
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
                    className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/[0.04] cursor-pointer transition-all duration-300 group border border-transparent hover:border-white/5"
                    onClick={() => onBuyerDrillDown(buyer)}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-fuchsia-500/10 text-fuchsia-400 font-black text-xs transition-transform group-hover:scale-110">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-zinc-100 truncate group-hover:text-fuchsia-400 transition-colors">{buyer.name}</p>
                      <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                        {buyer.orders} pedidos
                        {showComparison && (
                          <span className={cn(
                            "ml-1",
                            ordersChange > 0 ? 'text-emerald-400' : 'text-rose-400'
                          )}>
                            ({ordersChange > 0 ? '↑' : '↓'}{Math.abs(ordersChange).toFixed(0)}%)
                          </span>
                        )}
                        {' '}• {buyer.avgCycle}d ciclo
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-emerald-400">{formatCurrency(buyer.savings)}</p>
                      {showComparison ? (
                        <p className={cn(
                          "text-[10px] font-black flex items-center justify-end gap-1",
                          savingsChange > 0 ? 'text-emerald-400' : 'text-rose-400'
                        )}>
                          {savingsChange > 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                          {Math.abs(savingsChange).toFixed(1)}%
                        </p>
                      ) : (
                        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-tight">economia</p>
                      )}
                    </div>
                    <div className="w-14 text-right">
                      <Badge 
                        className={cn(
                          "h-6 px-2 text-[10px] font-black border-none shadow-sm",
                          buyer.compliance >= 95 ? 'bg-emerald-500/20 text-emerald-400' : buyer.compliance >= 90 ? 'bg-violet-500/20 text-violet-400' : 'bg-white/10 text-zinc-400'
                        )}
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
                  className="text-center text-zinc-500 py-12 text-xs font-bold uppercase tracking-widest italic"
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
