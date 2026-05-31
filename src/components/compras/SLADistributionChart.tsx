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
import { cn } from '@/lib/utils';
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

const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="text-xl font-black">
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="currentColor" className="text-xs font-bold">
        {`${value} itens`}
      </text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="hsl(var(--muted-foreground))" className="text-[10px]">
        {`(${(percent * 100).toFixed(1)}%)`}
      </text>
    </g>
  );
};

export const SLADistributionChart = forwardRef<HTMLDivElement>((_props, ref) => {
  const { settings } = useSLASettings();
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [isDark, setIsDark] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

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
    staleTime: 30_000,
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
      .filter(([_, value]) => value >= 0) // Keep all for legend consistency
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

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full overflow-hidden border-2 transition-all hover:shadow-xl">
      <CardHeader className="pb-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Saúde do SLA Operacional
            </CardTitle>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" />
              Baseado na data de necessidade das solicitações
            </p>
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="w-[150px] h-9 text-xs font-semibold bg-muted/50">
              <Calendar className="h-3.5 w-3.5 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Chart Section */}
          <div className="lg:col-span-7 h-[300px] relative">
            {total > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={5}
                    dataKey="value"
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                  >
                    {distributionData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        stroke={entry.color}
                        strokeWidth={activeIndex === index ? 2 : 1}
                        className="transition-all duration-300 outline-none"
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover border border-border p-3 rounded-xl shadow-2xl backdrop-blur-md">
                            <p className="font-black text-sm uppercase tracking-tight" style={{ color: data.color }}>{data.name}</p>
                            <p className="text-2xl font-black mt-1">{data.value} <span className="text-xs font-normal text-muted-foreground">itens</span></p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center space-y-3 bg-muted/20 rounded-2xl border-2 border-dashed border-border/50">
                <Calendar className="w-12 h-12 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">Nenhuma solicitação ativa no período</p>
              </div>
            )}
            
            {/* Center Info for total */}
            {total > 0 && activeIndex === null && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-foreground">{total}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Total Geral</span>
              </div>
            )}
          </div>

          {/* Detailed Stats Section */}
          <div className="lg:col-span-5 space-y-3">
            <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-4">Métricas de Performance</h4>
            
            <div className="space-y-2">
              {distributionData.map((item, index) => {
                const config = STATUS_CONFIG[item.status];
                const Icon = config.icon;
                const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                const isActive = activeIndex === index;
                
                return (
                  <motion.div
                    key={item.status}
                    whileHover={{ x: 4 }}
                    className={cn(
                      "group flex items-center justify-between p-3 rounded-xl border-2 transition-all duration-300 cursor-pointer",
                      isActive ? "bg-background border-primary shadow-lg ring-1 ring-primary/20" : "bg-muted/30 border-transparent hover:border-border",
                      item.value === 0 && "opacity-40"
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg", config.bgClass)}>
                        <Icon className={cn("h-4 w-4", config.textClass)} />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-sm font-bold text-foreground block">{item.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              className={cn("h-full rounded-full", item.status === 'ok' ? 'bg-success' : item.status === 'warning' ? 'bg-warning' : 'bg-destructive')} 
                            />
                          </div>
                          <span className="text-[10px] font-black text-muted-foreground">{percentage}%</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={isActive ? "default" : "outline"} className="font-mono text-sm px-2.5">
                      {item.value}
                    </Badge>
                  </motion.div>
                );
              })}
            </div>

            <div className="pt-6 mt-4 border-t border-dashed border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-xs font-bold text-muted-foreground">Eficiência Global</span>
              </div>
              <span className="text-lg font-black text-success">
                {total > 0 ? ((distributionData.find(d => d.status === 'ok')?.value || 0) / total * 100).toFixed(0) : '100'}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

SLADistributionChart.displayName = 'SLADistributionChart';
