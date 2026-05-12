import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, BarChart3, PieChart, TrendingUp, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar,
  PieChart as RechartsPieChart, Pie, Cell,
  Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ComposedChart
} from 'recharts';
import { 
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { monthlyTrend, comparisonTrend, COLORS, formatCurrency } from './executiveDashboardData';

const CustomTooltip = ({ active, payload, label, showComparison }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-md border border-border p-3 rounded-xl shadow-2xl space-y-2 min-w-[180px]">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                <span className="text-xs font-medium text-foreground/80">{entry.name}</span>
              </div>
              <span className="text-xs font-bold">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

interface ExecutiveChartsRowProps {
  showComparison: boolean;
  filteredCategorySpend: Array<{ name: string; value: number; previousValue: number; percentage: number; orders: number; supplier: string }>;
  onCategoryDrillDown: (category: any) => void;
  selectedCategory: string;
  selectedSupplier: string;
}

export const ExecutiveChartsRow = ({ 
  showComparison, 
  filteredCategorySpend, 
  onCategoryDrillDown,
  selectedCategory,
  selectedSupplier
}: ExecutiveChartsRowProps) => {
  const filteredTrend = useMemo(() => {
    // If no specific filter, return default
    if (selectedCategory === 'all' && selectedSupplier === 'all') return comparisonTrend;
    
    // In a real app, this would be an API call with filters
    // For now, we simulate by applying a multiplier based on the selection to show visual change
    const multiplier = (selectedCategory !== 'all' ? 0.4 : 1) * (selectedSupplier !== 'all' ? 0.3 : 1);
    
    return comparisonTrend.map(item => ({
      ...item,
      currentSpend: item.currentSpend * multiplier,
      previousSpend: item.previousSpend * multiplier,
      currentSavings: item.currentSavings * multiplier,
      previousSavings: item.previousSavings * multiplier,
    }));
  }, [selectedCategory, selectedSupplier]);

  const filteredMonthlyTrend = useMemo(() => {
    if (selectedCategory === 'all' && selectedSupplier === 'all') return monthlyTrend;
    const multiplier = (selectedCategory !== 'all' ? 0.4 : 1) * (selectedSupplier !== 'all' ? 0.3 : 1);
    return monthlyTrend.map(item => ({
      ...item,
      spend: item.spend * multiplier,
      savings: item.savings * multiplier,
    }));
  }, [selectedCategory, selectedSupplier]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Trend Chart */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="h-full hover:shadow-lg transition-shadow duration-300 overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Activity className="h-5 w-5" />
              </div>
              {showComparison ? 'Performance de Spend' : 'Tendência de Fluxo'}
            </CardTitle>
            <TooltipProvider>
              <UiTooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-[10px] font-medium">Comparativo mensal consolidado de ordens e economias.</p>
                </TooltipContent>
              </UiTooltip>
            </TooltipProvider>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                {showComparison ? (
                  <ComposedChart data={comparisonTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="currentSpendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="currentSavingsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/50" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} className="text-[10px] font-medium" />
                    <YAxis axisLine={false} tickLine={false} className="text-[10px] font-medium" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                    <Area 
                      type="monotone" 
                      dataKey="currentSpend" 
                      name="Spend Atual" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fill="url(#currentSpendGradient)" 
                      animationDuration={1500}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="previousSpend" 
                      name="Spend Anterior" 
                      stroke="hsl(var(--muted-foreground))" 
                      strokeWidth={2}
                      strokeDasharray="4 4" 
                      dot={false}
                      animationDuration={1500}
                    />
                    <Bar 
                      dataKey="currentSavings" 
                      name="Savings Atual" 
                      fill="url(#currentSavingsGradient)"
                      radius={[4, 4, 0, 0]} 
                      barSize={12}
                      animationDuration={1500}
                    />
                  </ComposedChart>
                ) : (
                  <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/50" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} className="text-[10px] font-medium" />
                    <YAxis axisLine={false} tickLine={false} className="text-[10px] font-medium" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                    <Area type="monotone" dataKey="spend" name="Spend" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#spendGradient)" animationDuration={1500} />
                    <Area type="monotone" dataKey="savings" name="Savings" stroke="hsl(var(--chart-2))" strokeWidth={2} fill="url(#savingsGradient)" animationDuration={1500} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Category Spend */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="h-full hover:shadow-lg transition-shadow duration-300 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-chart-3/10 text-chart-3">
                {showComparison ? <BarChart3 className="h-5 w-5" /> : <PieChart className="h-5 w-5" />}
              </div>
              {showComparison ? 'Market Share por Categoria' : 'Composição de Carteira'}
            </CardTitle>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-success bg-success/10 px-2 py-1 rounded-full">
              <TrendingUp className="h-3 w-3" />
              +12.4% vs LTM
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                {showComparison ? (
                  <BarChart data={filteredCategorySpend} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted/50" />
                    <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-[10px] font-medium" />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} className="text-[10px] font-medium" width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                    <Bar dataKey="value" name="Atual" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} animationDuration={1500} />
                    <Bar dataKey="previousValue" name="Anterior" fill="hsl(var(--muted-foreground))" opacity={0.3} radius={[0, 4, 4, 0]} barSize={20} animationDuration={1500} />
                  </BarChart>
                ) : (
                  <RechartsPieChart>
                    <Pie
                      data={filteredCategorySpend}
                      cx="50%" cy="50%"
                      innerRadius={70} outerRadius={100}
                      paddingAngle={4} dataKey="value"
                      onClick={(data) => onCategoryDrillDown(data)}
                      className="cursor-pointer outline-none"
                      animationBegin={200}
                      animationDuration={1500}
                    >
                      {filteredCategorySpend.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                          className="hover:opacity-80 transition-opacity"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                  </RechartsPieChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
