import { useMemo, useState, useEffect, forwardRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, TooltipProps, Sector } from 'recharts';
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, AlertTriangle, CheckCircle, Clock, Calendar, Info, TrendingUp } from 'lucide-react';
import { useSLASettings } from '@/stores/slaSettingsStore';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDashboardKPIs } from '@/hooks/useDashboardKPIs';
import { motion } from 'framer-motion';

type SLAStatus = 'ok' | 'warning' | 'critical' | 'overdue';
type PeriodFilter = 'week' | 'month' | 'quarter' | 'all';

const PERIOD_OPTIONS = [
  { value: 'week', label: 'Última Semana' },
  { value: 'month', label: 'Último Mês' },
  { value: 'quarter', label: 'Último Trimestre' },
  { value: 'all', label: 'Todos' },
];

const STATUS_CONFIG = {
  ok: {
    label: 'No Prazo',
    lightColor: 'hsl(142, 71%, 45%)',
    darkColor: 'hsl(142, 71%, 52%)',
    icon: CheckCircle,
    bgClass: 'bg-success/10 dark:bg-success/20',
    textClass: 'text-success',
  },
  warning: {
    label: 'Atenção',
    lightColor: 'hsl(38, 92%, 50%)',
    darkColor: 'hsl(38, 92%, 55%)',
    icon: Clock,
    bgClass: 'bg-warning/10 dark:bg-warning/20',
    textClass: 'text-warning',
  },
  critical: {
    label: 'Crítico',
    lightColor: 'hsl(0, 84%, 60%)',
    darkColor: 'hsl(0, 84%, 58%)',
    icon: AlertTriangle,
    bgClass: 'bg-destructive/10 dark:bg-destructive/20',
    textClass: 'text-destructive',
  },
  overdue: {
    label: 'Atrasado',
    lightColor: 'hsl(0, 0%, 30%)',
    darkColor: 'hsl(0, 0%, 50%)',
    icon: AlertCircle,
    bgClass: 'bg-muted dark:bg-muted/50',
    textClass: 'text-muted-foreground',
  },
};

export const SLADistributionChart = forwardRef<HTMLDivElement>((_props, ref) => {
  const { settings } = useSLASettings();
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Fetch real solicitacoes from Supabase
  const { data: solicitacoes, isLoading } = useQuery({
    queryKey: ['sla-distribution-solicitacoes', period],
    queryFn: async () => {
      let query = supabase
        .from('solicitacoes')
        .select('id, status, data_necessidade, created_at')
        .not('status', 'in', '(concluida,cancelada)');

      if (period !== 'all') {
        const now = new Date();
        const daysBack = period === 'week' ? 7 : period === 'month' ? 30 : 90;
        const since = new Date(now.getTime() - daysBack * 86400000);
        query = query.gte('created_at', since.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  const distributionData = useMemo(() => {
    const counts: Record<SLAStatus, number> = { ok: 0, warning: 0, critical: 0, overdue: 0 };

    (solicitacoes || []).forEach((sol) => {
      if (!sol.data_necessidade) return;
      const now = new Date();
      const deadline = new Date(sol.data_necessidade);
      const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let status: SLAStatus;
      if (daysUntil < 0) status = 'overdue';
      else if (daysUntil <= settings.criticalThresholdDays) status = 'critical';
      else if (daysUntil <= settings.warningThresholdDays) status = 'warning';
      else status = 'ok';

      counts[status]++;
    });

    return Object.entries(counts)
      .filter(([_, value]) => value > 0)
      .map(([key, value]) => {
        const config = STATUS_CONFIG[key as SLAStatus];
        return {
          name: config.label,
          value,
          status: key as SLAStatus,
          color: isDark ? config.darkColor : config.lightColor,
          bgClass: config.bgClass,
          textClass: config.textClass,
        };
      });
  }, [solicitacoes, settings.warningThresholdDays, settings.criticalThresholdDays, isDark]);

  const total = distributionData.reduce((acc, item) => acc + item.value, 0);

  const CustomTooltip = ({ active, payload }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as { name: string; value: number };
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0';
      return (
        <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl dark:shadow-2xl dark:shadow-black/20 dark:ring-1 dark:ring-white/5">
          <p className="font-medium text-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.value} pedidos ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-[200px]" /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Distribuição de SLA
          </CardTitle>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center gap-4">
          <div className="w-full lg:w-1/2 h-[200px]">
            {distributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Nenhuma solicitação ativa
              </div>
            )}
          </div>

          <div className="w-full lg:w-1/2 space-y-2">
            {distributionData.map((item) => {
              const config = STATUS_CONFIG[item.status];
              const Icon = config.icon;
              const percentage = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
              return (
                <div
                  key={item.status}
                  className={`flex items-center justify-between p-2 rounded-lg ${config.bgClass} transition-colors`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full dark:shadow-[0_0_6px_currentColor]"
                      style={{ backgroundColor: item.color }}
                    />
                    <Icon className={`h-4 w-4 ${config.textClass}`} />
                    <span className="text-sm font-medium text-foreground">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {item.value}
                    </Badge>
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      {percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
            
            <div className="flex items-center justify-between p-2 pt-3 border-t border-border mt-2">
              <span className="text-sm font-semibold text-foreground">Total Ativos</span>
              <Badge className="text-xs">{total}</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

SLADistributionChart.displayName = 'SLADistributionChart';
