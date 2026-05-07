import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkline } from '@/components/ui/sparkline';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, AlertTriangle, Calendar, TrendingUp, Target } from 'lucide-react';
import { formatCurrency, formatNumber } from './executiveDashboardData';

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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.1 }}
    >
      <Card
        className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:translate-y-[-4px] active:scale-[0.98] ${onClick ? 'hover:border-primary/50' : ''}`}
        onClick={onClick}
      >
        {/* Glow effect for high priority */}
        {(urgent !== undefined && urgent > 0) && (
          <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
            <div className="absolute top-[-24px] right-[-24px] w-24 h-24 bg-destructive/10 rounded-full blur-2xl animate-pulse" />
          </div>
        )}

        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-sm transition-transform group-hover:scale-110">
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-3">
              <AnimatePresence mode="wait">
                {trendData && trendData.length >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                  >
                    <Sparkline
                      data={trendData}
                      width={64}
                      height={24}
                      color={isGoodChange ? 'hsl(var(--success))' : isBadChange ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              
              {change !== undefined && (
                <Badge 
                  variant={isGoodChange ? 'default' : isBadChange ? 'destructive' : 'secondary'} 
                  className={`flex items-center gap-1 font-semibold ${isGoodChange ? 'bg-success hover:bg-success/90' : ''}`}
                >
                  {isPositive ? <ArrowUpRight className="h-3 w-3" /> : isNegative ? <ArrowDownRight className="h-3 w-3" /> : null}
                  {Math.abs(change).toFixed(1)}%
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
              <div className="flex items-baseline gap-2">
                <motion.p 
                  className="text-3xl font-bold tracking-tight"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {formatValue(value)}
                </motion.p>
                {isGoodChange && (
                  <TrendingUp className="h-4 w-4 text-success animate-bounce-subtle" />
                )}
              </div>
              {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            </div>

            {showComparison && previousValue !== undefined && (
              <div className="p-2 rounded-lg bg-muted/50 flex items-center justify-between text-xs transition-colors hover:bg-muted">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Período Anterior</span>
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <span>{formatValue(previousValue)}</span>
                  {change !== undefined && (
                    <span className={isGoodChange ? 'text-success' : isBadChange ? 'text-destructive' : ''}>
                      {change > 0 ? '+' : ''}{change.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            )}

            {target && (
              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Target className="h-3.5 w-3.5" />
                    <span>Meta: {formatValue(target)}</span>
                  </div>
                  <span className={`font-bold ${isAboveTarget ? 'text-success' : 'text-warning'}`}>
                    {targetProgress?.toFixed(0)}%
                  </span>
                </div>
                <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
                  <motion.div 
                    className={`h-full rounded-full ${isAboveTarget ? 'bg-success' : 'bg-primary'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(targetProgress || 0, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: (delay * 0.1) + 0.5 }}
                  />
                  {isAboveTarget && (
                    <motion.div 
                      className="absolute inset-0 bg-white/20"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {urgent !== undefined && urgent > 0 && (
                <Badge variant="destructive" className="animate-pulse shadow-sm shadow-destructive/20 border-destructive/20">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  {urgent} Urgente{urgent > 1 ? 's' : ''}
                </Badge>
              )}
              {critical !== undefined && critical > 0 && (
                <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5 font-medium">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  {critical} Crítico{critical > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
