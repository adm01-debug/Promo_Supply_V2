import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap,
  Package,
  CreditCard,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

// Mock executive data
const executiveMetrics = {
  totalSpend: { value: 2450000, change: 12.5, target: 2500000 },
  savings: { value: 245000, change: 18.2, target: 200000 },
  ordersThisMonth: { value: 156, change: -5.3, target: 170 },
  avgCycleTime: { value: 4.2, change: -15.0, target: 5.0 },
  supplierCount: { value: 48, change: 8.0, target: 50 },
  pendingApprovals: { value: 12, change: 0, urgent: 3 },
  overdueOrders: { value: 5, change: -20.0, critical: 2 },
  contractCompliance: { value: 87, change: 5.0, target: 90 }
};

const monthlyTrend = [
  { month: 'Jul', spend: 180000, savings: 18000, orders: 120 },
  { month: 'Ago', spend: 220000, savings: 24000, orders: 145 },
  { month: 'Set', spend: 195000, savings: 21000, orders: 132 },
  { month: 'Out', spend: 245000, savings: 28000, orders: 158 },
  { month: 'Nov', spend: 210000, savings: 25000, orders: 148 },
  { month: 'Dez', spend: 235000, savings: 30000, orders: 156 }
];

const categorySpend = [
  { name: 'Mochilas', value: 450000, percentage: 18.4, orders: 45 },
  { name: 'Canetas', value: 380000, percentage: 15.5, orders: 120 },
  { name: 'Camisetas', value: 320000, percentage: 13.1, orders: 38 },
  { name: 'Bonés', value: 280000, percentage: 11.4, orders: 52 },
  { name: 'Cadernos', value: 250000, percentage: 10.2, orders: 65 },
  { name: 'Outros', value: 770000, percentage: 31.4, orders: 180 }
];

const topSuppliers = [
  { name: 'XBZ Brindes', spend: 420000, orders: 45, savings: 42000, compliance: 94 },
  { name: 'Stricker', spend: 380000, orders: 38, savings: 35000, compliance: 91 },
  { name: 'Asia Import', spend: 320000, orders: 52, savings: 28000, compliance: 88 },
  { name: 'Só Marcas', spend: 280000, orders: 41, savings: 25000, compliance: 85 },
  { name: 'Spot Gifts', spend: 250000, orders: 35, savings: 22000, compliance: 82 }
];

const buyerPerformance = [
  { name: 'Ana Silva', orders: 45, savings: 52000, avgCycle: 3.8, compliance: 96 },
  { name: 'Carlos Santos', orders: 38, savings: 41000, avgCycle: 4.2, compliance: 92 },
  { name: 'Maria Costa', orders: 42, savings: 38000, avgCycle: 4.5, compliance: 89 },
  { name: 'João Pereira', orders: 31, savings: 28000, avgCycle: 5.1, compliance: 85 }
];

const pendingItems = [
  { id: 'APR-001', type: 'Aprovação', item: 'PO #2638 - Mochilas', value: 45000, days: 2, priority: 'high' },
  { id: 'APR-002', type: 'Aprovação', item: 'PO #2641 - Camisetas', value: 32000, days: 1, priority: 'critical' },
  { id: 'PAY-001', type: 'Pagamento', item: 'NF 12345 - XBZ Brindes', value: 28000, days: 3, priority: 'medium' },
  { id: 'ORD-001', type: 'Pedido Atrasado', item: 'PO #2612 - Canetas', value: 15000, days: 5, priority: 'critical' },
  { id: 'APR-003', type: 'Aprovação', item: 'PO #2645 - Bonés', value: 18000, days: 0, priority: 'high' }
];

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--muted))'];

interface DrillDownData {
  type: 'category' | 'supplier' | 'buyer' | 'pending';
  data: any;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('pt-BR').format(value);
};

const MetricCard = ({ 
  title, 
  value, 
  change, 
  target,
  icon: Icon, 
  format = 'number',
  onClick,
  urgent,
  critical
}: { 
  title: string; 
  value: number; 
  change?: number;
  target?: number;
  icon: any;
  format?: 'currency' | 'number' | 'percent' | 'days';
  onClick?: () => void;
  urgent?: number;
  critical?: number;
}) => {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;
  const targetProgress = target ? (value / target) * 100 : null;
  const isAboveTarget = target && value >= target;
  
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency': return formatCurrency(val);
      case 'percent': return `${val}%`;
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
          {change !== undefined && (
            <Badge variant={isPositive ? 'default' : isNegative ? 'destructive' : 'secondary'} className="flex items-center gap-1">
              {isPositive ? <ArrowUpRight className="h-3 w-3" /> : isNegative ? <ArrowDownRight className="h-3 w-3" /> : null}
              {Math.abs(change)}%
            </Badge>
          )}
          {urgent !== undefined && urgent > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {urgent} urgente{urgent > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{formatValue(value)}</p>
          
          {target && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Meta: {formatValue(target)}</span>
                <span className={isAboveTarget ? 'text-green-600' : 'text-amber-600'}>
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

export const ExecutiveDashboard = () => {
  const [drillDown, setDrillDown] = useState<DrillDownData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('6m');

  const handleCategoryDrillDown = (category: any) => {
    setDrillDown({ type: 'category', data: category });
  };

  const handleSupplierDrillDown = (supplier: any) => {
    setDrillDown({ type: 'supplier', data: supplier });
  };

  const handleBuyerDrillDown = (buyer: any) => {
    setDrillDown({ type: 'buyer', data: buyer });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Executivo</h2>
          <p className="text-muted-foreground">Visão consolidada de compras - Atualizado em tempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSelectedPeriod('1m')} 
            className={selectedPeriod === '1m' ? 'bg-primary text-primary-foreground' : ''}>1M</Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedPeriod('3m')}
            className={selectedPeriod === '3m' ? 'bg-primary text-primary-foreground' : ''}>3M</Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedPeriod('6m')}
            className={selectedPeriod === '6m' ? 'bg-primary text-primary-foreground' : ''}>6M</Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedPeriod('1y')}
            className={selectedPeriod === '1y' ? 'bg-primary text-primary-foreground' : ''}>1A</Button>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {(executiveMetrics.pendingApprovals.urgent > 0 || executiveMetrics.overdueOrders.critical > 0) && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div className="flex-1">
                <p className="font-medium text-destructive">Atenção Requerida</p>
                <p className="text-sm text-muted-foreground">
                  {executiveMetrics.pendingApprovals.urgent} aprovações urgentes e {executiveMetrics.overdueOrders.critical} pedidos críticos aguardando ação
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => setDrillDown({ type: 'pending', data: pendingItems })}>
                Ver Detalhes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Spend Total"
          value={executiveMetrics.totalSpend.value}
          change={executiveMetrics.totalSpend.change}
          target={executiveMetrics.totalSpend.target}
          icon={DollarSign}
          format="currency"
        />
        <MetricCard
          title="Economia Realizada"
          value={executiveMetrics.savings.value}
          change={executiveMetrics.savings.change}
          target={executiveMetrics.savings.target}
          icon={TrendingUp}
          format="currency"
        />
        <MetricCard
          title="Pedidos no Mês"
          value={executiveMetrics.ordersThisMonth.value}
          change={executiveMetrics.ordersThisMonth.change}
          target={executiveMetrics.ordersThisMonth.target}
          icon={ShoppingCart}
        />
        <MetricCard
          title="Tempo Médio Ciclo"
          value={executiveMetrics.avgCycleTime.value}
          change={executiveMetrics.avgCycleTime.change}
          target={executiveMetrics.avgCycleTime.target}
          icon={Clock}
          format="days"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Base de Fornecedores"
          value={executiveMetrics.supplierCount.value}
          change={executiveMetrics.supplierCount.change}
          target={executiveMetrics.supplierCount.target}
          icon={Users}
        />
        <MetricCard
          title="Aprovações Pendentes"
          value={executiveMetrics.pendingApprovals.value}
          urgent={executiveMetrics.pendingApprovals.urgent}
          icon={CheckCircle2}
          onClick={() => setDrillDown({ type: 'pending', data: pendingItems })}
        />
        <MetricCard
          title="Pedidos Atrasados"
          value={executiveMetrics.overdueOrders.value}
          change={executiveMetrics.overdueOrders.change}
          critical={executiveMetrics.overdueOrders.critical}
          icon={XCircle}
        />
        <MetricCard
          title="Compliance Contratos"
          value={executiveMetrics.contractCompliance.value}
          change={executiveMetrics.contractCompliance.change}
          target={executiveMetrics.contractCompliance.target}
          icon={Target}
          format="percent"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Tendência de Spend e Savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                />
                <Legend />
                <Area type="monotone" dataKey="spend" name="Spend" stroke="hsl(var(--primary))" fill="url(#spendGradient)" />
                <Area type="monotone" dataKey="savings" name="Savings" stroke="hsl(var(--chart-2))" fill="url(#savingsGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Spend Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Distribuição por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={categorySpend}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  onClick={(data) => handleCategoryDrillDown(data)}
                  className="cursor-pointer"
                >
                  {categorySpend.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Suppliers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top 5 Fornecedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topSuppliers.map((supplier, index) => (
                <div 
                  key={supplier.name} 
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleSupplierDrillDown(supplier)}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{supplier.name}</p>
                    <p className="text-sm text-muted-foreground">{supplier.orders} pedidos</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(supplier.spend)}</p>
                    <p className="text-sm text-green-600">+{formatCurrency(supplier.savings)}</p>
                  </div>
                  <Badge variant={supplier.compliance >= 90 ? 'default' : supplier.compliance >= 85 ? 'secondary' : 'destructive'}>
                    {supplier.compliance}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Buyer Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Performance dos Compradores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {buyerPerformance.map((buyer, index) => (
                <div 
                  key={buyer.name} 
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleBuyerDrillDown(buyer)}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-chart-2/20 text-chart-2 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{buyer.name}</p>
                    <p className="text-sm text-muted-foreground">{buyer.orders} pedidos • {buyer.avgCycle} dias</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">{formatCurrency(buyer.savings)}</p>
                    <p className="text-sm text-muted-foreground">economia</p>
                  </div>
                  <Badge variant={buyer.compliance >= 95 ? 'default' : buyer.compliance >= 90 ? 'secondary' : 'outline'}>
                    {buyer.compliance}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Ações Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingItems.slice(0, 6).map((item) => (
              <div 
                key={item.id}
                className={`p-4 rounded-lg border ${
                  item.priority === 'critical' ? 'border-destructive bg-destructive/5' :
                  item.priority === 'high' ? 'border-amber-500 bg-amber-500/5' :
                  'border-border'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <Badge variant={
                    item.priority === 'critical' ? 'destructive' :
                    item.priority === 'high' ? 'default' : 'secondary'
                  }>
                    {item.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{item.days}d</span>
                </div>
                <p className="font-medium text-sm mb-1">{item.item}</p>
                <p className="text-lg font-bold">{formatCurrency(item.value)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Drill Down Modal */}
      <Dialog open={!!drillDown} onOpenChange={() => setDrillDown(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {drillDown?.type === 'category' && `Detalhes: ${drillDown.data?.name}`}
              {drillDown?.type === 'supplier' && `Fornecedor: ${drillDown.data?.name}`}
              {drillDown?.type === 'buyer' && `Comprador: ${drillDown.data?.name}`}
              {drillDown?.type === 'pending' && 'Ações Pendentes'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {drillDown?.type === 'category' && drillDown.data && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Spend Total</p>
                    <p className="text-xl font-bold">{formatCurrency(drillDown.data.value)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">% do Total</p>
                    <p className="text-xl font-bold">{drillDown.data.percentage}%</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Qtd Pedidos</p>
                    <p className="text-xl font-bold">{drillDown.data.orders}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Clique no gráfico para ver mais detalhes sobre fornecedores e histórico de preços desta categoria.
                </p>
              </>
            )}
            
            {drillDown?.type === 'supplier' && drillDown.data && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Spend Total</p>
                    <p className="text-xl font-bold">{formatCurrency(drillDown.data.spend)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Economia Gerada</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(drillDown.data.savings)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Pedidos</p>
                    <p className="text-xl font-bold">{drillDown.data.orders}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Compliance</p>
                    <p className="text-xl font-bold">{drillDown.data.compliance}%</p>
                  </div>
                </div>
              </>
            )}
            
            {drillDown?.type === 'buyer' && drillDown.data && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Pedidos Realizados</p>
                    <p className="text-xl font-bold">{drillDown.data.orders}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Economia Gerada</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(drillDown.data.savings)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Tempo Médio</p>
                    <p className="text-xl font-bold">{drillDown.data.avgCycle} dias</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Compliance</p>
                    <p className="text-xl font-bold">{drillDown.data.compliance}%</p>
                  </div>
                </div>
              </>
            )}
            
            {drillDown?.type === 'pending' && (
              <div className="space-y-2 max-h-96 overflow-auto">
                {pendingItems.map((item) => (
                  <div 
                    key={item.id}
                    className={`p-4 rounded-lg border ${
                      item.priority === 'critical' ? 'border-destructive bg-destructive/5' :
                      item.priority === 'high' ? 'border-amber-500 bg-amber-500/5' :
                      'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge variant={
                          item.priority === 'critical' ? 'destructive' :
                          item.priority === 'high' ? 'default' : 'secondary'
                        } className="mb-2">
                          {item.type}
                        </Badge>
                        <p className="font-medium">{item.item}</p>
                        <p className="text-sm text-muted-foreground">Aguardando há {item.days} dia{item.days > 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{formatCurrency(item.value)}</p>
                        <Button size="sm" className="mt-2">Resolver</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
