import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkline } from '@/components/ui/sparkline';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, AlertTriangle, Calendar, TrendingUp, Target } from 'lucide-react';
import { formatNumber } from './executiveDashboardData';
import { cn, formatCurrency } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: number;
  previousValue?: number;
  change?: number;
  target?: number;
  icon: React.ElementType;
  format?: 'currency' | 'number' | 'percent' | 'days';
  subtitle?: string;
  onClick?: () => void;
  urgent?: number;
  critical?: number;
  showComparison?: boolean;
  invertChange?: boolean;
  trendData?: number[];
  delay?: number;
}

/**
 * ExecutiveMetricCard Elite 10/10
 * Refined visuals for high-level decision makers.
 */
export const ExecutiveMetricCard = ({
  title, value, previousValue, change, target, icon: Icon,
  format = 'number', subtitle, onClick, urgent, critical, showComparison,
  invertChange = false, trendData, delay = 0
}: MetricCardProps) => {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;
  const targetProgress = target ? (value / target) * 100 : null;
  const isAboveTarget = target && value >= target;
  const isGoodChange = invertChange ? isNegative : isPositive;
  const isBadChange = invertChange ? isPositive : isNegative;

  const formatValue = (val: number) => {
    switch (format) {
      case 'currency': return formatCurrency(val);
      case 'percent': return `${val.toFixed(1)}%`;
      case 'days': return `${val} dias`;
      default: return formatNumber(val);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.05 }}
    >
      <Card
        className={cn(
          "relative overflow-hidden cursor-pointer transition-all duration-500",
          "hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:-translate-y-2 active:scale-[0.98]",
          "border-white/5 bg-white/[0.03] backdrop-blur-2xl rounded-[2.5rem]",
          onClick ? "hover:border-violet-500/40 hover:bg-white/[0.05]" : ""
        )}
        onClick={onClick}
      >
        {/* Elite Ambient Glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-400 shadow-inner">
              <Icon className="h-6 w-6" />
            </div>
            
            <div className="flex items-center gap-3">
              {trendData && trendData.length >= 2 && (
                <Sparkline
                  data={trendData}
                  width={60}
                  height={20}
                  color={isGoodChange ? '#10b981' : isBadChange ? '#ef4444' : '#8b5cf6'}
                />
              )}
              
              {change !== undefined && (
                <Badge 
                  className={cn(
                    "flex items-center gap-1 font-black text-[10px] rounded-lg px-2 py-1 border-none shadow-sm",
                    isGoodChange ? "bg-emerald-500/20 text-emerald-400" : isBadChange ? "bg-rose-500/20 text-rose-400" : "bg-white/10 text-zinc-400"
                  )}
                >
                  {isPositive ? <ArrowUpRight className="h-3 w-3" /> : isNegative ? <ArrowDownRight className="h-3 w-3" /> : null}
                  {Math.abs(change).toFixed(1)}%
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1">{title}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-black text-white tracking-tighter leading-none">
                  {formatValue(value)}
                </p>
                {isGoodChange && (
                  <TrendingUp className="h-4 w-4 text-emerald-400 animate-pulse" />
                )}
              </div>
              {subtitle && <p className="text-[10px] font-bold text-zinc-500/60 mt-2 uppercase tracking-wide">{subtitle}</p>}
            </div>

            {showComparison && previousValue !== undefined && (
              <div className="p-3 rounded-2xl bg-white/[0.02] flex items-center justify-between text-[10px] font-bold transition-all hover:bg-white/[0.04] border border-white/5">
                <div className="flex items-center gap-2 text-zinc-500 uppercase tracking-widest">
                  <Calendar className="h-3.5 w-3.5 opacity-50" />
                  <span>BASELINE</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="opacity-80 text-zinc-300">{formatValue(previousValue)}</span>
                  <span className={isGoodChange ? 'text-emerald-400' : isBadChange ? 'text-rose-400' : 'text-zinc-400'}>
                    {change !== undefined ? `${change > 0 ? '+' : ''}${change.toFixed(1)}%` : ''}
                  </span>
                </div>
              </div>
            )}

            {target && (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <Target className="h-3.5 w-3.5" />
                    <span>TARGET INDEX</span>
                  </div>
                  <span className={isAboveTarget ? 'text-emerald-400' : 'text-violet-400'}>
                    {targetProgress?.toFixed(0)}%
                  </span>
                </div>
                <div className="relative h-1.5 w-full rounded-full bg-white/[0.05] overflow-hidden">
                  <motion.div 
                    className={cn("h-full rounded-full", isAboveTarget ? 'bg-emerald-500' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500')}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(targetProgress || 0, 100)}%` }}
                    transition={{ duration: 1, ease: "circOut" }}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {urgent !== undefined && urgent > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-400 rounded-full text-[9px] font-black uppercase">
                  <div className="w-1 h-1 rounded-full bg-rose-500 animate-ping" />
                  {urgent} URGENTE
                </div>
              )}
              {critical !== undefined && critical > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-[9px] font-black uppercase">
                  <AlertTriangle className="h-3 w-3" />
                  {critical} CRÍTICO
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
