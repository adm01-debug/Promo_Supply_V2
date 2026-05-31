import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Target, Package, Users, DollarSign, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { type DrillDownData, pendingItems } from './executiveDashboardData';
import { formatCurrency } from '@/lib/utils';

interface Props {
  drillDown: DrillDownData | null;
  onClose: () => void;
}

export const ExecutiveDrillDownModal = ({ drillDown, onClose }: Props) => {
  return (
    <Dialog open={!!drillDown} onOpenChange={() => onClose()}>
      <DialogContent aria-describedby="dialog-desc" className="max-w-2xl bg-background/95 backdrop-blur-xl border-primary/10 shadow-2xl rounded-3xl overflow-hidden p-0">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-chart-2 to-chart-3" />
        
        <div className="p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                {drillDown?.type === 'category' && <Package className="h-6 w-6" />}
                {drillDown?.type === 'supplier' && <Users className="h-6 w-6" />}
                {drillDown?.type === 'buyer' && <Target className="h-6 w-6" />}
                {drillDown?.type === 'pending' && <AlertCircle className="h-6 w-6" />}
              </div>
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                key={drillDown?.type}
              >
                {drillDown?.type === 'category' && `Exploração: ${drillDown.data?.name}`}
                {drillDown?.type === 'supplier' && `Perfil: ${drillDown.data?.name}`}
                {drillDown?.type === 'buyer' && `Performance: ${drillDown.data?.name}`}
                {drillDown?.type === 'pending' && 'Central de Ações Críticas'}
              </motion.span>
            </DialogTitle>
          </DialogHeader>

          <AnimatePresence mode="wait">
            <motion.div
              key={drillDown?.type + (drillDown?.data?.id || '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {drillDown?.type === 'category' && drillDown.data && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Spend Total', value: formatCurrency(drillDown.data.value), icon: DollarSign, color: 'text-primary' },
                    { label: '% do Total', value: `${drillDown.data.percentage}%`, icon: TrendingUp, color: 'text-success' },
                    { label: 'Qtd Pedidos', value: drillDown.data.orders, icon: Package, color: 'text-chart-2' }
                  ].map((stat, i) => (
                    <motion.div 
                      key={stat.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-5 rounded-2xl bg-muted/40 border border-border/50 hover:bg-muted/60 transition-colors"
                    >
                      <stat.icon className={`h-4 w-4 ${stat.color} mb-2`} />
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{stat.label}</p>
                      <p className="text-xl font-bold mt-1 tracking-tight">{stat.value}</p>
                    </motion.div>
                  ))}
                </div>
              )}

              {drillDown?.type === 'supplier' && drillDown.data && (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Volume Negociado', value: formatCurrency(drillDown.data.spend), icon: DollarSign },
                    { label: 'Savings Realizados', value: formatCurrency(drillDown.data.savings), icon: TrendingUp, color: 'text-success' },
                    { label: 'Compliance Histórico', value: `${drillDown.data.compliance}%`, icon: ShieldCheck },
                    { label: 'Total de Pedidos', value: drillDown.data.orders, icon: Package }
                  ].map((stat, i) => (
                    <motion.div 
                      key={stat.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-5 rounded-2xl bg-muted/40 border border-border/50"
                    >
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-1">{stat.label}</p>
                      <p className={`text-2xl font-bold tracking-tight ${stat.color || ''}`}>{stat.value}</p>
                    </motion.div>
                  ))}
                </div>
              )}

              {drillDown?.type === 'buyer' && drillDown.data && (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Produtividade', value: `${drillDown.data.orders} Pedidos`, icon: Target },
                    { label: 'Economia Direta', value: formatCurrency(drillDown.data.savings), icon: TrendingUp, color: 'text-success' },
                    { label: 'Ciclo Médio', value: `${drillDown.data.avgCycle} Dias`, icon: Clock },
                    { label: 'Nível de Rigor', value: `${drillDown.data.compliance}%`, icon: ShieldCheck }
                  ].map((stat, i) => (
                    <motion.div 
                      key={stat.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-5 rounded-2xl bg-muted/40 border border-border/50"
                    >
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-1">{stat.label}</p>
                      <p className={`text-2xl font-bold tracking-tight ${stat.color || ''}`}>{stat.value}</p>
                    </motion.div>
                  ))}
                </div>
              )}

              {drillDown?.type === 'pending' && (
                <div className="space-y-3 max-h-[450px] pr-2 overflow-y-auto custom-scrollbar">
                  {pendingItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-2xl border transition-all hover:shadow-md ${
                        item.priority === 'critical' ? 'border-destructive/30 bg-destructive/5' :
                        item.priority === 'high' ? 'border-amber-500/30 bg-amber-50/50' :
                        'border-border bg-card'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={item.priority === 'critical' ? 'destructive' : item.priority === 'high' ? 'default' : 'secondary'} className="rounded-md font-bold text-[9px] h-5">
                              {item.type}
                            </Badge>
                            <span className="text-[10px] font-mono font-bold text-muted-foreground">{item.id}</span>
                          </div>
                          <p className="font-semibold text-sm">{item.item}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-base tracking-tight">{formatCurrency(item.value)}</p>
                          <div className="flex items-center justify-end gap-1 text-[10px] font-bold text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {item.days}d em espera
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {drillDown?.type !== 'pending' && (
                <div className="pt-4 border-t border-dashed">
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Esta análise considera dados históricos consolidados dos últimos 6 meses. 
                      Tendência de crescimento projetada em <span className="text-primary font-bold">+8.4%</span> para o próximo trimestre com base no pipeline atual.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};
