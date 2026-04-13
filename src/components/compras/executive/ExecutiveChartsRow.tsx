import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, BarChart3, PieChart } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  PieChart as RechartsPieChart, Pie, Cell,
  Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ComposedChart
} from 'recharts';
import { monthlyTrend, comparisonTrend, COLORS, formatCurrency } from './executiveDashboardData';

interface ExecutiveChartsRowProps {
  showComparison: boolean;
  filteredCategorySpend: Array<{ name: string; value: number; previousValue: number; percentage: number; orders: number; supplier: string }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCategoryDrillDown: (category: any) => void;
}

export const ExecutiveChartsRow = ({ showComparison, filteredCategorySpend, onCategoryDrillDown }: ExecutiveChartsRowProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {showComparison ? 'Comparativo Spend - Atual vs Anterior' : 'Tendência de Spend e Savings'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            {showComparison ? (
              <ComposedChart data={comparisonTrend}>
                <defs>
                  <linearGradient id="currentSpendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name.includes('current') || name.includes('Atual') ? 'Atual' : 'Anterior'
                  ]}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                />
                <Legend />
                <Area type="monotone" dataKey="currentSpend" name="Spend Atual" stroke="hsl(var(--primary))" fill="url(#currentSpendGradient)" />
                <Line type="monotone" dataKey="previousSpend" name="Spend Anterior" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" dot={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Bar dataKey="currentSavings" name="Savings Atual" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} opacity={0.8} />
              </ComposedChart>
            ) : (
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                />
                <Legend />
                <Area type="monotone" dataKey="spend" name="Spend" stroke="hsl(var(--primary))" fill="url(#spendGradient)" />
                <Area type="monotone" dataKey="savings" name="Savings" stroke="hsl(var(--chart-2))" fill="url(#savingsGradient)" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Spend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {showComparison ? <BarChart3 className="h-5 w-5" /> : <PieChart className="h-5 w-5" />}
            {showComparison ? 'Comparativo por Categoria' : 'Distribuição por Categoria'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            {showComparison ? (
              <BarChart data={filteredCategorySpend} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
                <YAxis dataKey="name" type="category" className="text-xs" width={80} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'value' ? 'Atual' : 'Anterior'
                  ]}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                />
                <Legend />
                <Bar dataKey="value" name="Atual" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="previousValue" name="Anterior" fill="hsl(var(--muted-foreground))" opacity={0.5} radius={[0, 4, 4, 0]} />
              </BarChart>
            ) : (
              <RechartsPieChart>
                <Pie
                  data={filteredCategorySpend}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={100}
                  paddingAngle={2} dataKey="value"
                  onClick={(data) => onCategoryDrillDown(data)}
                  className="cursor-pointer"
                >
                  {filteredCategorySpend.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                />
                <Legend />
              </RechartsPieChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
