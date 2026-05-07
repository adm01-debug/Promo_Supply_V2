import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, ArrowRight, ShieldAlert, Zap } from 'lucide-react';
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
    <Card className="overflow-hidden border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-warning/20 text-warning">
            <AlertTriangle className="h-5 w-5" />
          </div>
          Ações Pendentes Relevantes
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {items.length > 0 ? items.slice(0, 6).map((item, index) => {
              const isCritical = item.priority === 'critical';
              const isHigh = item.priority === 'high';
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                  className={`group relative p-5 rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-md ${
                    isCritical ? 'border-destructive/30 bg-destructive/5' :
                    isHigh ? 'border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10' :
                    'border-border bg-card'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-md ${
                        isCritical ? 'bg-destructive/10 text-destructive' :
                        isHigh ? 'bg-amber-500/10 text-amber-600' :
                        'bg-primary/10 text-primary'
                      }`}>
                        {isCritical ? <ShieldAlert className="h-3.5 w-3.5" /> : 
                         isHigh ? <Zap className="h-3.5 w-3.5" /> : 
                         <Clock className="h-3.5 w-3.5" />}
                      </div>
                      <Badge variant={
                        isCritical ? 'destructive' :
                        isHigh ? 'default' : 'secondary'
                      } className="text-[10px] uppercase tracking-wider font-bold h-5 px-2">
                        {item.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                      <Clock className="h-3 w-3" />
                      {item.days}d
                    </div>
                  </div>
                  
                  <div className="space-y-1 mb-4">
                    <p className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">{item.item}</p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase truncate tracking-tight">
                      {item.supplier} • {item.category}
                    </p>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Valor Total</p>
                      <p className="text-xl font-bold tracking-tight">{formatCurrency(item.value)}</p>
                    </div>
                    <motion.div 
                      whileHover={{ x: 4 }}
                      className="p-2 rounded-full bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </motion.div>
                  </div>

                  {isCritical && (
                    <div className="absolute top-0 right-0 p-1">
                      <div className="w-2 h-2 bg-destructive rounded-full animate-ping" />
                    </div>
                  )}
                </motion.div>
              );
            }) : (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-muted-foreground py-12 col-span-3 text-sm italic border-2 border-dashed rounded-2xl"
              >
                Nenhuma ação pendente crítica identificada.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
};
