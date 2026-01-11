import { useMemo, useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  TooltipProps
} from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Clock, 
  Target, 
  CheckCircle2, 
  AlertTriangle,
  BarChart3,
  Calendar
} from 'lucide-react';

type TimeRange = '7d' | '30d' | '90d';

// Generate mock historical data
const generateHistoricalData = (days: number) => {
  const data = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Simulate realistic fluctuations
    const baseCompliance = 85 + Math.sin(i / 5) * 8;
    const compliance = Math.min(100, Math.max(70, baseCompliance + (Math.random() - 0.5) * 10));
    
    const baseOnTime = 90 + Math.cos(i / 7) * 5;
    const onTimeRate = Math.min(100, Math.max(75, baseOnTime + (Math.random() - 0.5) * 8));
    
    const avgLeadTime = 3 + Math.sin(i / 10) * 0.8 + (Math.random() - 0.5) * 0.5;
    
    const totalOrders = Math.floor(15 + Math.random() * 10);
    const criticalOrders = Math.floor(Math.random() * 3);
    const overdueOrders = Math.floor(Math.random() * 2);
    
    data.push({
      date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      fullDate: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      compliance: Math.round(compliance * 10) / 10,
      onTimeRate: Math.round(onTimeRate * 10) / 10,
      avgLeadTime: Math.round(avgLeadTime * 10) / 10,
      totalOrders,
      criticalOrders,
      overdueOrders,
      okOrders: totalOrders - criticalOrders - overdueOrders,
    });
  }
  
  return data;
};

const MetricCard = ({ 
  title, 
  value, 
  suffix = '', 
  trend, 
  trendValue,
  icon: Icon,
  color = 'primary'
}: {
  title: string;
  value: number | string;
  suffix?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon: LucideIcon;
  color?: 'primary' | 'success' | 'warning' | 'destructive';
}) => {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';
  
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
      <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{title}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold">{value}{suffix}</span>
          {trend && trendValue && (
            <span className={`text-xs flex items-center gap-0.5 ${trendColor}`}>
              <TrendIcon className="h-3 w-3" />
              {trendValue}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

interface PayloadEntry {
  color: string;
  name: string;
  value: number;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-sm mb-2">{label}</p>
        {(payload as PayloadEntry[]).map((entry, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">{entry.value}%</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const SLAPerformanceDashboard = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  
  const data = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    return generateHistoricalData(days);
  }, [timeRange]);
  
  const metrics = useMemo(() => {
    const recent = data.slice(-7);
    const previous = data.slice(-14, -7);
    
    const avgCompliance = recent.reduce((acc, d) => acc + d.compliance, 0) / recent.length;
    const prevCompliance = previous.length > 0 
      ? previous.reduce((acc, d) => acc + d.compliance, 0) / previous.length 
      : avgCompliance;
    
    const avgOnTime = recent.reduce((acc, d) => acc + d.onTimeRate, 0) / recent.length;
    const prevOnTime = previous.length > 0 
      ? previous.reduce((acc, d) => acc + d.onTimeRate, 0) / previous.length 
      : avgOnTime;
    
    const avgLeadTime = recent.reduce((acc, d) => acc + d.avgLeadTime, 0) / recent.length;
    const prevLeadTime = previous.length > 0 
      ? previous.reduce((acc, d) => acc + d.avgLeadTime, 0) / previous.length 
      : avgLeadTime;
    
    const totalCritical = recent.reduce((acc, d) => acc + d.criticalOrders, 0);
    const totalOverdue = recent.reduce((acc, d) => acc + d.overdueOrders, 0);
    
    return {
      compliance: Math.round(avgCompliance * 10) / 10,
      complianceTrend: avgCompliance > prevCompliance ? 'up' : avgCompliance < prevCompliance ? 'down' : 'neutral',
      complianceDiff: Math.abs(Math.round((avgCompliance - prevCompliance) * 10) / 10),
      
      onTimeRate: Math.round(avgOnTime * 10) / 10,
      onTimeTrend: avgOnTime > prevOnTime ? 'up' : avgOnTime < prevOnTime ? 'down' : 'neutral',
      onTimeDiff: Math.abs(Math.round((avgOnTime - prevOnTime) * 10) / 10),
      
      avgLeadTime: Math.round(avgLeadTime * 10) / 10,
      leadTimeTrend: avgLeadTime < prevLeadTime ? 'up' : avgLeadTime > prevLeadTime ? 'down' : 'neutral',
      leadTimeDiff: Math.abs(Math.round((avgLeadTime - prevLeadTime) * 10) / 10),
      
      totalCritical,
      totalOverdue,
    };
  }, [data]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Performance de SLA
          </CardTitle>
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metrics Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            title="Taxa de Conformidade"
            value={metrics.compliance}
            suffix="%"
            trend={metrics.complianceTrend as any}
            trendValue={`${metrics.complianceDiff}%`}
            icon={Target}
            color="primary"
          />
          <MetricCard
            title="Entregas no Prazo"
            value={metrics.onTimeRate}
            suffix="%"
            trend={metrics.onTimeTrend as any}
            trendValue={`${metrics.onTimeDiff}%`}
            icon={CheckCircle2}
            color="success"
          />
          <MetricCard
            title="Lead Time Médio"
            value={metrics.avgLeadTime}
            suffix=" dias"
            trend={metrics.leadTimeTrend as any}
            trendValue={`${metrics.leadTimeDiff}d`}
            icon={Clock}
            color="warning"
          />
          <MetricCard
            title="Alertas (7d)"
            value={metrics.totalCritical + metrics.totalOverdue}
            icon={AlertTriangle}
            color={metrics.totalCritical + metrics.totalOverdue > 5 ? 'destructive' : 'warning'}
          />
        </div>

        {/* Charts */}
        <Tabs defaultValue="compliance" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="compliance" className="text-xs">Conformidade</TabsTrigger>
            <TabsTrigger value="delivery" className="text-xs">Entregas</TabsTrigger>
            <TabsTrigger value="volume" className="text-xs">Volume</TabsTrigger>
          </TabsList>
          
          <TabsContent value="compliance" className="mt-4">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorCompliance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }} 
                    tickLine={false}
                    axisLine={false}
                    interval={timeRange === '7d' ? 0 : timeRange === '30d' ? 4 : 14}
                  />
                  <YAxis 
                    domain={[60, 100]} 
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="compliance"
                    name="Conformidade"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#colorCompliance)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="delivery" className="mt-4">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval={timeRange === '7d' ? 0 : timeRange === '30d' ? 4 : 14}
                  />
                  <YAxis 
                    domain={[60, 100]} 
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="onTimeRate"
                    name="No Prazo"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="volume" className="mt-4">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval={timeRange === '7d' ? 0 : timeRange === '30d' ? 4 : 14}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip />
                  <Bar dataKey="okOrders" name="No Prazo" stackId="a" fill="hsl(var(--success))" />
                  <Bar dataKey="criticalOrders" name="Críticos" stackId="a" fill="hsl(var(--warning))" />
                  <Bar dataKey="overdueOrders" name="Atrasados" stackId="a" fill="hsl(var(--destructive))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
