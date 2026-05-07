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
    <Card
      className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${onClick ? 'hover:border-primary/50' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            {trendData && trendData.length >= 2 && (
              <Sparkline
                data={trendData}
                width={60}
                height={20}
                color={isGoodChange ? 'hsl(var(--success))' : isBadChange ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
              />
            )}
            {change !== undefined && (
              <Badge variant={isGoodChange ? 'default' : isBadChange ? 'destructive' : 'secondary'} className="flex items-center gap-1">
                {isPositive ? <ArrowUpRight className="h-3 w-3" /> : isNegative ? <ArrowDownRight className="h-3 w-3" /> : null}
                {Math.abs(change).toFixed(1)}%
              </Badge>
            )}
          </div>
          {urgent !== undefined && urgent > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {urgent} urgente{urgent > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{formatValue(value)}</p>

          {showComparison && previousValue !== undefined && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Anterior: {formatValue(previousValue)}</span>
              {change !== undefined && (
                <span className={isGoodChange ? 'text-success' : isBadChange ? 'text-destructive' : ''}>
                  ({change > 0 ? '+' : ''}{change.toFixed(1)}%)
                </span>
              )}
            </div>
          )}

          {target && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Meta: {formatValue(target)}</span>
                <span className={isAboveTarget ? 'text-success' : 'text-warning'}>
                  {targetProgress?.toFixed(0)}%
                </span>
              </div>
              <Progress value={Math.min(targetProgress || 0, 100)} className="h-1.5" />
            </div>
          )}

          {critical !== undefined && critical > 0 && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {critical} crítico{critical > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
