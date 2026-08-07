import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, ArrowRight, ShieldAlert, Zap } from 'lucide-react';

import { cn, formatCurrency } from '@/lib/utils';

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
        <CardTitle className="text-lg flex items-center gap-3 font-black text-white uppercase tracking-tight">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          Pending Critical Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-5">
          <AnimatePresence mode="popLayout">
            {items.length > 0 ? items.slice(0, 4).map((item, index) => {
              const isCritical = item.priority === 'critical';
              const isHigh = item.priority === 'high';
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ y: -4, scale: 1.01 }}
                  className={cn(
                    "group relative p-5 rounded-[2rem] border border-white/5 bg-white/[0.03] backdrop-blur-2xl transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)]",
                    isCritical && 'border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10',
                    isHigh && 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10'
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-xl",
                        isCritical ? 'bg-rose-500/20 text-rose-400' :
                        isHigh ? 'bg-amber-500/20 text-amber-400' :
                        'bg-violet-500/20 text-violet-400'
                      )}>
                        {isCritical ? <ShieldAlert className="h-4 w-4" /> : 
                         isHigh ? <Zap className="h-4 w-4" /> : 
                         <Clock className="h-4 w-4" />}
                      </div>
                      <Badge 
                        className={cn(
                          "text-[10px] uppercase tracking-[0.2em] font-black h-6 px-3 border-none",
                          isCritical ? 'bg-rose-500/20 text-rose-400' :
                          isHigh ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-zinc-400'
                        )}
                      >
                        {item.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-zinc-500 bg-white/5 px-3 py-1 rounded-full uppercase tracking-widest">
                      <Clock className="h-3 w-3" />
                      {item.days}d
                    </div>
                  </div>
                  
                  <div className="space-y-1 mb-6">
                    <p className="font-bold text-zinc-100 line-clamp-1 group-hover:text-violet-400 transition-colors text-base leading-tight">{item.item}</p>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.15em] truncate">
                      {item.supplier} • {item.category}
                    </p>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-1">Impact Value</p>
                      <p className="text-xl font-black text-white tracking-tighter">{formatCurrency(item.value)}</p>
                    </div>
                    <motion.div 
                      whileHover={{ x: 4 }}
                      className="p-3 rounded-full bg-violet-500/10 text-violet-400 opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer shadow-lg shadow-violet-500/20"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </motion.div>
                  </div>

                  {isCritical && (
                    <div className="absolute top-2 right-2 p-1">
                      <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                    </div>
                  )}
                </motion.div>
              );
            }) : (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-zinc-500 py-16 text-xs font-black uppercase tracking-[0.3em] italic border-2 border-dashed border-white/5 rounded-[2.5rem]"
              >
                Zero Critical Risks
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
};
