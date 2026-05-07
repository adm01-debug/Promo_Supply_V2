import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkline } from '@/components/ui/sparkline';
import { ArrowUpRight, ArrowDownRight, AlertTriangle, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

import { formatCurrency, formatNumber } from './executiveDashboardData';

interface MetricCardProps {
  title: string;
  value: number;
  previousValue?: number;
  change?: number;
  target?: number;
  icon: React.ElementType;
  format?: 'currency' | 'number' | 'percent' | 'days';
  onClick?: () => void;
  urgent?: number;
  critical?: number;
  showComparison?: boolean;
  invertChange?: boolean;
  trendData?: number[];
}

export const ExecutiveMetricCard = ({
  title, value, previousValue, change, target, icon: Icon,
  format = 'number', onClick, urgent, critical, showComparison,
  invertChange = false, trendData
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
      whileHover={{ y: -4 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card
        className={cn(
          "h-full relative overflow-hidden transition-all duration-300 group border-border/40 hover:border-primary/40",
          "bg-gradient-to-br from-card to-card/50 backdrop-blur-sm",
          "dark:bg-gradient-to-br dark:from-white/[0.03] dark:to-transparent",
          onClick ? "cursor-pointer active:scale-95" : ""
        )}
        onClick={onClick}
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-colors" />
        
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between mb-5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 group-hover:scale-110 transition-transform">
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2">
              {trendData && trendData.length >= 2 && (
                <div className="opacity-70 group-hover:opacity-100 transition-opacity">
                  <Sparkline
                    data={trendData}
                    width={70}
                    height={24}
                    color={isGoodChange ? 'hsl(var(--success))' : isBadChange ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
                  />
                </div>
              )}
              {change !== undefined && (
                <Badge 
                  variant={isGoodChange ? 'default' : isBadChange ? 'destructive' : 'secondary'} 
                  className={cn(
                    "flex items-center gap-1 font-semibold",
                    isGoodChange ? "bg-success/10 text-success hover:bg-success/20 border-success/20" : 
                    isBadChange ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20" : ""
                  )}
                >
                  {isPositive ? <ArrowUpRight className="h-3 w-3" /> : isNegative ? <ArrowDownRight className="h-3 w-3" /> : null}
                  {Math.abs(change).toFixed(1)}%
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {title}
              </p>
              <p className="text-3xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                {formatValue(value)}
              </p>
            </div>

            {showComparison && previousValue !== undefined && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground/80 font-medium">
                <Calendar className="h-3 w-3" />
                <span>Anterior: {formatValue(previousValue)}</span>
                {change !== undefined && (
                  <span className={cn(
                    "flex items-center",
                    isGoodChange ? 'text-success' : isBadChange ? 'text-destructive' : ''
                  )}>
                    ({change > 0 ? '+' : ''}{change.toFixed(1)}%)
                  </span>
                )}
              </div>
            )}

            {target && (
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
                  <span className="text-muted-foreground">Meta: {formatValue(target)}</span>
                  <span className={isAboveTarget ? 'text-success' : 'text-warning'}>
                    {targetProgress?.toFixed(0)}%
                  </span>
                </div>
                <div className="relative h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(targetProgress || 0, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full transition-all",
                      isAboveTarget ? "bg-success" : "bg-primary"
                    )}
                  />
                </div>
              </div>
            )}

            {(urgent !== undefined && urgent > 0) || (critical !== undefined && critical > 0) ? (
              <div className="flex items-center gap-3 pt-1">
                {urgent !== undefined && urgent > 0 && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[11px] font-bold animate-pulse">
                    <AlertTriangle className="h-3 w-3" />
                    {urgent} URGENTE
                  </div>
                )}
                {critical !== undefined && critical > 0 && (
                  <div className="flex items-center gap-1.5 text-destructive text-[11px] font-bold">
                    <AlertTriangle className="h-3 w-3" />
                    {critical} CRÍTICO
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};