import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardFilters, DashboardFilter } from '@/hooks/useDashboardFilters';
import { FilterFavoritesManager } from './FilterFavoritesManager';
import { PurchaseClimateWidget } from './PurchaseClimateWidget';
import { Sparkline } from '@/components/ui/sparkline';
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
  BarChart3,
  PieChart,
  Activity,
  GitCompare,
  Calendar,
  Filter,
  X
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
  Legend,
  ComposedChart
} from 'recharts';
import { useExecutiveDashboardData } from '@/hooks/useExecutiveDashboardData';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

// Current period data
const currentPeriodMetrics = {
  totalSpend: { value: 2450000, target: 2500000 },
  savings: { value: 245000, target: 200000 },
  ordersThisMonth: { value: 156, target: 170 },
  avgCycleTime: { value: 4.2, target: 5.0 },
  supplierCount: { value: 48, target: 50 },
  pendingApprovals: { value: 12, urgent: 3 },
  overdueOrders: { value: 5, critical: 2 },
  contractCompliance: { value: 87, target: 90 }
};

// Previous period data (for comparison)
const previousPeriodMetrics = {
  totalSpend: { value: 2178000 },
  savings: { value: 207000 },
  ordersThisMonth: { value: 165 },
  avgCycleTime: { value: 4.95 },
  supplierCount: { value: 44 },
  pendingApprovals: { value: 15 },
  overdueOrders: { value: 8 },
  contractCompliance: { value: 82.8 }
};

// Calculate changes
const calculateChange = (current: number, previous: number) => {
  return ((current - previous) / previous) * 100;
};

const executiveMetrics = {
  totalSpend: { 
    value: currentPeriodMetrics.totalSpend.value, 
    previousValue: previousPeriodMetrics.totalSpend.value,
    change: calculateChange(currentPeriodMetrics.totalSpend.value, previousPeriodMetrics.totalSpend.value), 
    target: currentPeriodMetrics.totalSpend.target 
  },
  savings: { 
    value: currentPeriodMetrics.savings.value, 
    previousValue: previousPeriodMetrics.savings.value,
    change: calculateChange(currentPeriodMetrics.savings.value, previousPeriodMetrics.savings.value), 
    target: currentPeriodMetrics.savings.target 
  },
  ordersThisMonth: { 
    value: currentPeriodMetrics.ordersThisMonth.value, 
    previousValue: previousPeriodMetrics.ordersThisMonth.value,
    change: calculateChange(currentPeriodMetrics.ordersThisMonth.value, previousPeriodMetrics.ordersThisMonth.value), 
    target: currentPeriodMetrics.ordersThisMonth.target 
  },
  avgCycleTime: { 
    value: currentPeriodMetrics.avgCycleTime.value, 
    previousValue: previousPeriodMetrics.avgCycleTime.value,
    change: calculateChange(currentPeriodMetrics.avgCycleTime.value, previousPeriodMetrics.avgCycleTime.value), 
    target: currentPeriodMetrics.avgCycleTime.target 
  },
  supplierCount: { 
    value: currentPeriodMetrics.supplierCount.value, 
    previousValue: previousPeriodMetrics.supplierCount.value,
    change: calculateChange(currentPeriodMetrics.supplierCount.value, previousPeriodMetrics.supplierCount.value), 
    target: currentPeriodMetrics.supplierCount.target 
  },
  pendingApprovals: { 
    value: currentPeriodMetrics.pendingApprovals.value, 
    previousValue: previousPeriodMetrics.pendingApprovals.value,
    change: calculateChange(currentPeriodMetrics.pendingApprovals.value, previousPeriodMetrics.pendingApprovals.value), 
    urgent: currentPeriodMetrics.pendingApprovals.urgent 
  },
  overdueOrders: { 
    value: currentPeriodMetrics.overdueOrders.value, 
    previousValue: previousPeriodMetrics.overdueOrders.value,
    change: calculateChange(currentPeriodMetrics.overdueOrders.value, previousPeriodMetrics.overdueOrders.value), 
    critical: currentPeriodMetrics.overdueOrders.critical 
  },
  contractCompliance: { 
    value: currentPeriodMetrics.contractCompliance.value, 
    previousValue: previousPeriodMetrics.contractCompliance.value,
    change: calculateChange(currentPeriodMetrics.contractCompliance.value, previousPeriodMetrics.contractCompliance.value), 
    target: currentPeriodMetrics.contractCompliance.target 
  }
};

// Current period trend
const monthlyTrend = [
  { month: 'Jul', spend: 180000, savings: 18000, orders: 120 },
  { month: 'Ago', spend: 220000, savings: 24000, orders: 145 },
  { month: 'Set', spend: 195000, savings: 21000, orders: 132 },
  { month: 'Out', spend: 245000, savings: 28000, orders: 158 },
  { month: 'Nov', spend: 210000, savings: 25000, orders: 148 },
  { month: 'Dez', spend: 235000, savings: 30000, orders: 156 }
];

// Previous period trend
const previousMonthlyTrend = [
  { month: 'Jan', spend: 165000, savings: 14000, orders: 108 },
  { month: 'Fev', spend: 185000, savings: 17000, orders: 125 },
  { month: 'Mar', spend: 175000, savings: 16000, orders: 118 },
  { month: 'Abr', spend: 210000, savings: 20000, orders: 142 },
  { month: 'Mai', spend: 195000, savings: 19000, orders: 135 },
  { month: 'Jun', spend: 205000, savings: 21000, orders: 140 }
];

// Combined trend for comparison chart
const comparisonTrend = monthlyTrend.map((current, index) => ({
  month: current.month,
  currentSpend: current.spend,
  previousSpend: previousMonthlyTrend[index]?.spend || 0,
  currentSavings: current.savings,
  previousSavings: previousMonthlyTrend[index]?.savings || 0,
  currentOrders: current.orders,
  previousOrders: previousMonthlyTrend[index]?.orders || 0
}));

// Sparkline trend data extracted from monthly trends
const trendDataSets = {
  spend: monthlyTrend.map(m => m.spend),
  savings: monthlyTrend.map(m => m.savings),
  orders: monthlyTrend.map(m => m.orders),
  cycleTime: [5.2, 4.9, 4.8, 4.5, 4.3, 4.2],
  suppliers: [42, 44, 45, 46, 47, 48],
  pendingApprovals: [18, 15, 14, 16, 13, 12],
  overdueOrders: [10, 8, 7, 6, 5, 5],
  compliance: [82, 84, 85, 86, 86, 87]
};

const categorySpend = [
  { name: 'Mochilas', value: 450000, previousValue: 380000, percentage: 18.4, orders: 45, supplier: 'XBZ Brindes' },
  { name: 'Canetas', value: 380000, previousValue: 350000, percentage: 15.5, orders: 120, supplier: 'Stricker' },
  { name: 'Camisetas', value: 320000, previousValue: 290000, percentage: 13.1, orders: 38, supplier: 'Asia Import' },
  { name: 'Bonés', value: 280000, previousValue: 260000, percentage: 11.4, orders: 52, supplier: 'Só Marcas' },
  { name: 'Cadernos', value: 250000, previousValue: 230000, percentage: 10.2, orders: 65, supplier: 'Spot Gifts' },
  { name: 'Outros', value: 770000, previousValue: 668000, percentage: 31.4, orders: 180, supplier: 'XBZ Brindes' }
];

const topSuppliers = [
  { name: 'XBZ Brindes', spend: 420000, previousSpend: 360000, orders: 45, savings: 42000, compliance: 94, categories: ['Mochilas', 'Outros'] },
  { name: 'Stricker', spend: 380000, previousSpend: 340000, orders: 38, savings: 35000, compliance: 91, categories: ['Canetas'] },
  { name: 'Asia Import', spend: 320000, previousSpend: 295000, orders: 52, savings: 28000, compliance: 88, categories: ['Camisetas'] },
  { name: 'Só Marcas', spend: 280000, previousSpend: 250000, orders: 41, savings: 25000, compliance: 85, categories: ['Bonés'] },
  { name: 'Spot Gifts', spend: 250000, previousSpend: 220000, orders: 35, savings: 22000, compliance: 82, categories: ['Cadernos'] }
];

const buyerPerformance = [
  { name: 'Ana Silva', orders: 45, previousOrders: 38, savings: 52000, previousSavings: 42000, avgCycle: 3.8, compliance: 96, categories: ['Mochilas', 'Canetas'], suppliers: ['XBZ Brindes', 'Stricker'] },
  { name: 'Carlos Santos', orders: 38, previousOrders: 35, savings: 41000, previousSavings: 35000, avgCycle: 4.2, compliance: 92, categories: ['Camisetas', 'Bonés'], suppliers: ['Asia Import', 'Só Marcas'] },
  { name: 'Maria Costa', orders: 42, previousOrders: 40, savings: 38000, previousSavings: 34000, avgCycle: 4.5, compliance: 89, categories: ['Cadernos', 'Outros'], suppliers: ['Spot Gifts', 'XBZ Brindes'] },
  { name: 'João Pereira', orders: 31, previousOrders: 28, savings: 28000, previousSavings: 24000, avgCycle: 5.1, compliance: 85, categories: ['Mochilas', 'Camisetas'], suppliers: ['XBZ Brindes', 'Asia Import'] }
];

const pendingItems = [
  { id: 'APR-001', type: 'Aprovação', item: 'PO #2638 - Mochilas', value: 45000, days: 2, priority: 'high', category: 'Mochilas', supplier: 'XBZ Brindes' },
  { id: 'APR-002', type: 'Aprovação', item: 'PO #2641 - Camisetas', value: 32000, days: 1, priority: 'critical', category: 'Camisetas', supplier: 'Asia Import' },
  { id: 'PAY-001', type: 'Pagamento', item: 'NF 12345 - XBZ Brindes', value: 28000, days: 3, priority: 'medium', category: 'Outros', supplier: 'XBZ Brindes' },
  { id: 'ORD-001', type: 'Pedido Atrasado', item: 'PO #2612 - Canetas', value: 15000, days: 5, priority: 'critical', category: 'Canetas', supplier: 'Stricker' },
  { id: 'APR-003', type: 'Aprovação', item: 'PO #2645 - Bonés', value: 18000, days: 0, priority: 'high', category: 'Bonés', supplier: 'Só Marcas' }
];

// Extract unique categories and suppliers for filters
const allCategories = categorySpend.map(c => c.name);
const allSuppliers = topSuppliers.map(s => s.name);

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--muted))'];

interface DrillDownData {
  type: 'category' | 'supplier' | 'buyer' | 'pending';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any; // Union of category/supplier/buyer/pending drill-down data shapes
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
  previousValue,
  change, 
  target,
  icon: Icon, 
  format = 'number',
  onClick,
  urgent,
  critical,
  showComparison,
  invertChange = false,
  trendData
}: { 
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
}) => {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;
  const targetProgress = target ? (value / target) * 100 : null;
  const isAboveTarget = target && value >= target;
  
  // For metrics like cycle time and overdue orders, negative change is good
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

export const ExecutiveDashboard = () => {
  const [drillDown, setDrillDown] = useState<DrillDownData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('6m');
  const [showComparison, setShowComparison] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');

  // Real data from Supabase
  const { metrics: realMetrics, spendByCategory: realSpendByCategory, topSuppliers: realTopSuppliers, loading: realDataLoading } = useExecutiveDashboardData();

  // Use real data when available, fall back to mock data
  const activeMetrics = useMemo(() => {
    if (realDataLoading) return { ...executiveMetrics, savingsPercent: 10.0 };
    const rm = realMetrics;
    return {
      totalSpend: { 
        value: rm.totalSpend.value || executiveMetrics.totalSpend.value, 
        previousValue: executiveMetrics.totalSpend.previousValue,
        change: rm.totalSpend.value > 0 ? calculateChange(rm.totalSpend.value, executiveMetrics.totalSpend.previousValue) : executiveMetrics.totalSpend.change,
        target: rm.totalSpend.target || executiveMetrics.totalSpend.target
      },
      savings: { 
        value: rm.savings.value || executiveMetrics.savings.value, 
        previousValue: executiveMetrics.savings.previousValue,
        change: rm.savings.value > 0 ? calculateChange(rm.savings.value, executiveMetrics.savings.previousValue) : executiveMetrics.savings.change,
        target: rm.savings.target || executiveMetrics.savings.target
      },
      savingsPercent: rm.savingsPercent,
      ordersThisMonth: { 
        value: rm.ordersThisMonth.value || executiveMetrics.ordersThisMonth.value, 
        previousValue: executiveMetrics.ordersThisMonth.previousValue,
        change: rm.ordersThisMonth.value > 0 ? calculateChange(rm.ordersThisMonth.value, executiveMetrics.ordersThisMonth.previousValue) : executiveMetrics.ordersThisMonth.change,
        target: rm.ordersThisMonth.target || executiveMetrics.ordersThisMonth.target
      },
      avgCycleTime: { 
        value: rm.avgCycleTime.value || executiveMetrics.avgCycleTime.value, 
        previousValue: executiveMetrics.avgCycleTime.previousValue,
        change: rm.avgCycleTime.value > 0 ? calculateChange(rm.avgCycleTime.value, executiveMetrics.avgCycleTime.previousValue) : executiveMetrics.avgCycleTime.change,
        target: rm.avgCycleTime.target || executiveMetrics.avgCycleTime.target
      },
      supplierCount: { 
        value: rm.supplierCount.value || executiveMetrics.supplierCount.value, 
        previousValue: executiveMetrics.supplierCount.previousValue,
        change: rm.supplierCount.value > 0 ? calculateChange(rm.supplierCount.value, executiveMetrics.supplierCount.previousValue) : executiveMetrics.supplierCount.change,
        target: rm.supplierCount.target || executiveMetrics.supplierCount.target
      },
      pendingApprovals: { 
        value: rm.pendingApprovals.value, 
        previousValue: executiveMetrics.pendingApprovals.previousValue,
        change: calculateChange(rm.pendingApprovals.value || 1, executiveMetrics.pendingApprovals.previousValue || 1),
        urgent: rm.pendingApprovals.urgent
      },
      overdueOrders: { 
        value: rm.overdueOrders.value, 
        previousValue: executiveMetrics.overdueOrders.previousValue,
        change: calculateChange(rm.overdueOrders.value || 1, executiveMetrics.overdueOrders.previousValue || 1),
        critical: rm.overdueOrders.critical
      },
      contractCompliance: { 
        value: rm.contractCompliance.value || executiveMetrics.contractCompliance.value, 
        previousValue: executiveMetrics.contractCompliance.previousValue,
        change: rm.contractCompliance.value > 0 ? calculateChange(rm.contractCompliance.value, executiveMetrics.contractCompliance.previousValue) : executiveMetrics.contractCompliance.change,
        target: rm.contractCompliance.target || executiveMetrics.contractCompliance.target
      }
    };
  }, [realMetrics, realDataLoading]);
  
  // Realtime subscriptions
  useRealtimeSubscription({
    tables: ['pedidos', 'solicitacoes', 'cotacoes', 'pagamentos'],
  });

  // Filter favorites hook
  const {
    favorites,
    loading: favoritesLoading,
    saveFavorite,
    deleteFavorite,
    setAsDefault,
    getDefaultFilter
  } = useDashboardFilters();

  // Apply default filter on load
  const [hasAppliedDefault, setHasAppliedDefault] = useState(false);
  
  useEffect(() => {
    if (hasAppliedDefault || favorites.length === 0) return;
    
    const defaultFilter = getDefaultFilter();
    if (defaultFilter) {
      setSelectedCategory(defaultFilter.category_filter);
      setSelectedSupplier(defaultFilter.supplier_filter);
      setSelectedPeriod(defaultFilter.period_filter);
      setShowComparison(defaultFilter.show_comparison);
    }
    setHasAppliedDefault(true);
  }, [favorites.length, getDefaultFilter, hasAppliedDefault]);

  const applyFilter = (filter: DashboardFilter) => {
    setSelectedCategory(filter.category_filter);
    setSelectedSupplier(filter.supplier_filter);
    setSelectedPeriod(filter.period_filter);
    setShowComparison(filter.show_comparison);
  };

  const currentFilters = {
    category: selectedCategory,
    supplier: selectedSupplier,
    period: selectedPeriod,
    showComparison
  };

  // Filter data based on selected category and supplier
  const filteredCategorySpend = useMemo(() => {
    let data = categorySpend;
    if (selectedCategory !== 'all') {
      data = data.filter(c => c.name === selectedCategory);
    }
    if (selectedSupplier !== 'all') {
      data = data.filter(c => c.supplier === selectedSupplier);
    }
    return data;
  }, [selectedCategory, selectedSupplier]);

  const filteredSuppliers = useMemo(() => {
    let data = topSuppliers;
    if (selectedSupplier !== 'all') {
      data = data.filter(s => s.name === selectedSupplier);
    }
    if (selectedCategory !== 'all') {
      data = data.filter(s => s.categories.includes(selectedCategory));
    }
    return data;
  }, [selectedCategory, selectedSupplier]);

  const filteredBuyers = useMemo(() => {
    let data = buyerPerformance;
    if (selectedCategory !== 'all') {
      data = data.filter(b => b.categories.includes(selectedCategory));
    }
    if (selectedSupplier !== 'all') {
      data = data.filter(b => b.suppliers.includes(selectedSupplier));
    }
    return data;
  }, [selectedCategory, selectedSupplier]);

  const filteredPendingItems = useMemo(() => {
    let data = pendingItems;
    if (selectedCategory !== 'all') {
      data = data.filter(p => p.category === selectedCategory);
    }
    if (selectedSupplier !== 'all') {
      data = data.filter(p => p.supplier === selectedSupplier);
    }
    return data;
  }, [selectedCategory, selectedSupplier]);

  // Calculate filtered metrics
  const filteredMetrics = useMemo(() => {
    const totalSpend = filteredCategorySpend.reduce((acc, c) => acc + c.value, 0);
    const previousSpend = filteredCategorySpend.reduce((acc, c) => acc + c.previousValue, 0);
    const totalOrders = filteredCategorySpend.reduce((acc, c) => acc + c.orders, 0);
    const totalSavings = filteredSuppliers.reduce((acc, s) => acc + s.savings, 0);
    
    return {
      totalSpend,
      previousSpend,
      totalOrders,
      totalSavings,
      spendChange: previousSpend > 0 ? ((totalSpend - previousSpend) / previousSpend) * 100 : 0
    };
  }, [filteredCategorySpend, filteredSuppliers]);

  const hasActiveFilters = selectedCategory !== 'all' || selectedSupplier !== 'all';

  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedSupplier('all');
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCategoryDrillDown = (category: any) => {
    setDrillDown({ type: 'category', data: category });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSupplierDrillDown = (supplier: any) => {
    setDrillDown({ type: 'supplier', data: supplier });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBuyerDrillDown = (buyer: any) => {
    setDrillDown({ type: 'buyer', data: buyer });
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case '1m': return 'Último Mês';
      case '3m': return 'Últimos 3 Meses';
      case '6m': return 'Últimos 6 Meses';
      case '1y': return 'Último Ano';
      default: return 'Período Atual';
    }
  };

  const getPreviousPeriodLabel = () => {
    switch (selectedPeriod) {
      case '1m': return 'Mês Anterior';
      case '3m': return '3 Meses Anteriores';
      case '6m': return '6 Meses Anteriores';
      case '1y': return 'Ano Anterior';
      default: return 'Período Anterior';
    }
  };

  return (
    <div className="space-y-6" data-tour="dashboard-content">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Executivo</h2>
          <p className="text-muted-foreground">Visão consolidada de compras - Atualizado em tempo real</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {/* Comparison Toggle */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card">
            <GitCompare className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="comparison-mode" className="text-sm cursor-pointer">
              Comparar Períodos
            </Label>
            <Switch
              id="comparison-mode"
              checked={showComparison}
              onCheckedChange={setShowComparison}
            />
          </div>
          
          {/* Period Selector */}
          <div className="flex items-center gap-1">
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
      </div>

      {/* Filters Row */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            
            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Categoria:</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[160px] h-9 bg-background">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">Todas</SelectItem>
                  {allCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Supplier Filter */}
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Fornecedor:</Label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger className="w-[160px] h-9 bg-background">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">Todos</SelectItem>
                  {allSuppliers.map(sup => (
                    <SelectItem key={sup} value={sup}>{sup}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}

            {/* Filter Favorites Manager */}
            <div className="ml-auto">
              <FilterFavoritesManager
                favorites={favorites}
                currentFilters={currentFilters}
                onSave={saveFavorite}
                onDelete={deleteFavorite}
                onSetDefault={setAsDefault}
                onApply={applyFilter}
                loading={favoritesLoading}
              />
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t">
              <span className="text-xs text-muted-foreground">Ativos:</span>
              {selectedCategory !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {selectedCategory}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedCategory('all')} />
                </Badge>
              )}
              {selectedSupplier !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {selectedSupplier}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedSupplier('all')} />
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Period Comparison Summary */}
      {showComparison && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <GitCompare className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-primary">Modo Comparativo Ativo</p>
                <p className="text-sm text-muted-foreground">
                  Comparando <span className="font-medium">{getPeriodLabel()}</span> vs <span className="font-medium">{getPreviousPeriodLabel()}</span>
                </p>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span>Atual</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground/50" />
                  <span>Anterior</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtered Summary */}
      {hasActiveFilters && (
        <Card className="border-chart-2/30 bg-chart-2/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Filter className="h-5 w-5 text-chart-2" />
                <div>
                  <p className="font-medium text-chart-2">Dados Filtrados</p>
                  <p className="text-sm text-muted-foreground">
                    Exibindo resultados para 
                    {selectedCategory !== 'all' && <span className="font-medium"> {selectedCategory}</span>}
                    {selectedCategory !== 'all' && selectedSupplier !== 'all' && ' de'}
                    {selectedSupplier !== 'all' && <span className="font-medium"> {selectedSupplier}</span>}
                  </p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Spend Filtrado</p>
                  <p className="font-bold text-lg">{formatCurrency(filteredMetrics.totalSpend)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Pedidos</p>
                  <p className="font-bold text-lg">{filteredMetrics.totalOrders}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Variação</p>
                  <p className={`font-bold text-lg ${filteredMetrics.spendChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {filteredMetrics.spendChange >= 0 ? '+' : ''}{filteredMetrics.spendChange.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Critical Alerts Banner */}
      {(activeMetrics.pendingApprovals.urgent > 0 || activeMetrics.overdueOrders.critical > 0) && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div className="flex-1">
                <p className="font-medium text-destructive">Atenção Requerida</p>
                <p className="text-sm text-muted-foreground">
                  {activeMetrics.pendingApprovals.urgent} aprovações urgentes e {activeMetrics.overdueOrders.critical} pedidos críticos aguardando ação
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => setDrillDown({ type: 'pending', data: filteredPendingItems })}>
                Ver Detalhes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Purchase Climate Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <PurchaseClimateWidget />
        </div>
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            title="Spend Total"
            value={activeMetrics.totalSpend.value}
            previousValue={activeMetrics.totalSpend.previousValue}
            change={activeMetrics.totalSpend.change}
            target={activeMetrics.totalSpend.target}
            icon={DollarSign}
            format="currency"
            showComparison={showComparison}
            trendData={trendDataSets.spend}
          />
          <MetricCard
            title="Economia Realizada"
            value={activeMetrics.savings.value}
            previousValue={activeMetrics.savings.previousValue}
            change={activeMetrics.savings.change}
            target={activeMetrics.savings.target}
            icon={TrendingUp}
            format="currency"
            showComparison={showComparison}
            trendData={trendDataSets.savings}
          />
          <MetricCard
            title="Pedidos no Mês"
            value={activeMetrics.ordersThisMonth.value}
            previousValue={activeMetrics.ordersThisMonth.previousValue}
            change={activeMetrics.ordersThisMonth.change}
            target={activeMetrics.ordersThisMonth.target}
            icon={ShoppingCart}
            showComparison={showComparison}
            trendData={trendDataSets.orders}
          />
          <MetricCard
            title="Tempo Médio Ciclo"
            value={activeMetrics.avgCycleTime.value}
            previousValue={activeMetrics.avgCycleTime.previousValue}
            change={activeMetrics.avgCycleTime.change}
            target={activeMetrics.avgCycleTime.target}
            icon={Clock}
            format="days"
            showComparison={showComparison}
            invertChange={true}
            trendData={trendDataSets.cycleTime}
          />
        </div>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Saving %"
          value={activeMetrics.savingsPercent}
          change={activeMetrics.savingsPercent > 10 ? activeMetrics.savingsPercent - 10 : 0}
          target={15}
          icon={Zap}
          format="percent"
          showComparison={showComparison}
          trendData={trendDataSets.savings.map((s, i) => (trendDataSets.spend[i] > 0 ? (s / trendDataSets.spend[i]) * 100 : 0))}
        />
        <MetricCard
          title="Base de Fornecedores"
          value={activeMetrics.supplierCount.value}
          previousValue={activeMetrics.supplierCount.previousValue}
          change={activeMetrics.supplierCount.change}
          target={activeMetrics.supplierCount.target}
          icon={Users}
          showComparison={showComparison}
          trendData={trendDataSets.suppliers}
        />
        <MetricCard
          title="Aprovações Pendentes"
          value={activeMetrics.pendingApprovals.value}
          previousValue={activeMetrics.pendingApprovals.previousValue}
          change={activeMetrics.pendingApprovals.change}
          urgent={activeMetrics.pendingApprovals.urgent}
          icon={CheckCircle2}
          onClick={() => setDrillDown({ type: 'pending', data: filteredPendingItems })}
          showComparison={showComparison}
          invertChange={true}
          trendData={trendDataSets.pendingApprovals}
        />
        <MetricCard
          title="Pedidos Atrasados"
          value={activeMetrics.overdueOrders.value}
          previousValue={activeMetrics.overdueOrders.previousValue}
          change={activeMetrics.overdueOrders.change}
          critical={activeMetrics.overdueOrders.critical}
          icon={XCircle}
          showComparison={showComparison}
          invertChange={true}
          trendData={trendDataSets.overdueOrders}
        />
        <MetricCard
          title="Compliance Contratos"
          value={activeMetrics.contractCompliance.value}
          previousValue={activeMetrics.contractCompliance.previousValue}
          change={activeMetrics.contractCompliance.change}
          target={activeMetrics.contractCompliance.target}
          icon={Target}
          format="percent"
          showComparison={showComparison}
          trendData={trendDataSets.compliance}
        />
      </div>

      {/* Charts Row */}
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
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name.includes('current') || name.includes('Atual') ? 'Atual' : 'Anterior'
                    ]}
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="currentSpend" 
                    name="Spend Atual" 
                    stroke="hsl(var(--primary))" 
                    fill="url(#currentSpendGradient)" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="previousSpend" 
                    name="Spend Anterior" 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeDasharray="5 5"
                    dot={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Bar 
                    dataKey="currentSavings" 
                    name="Savings Atual" 
                    fill="hsl(var(--chart-2))" 
                    radius={[4, 4, 0, 0]}
                    opacity={0.8}
                  />
                </ComposedChart>
              ) : (
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
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Spend Comparison */}
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
                  <XAxis type="number" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} className="text-xs" />
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
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    onClick={(data) => handleCategoryDrillDown(data)}
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
              {filteredSuppliers.length > 0 ? filteredSuppliers.map((supplier, index) => {
                const spendChange = ((supplier.spend - supplier.previousSpend) / supplier.previousSpend) * 100;
                return (
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
                      {showComparison ? (
                        <p className={`text-xs flex items-center justify-end gap-1 ${spendChange > 0 ? 'text-success' : 'text-destructive'}`}>
                          {spendChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {Math.abs(spendChange).toFixed(1)}% vs anterior
                        </p>
                      ) : (
                        <p className="text-sm text-success">+{formatCurrency(supplier.savings)}</p>
                      )}
                    </div>
                    <Badge variant={supplier.compliance >= 90 ? 'default' : supplier.compliance >= 85 ? 'secondary' : 'destructive'}>
                      {supplier.compliance}%
                    </Badge>
                  </div>
                );
              }) : (
                <p className="text-center text-muted-foreground py-4">Nenhum fornecedor encontrado para os filtros selecionados</p>
              )}
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
              {filteredBuyers.length > 0 ? filteredBuyers.map((buyer, index) => {
                const savingsChange = ((buyer.savings - buyer.previousSavings) / buyer.previousSavings) * 100;
                const ordersChange = ((buyer.orders - buyer.previousOrders) / buyer.previousOrders) * 100;
                return (
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
                      <p className="text-sm text-muted-foreground">
                        {buyer.orders} pedidos 
                        {showComparison && (
                          <span className={ordersChange > 0 ? 'text-success' : 'text-destructive'}>
                            {' '}({ordersChange > 0 ? '+' : ''}{ordersChange.toFixed(0)}%)
                          </span>
                        )}
                        {' '}• {buyer.avgCycle} dias
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-success">{formatCurrency(buyer.savings)}</p>
                      {showComparison ? (
                        <p className={`text-xs flex items-center justify-end gap-1 ${savingsChange > 0 ? 'text-success' : 'text-destructive'}`}>
                          {savingsChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {Math.abs(savingsChange).toFixed(1)}%
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">economia</p>
                      )}
                    </div>
                    <Badge variant={buyer.compliance >= 95 ? 'default' : buyer.compliance >= 90 ? 'secondary' : 'outline'}>
                      {buyer.compliance}%
                    </Badge>
                  </div>
                );
              }) : (
                <p className="text-center text-muted-foreground py-4">Nenhum comprador encontrado para os filtros selecionados</p>
              )}
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
            {filteredPendingItems.length > 0 ? filteredPendingItems.slice(0, 6).map((item) => (
              <div 
                key={item.id}
                className={`p-4 rounded-lg border ${
                  item.priority === 'critical' ? 'border-destructive bg-destructive/5' :
                  item.priority === 'high' ? 'border-amber-500 bg-warning/5' :
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
            )) : (
              <p className="text-center text-muted-foreground py-4 col-span-3">Nenhuma ação pendente para os filtros selecionados</p>
            )}
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
                    <p className="text-xl font-bold text-success">{formatCurrency(drillDown.data.savings)}</p>
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
                    <p className="text-xl font-bold text-success">{formatCurrency(drillDown.data.savings)}</p>
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
                      item.priority === 'high' ? 'border-amber-500 bg-warning/5' :
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
