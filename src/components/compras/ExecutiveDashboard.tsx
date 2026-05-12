import { useState, useMemo, useEffect, useRef } from 'react';
import { useAccountFilters } from '@/hooks/useAccountFilters';
import { useClearFiltersFlow } from '@/hooks/useClearFiltersFlow';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDashboardFilters, DashboardFilter } from '@/hooks/useDashboardFilters';
import { PurchaseClimateWidget } from './PurchaseClimateWidget';
import {
  DollarSign, TrendingUp, ShoppingCart, Clock, Users,
  CheckCircle2, XCircle, Target, Zap, AlertTriangle,
  GitCompare, Filter, X, Download, FileSpreadsheet
} from 'lucide-react';
import { useExecutiveDashboardData } from '@/hooks/useExecutiveDashboardData';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { exportToCSV } from '@/lib/exportUtils';
import { toast } from '@/hooks/use-toast';


import {
  executiveMetrics, calculateChange, trendDataSets,
  categorySpend, topSuppliers, buyerPerformance, pendingItems,
  formatCurrency, type DrillDownData
} from './executive/executiveDashboardData';
import { ExecutiveMetricCard } from './executive/ExecutiveMetricCard';
import { ExecutiveFiltersBar } from './executive/ExecutiveFiltersBar';
import { ExecutiveChartsRow } from './executive/ExecutiveChartsRow';
import { ExecutiveTablesRow } from './executive/ExecutiveTablesRow';
import { ExecutivePendingActions } from './executive/ExecutivePendingActions';
import { ExecutiveDrillDownModal } from './executive/ExecutiveDrillDownModal';
import { PriceVarianceAnalysis } from './executive/PriceVarianceAnalysis';
import { KraljicMatrix } from './executive/KraljicMatrix';
import { ExecutiveAIInsights } from './executive/ExecutiveAIInsights';

export const ExecutiveDashboard = () => {
  const [drillDown, setDrillDown] = useState<DrillDownData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('6m');
  const [showComparison, setShowComparison] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');

  const { 
    metrics: realMetrics, 
    spendByCategory: realSpendByCategory, 
    topSuppliers: realTopSuppliers, 
    loading: realDataLoading 
  } = useExecutiveDashboardData();

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
      },
      maverickSpend: rm.maverickSpend,
      tailSpend: rm.tailSpend
    };
  }, [realMetrics, realDataLoading]);

  useRealtimeSubscription({ tables: ['pedidos', 'solicitacoes', 'cotacoes', 'pagamentos'] });

  const { favorites, loading: favoritesLoading, saveFavorite, deleteFavorite, setAsDefault, getDefaultFilter } = useDashboardFilters();

  const [hasAppliedDefault, setHasAppliedDefault] = useState(false);
  useEffect(() => {
    if (hasAppliedDefault || favorites.length === 0) return;
    const defaultFilter = getDefaultFilter();
    if (defaultFilter) {
      setSelectedCategory(defaultFilter.category_filter ?? 'all');
      setSelectedSupplier(defaultFilter.supplier_filter ?? 'all');
      setSelectedPeriod(defaultFilter.period_filter ?? '6m');
      setShowComparison(defaultFilter.show_comparison ?? true);
    }
    setHasAppliedDefault(true);
  }, [favorites.length, getDefaultFilter, hasAppliedDefault]);

  const applyFilter = (filter: DashboardFilter) => {
    setSelectedCategory(filter.category_filter ?? 'all');
    setSelectedSupplier(filter.supplier_filter ?? 'all');
    setSelectedPeriod(filter.period_filter ?? '6m');
    setShowComparison(filter.show_comparison ?? true);
  };

  const currentFilters = { category: selectedCategory, supplier: selectedSupplier, period: selectedPeriod, showComparison };
  const hasActiveFilters = selectedCategory !== 'all' || selectedSupplier !== 'all';

  // Account-based persistence
  const accountDefaults = useMemo(() => ({
    selectedCategory: 'all', selectedSupplier: 'all', selectedPeriod: '6m', showComparison: true,
  }), []);
  const acct = useAccountFilters('executive-dashboard', accountDefaults);
  const hydratedAcctRef = useRef(false);
  useEffect(() => {
    if (acct.loading || hydratedAcctRef.current) return;
    hydratedAcctRef.current = true;
    setSelectedCategory(acct.filters.selectedCategory);
    setSelectedSupplier(acct.filters.selectedSupplier);
    setSelectedPeriod(acct.filters.selectedPeriod);
    setShowComparison(acct.filters.showComparison);
  }, [acct.loading, acct.filters]);
  useEffect(() => {
    if (!hydratedAcctRef.current) return;
    acct.patchFilters({ selectedCategory, selectedSupplier, selectedPeriod, showComparison });
  }, [selectedCategory, selectedSupplier, selectedPeriod, showComparison, acct]);

  const clearFlow = useClearFiltersFlow<{
    selectedCategory: string; selectedSupplier: string; selectedPeriod: string; showComparison: boolean;
  }>({
    scope: 'executive-dashboard',
    screenLabel: 'Dashboard Executivo',
    describeActiveFilters: () => [
      { key: 'selectedCategory', label: 'Categoria', value: selectedCategory },
      { key: 'selectedSupplier', label: 'Fornecedor', value: selectedSupplier },
    ],
    takeSnapshot: () => ({ selectedCategory, selectedSupplier, selectedPeriod, showComparison }),
    applySnapshot: (s) => {
      setSelectedCategory(s.selectedCategory); setSelectedSupplier(s.selectedSupplier);
      setSelectedPeriod(s.selectedPeriod); setShowComparison(s.showComparison);
    },
    performClear: async () => {
      setSelectedCategory('all'); setSelectedSupplier('all');
      return acct.clearFilters();
    },
  });
  const clearFilters = clearFlow.requestClear;

  const filteredCategorySpend = useMemo(() => {
    let data = categorySpend;
    if (selectedCategory !== 'all') data = data.filter(c => c.name === selectedCategory);
    if (selectedSupplier !== 'all') data = data.filter(c => c.supplier === selectedSupplier);
    return data;
  }, [selectedCategory, selectedSupplier]);

  const filteredSuppliers = useMemo(() => {
    let data = topSuppliers;
    if (selectedSupplier !== 'all') data = data.filter(s => s.name === selectedSupplier);
    if (selectedCategory !== 'all') data = data.filter(s => s.categories.includes(selectedCategory));
    return data;
  }, [selectedCategory, selectedSupplier]);

  const filteredBuyers = useMemo(() => {
    let data = buyerPerformance;
    if (selectedCategory !== 'all') data = data.filter(b => b.categories.includes(selectedCategory));
    if (selectedSupplier !== 'all') data = data.filter(b => b.suppliers.includes(selectedSupplier));
    return data;
  }, [selectedCategory, selectedSupplier]);

  const filteredPendingItems = useMemo(() => {
    let data = pendingItems;
    if (selectedCategory !== 'all') data = data.filter(p => p.category === selectedCategory);
    if (selectedSupplier !== 'all') data = data.filter(p => p.supplier === selectedSupplier);
    return data;
  }, [selectedCategory, selectedSupplier]);

  const filteredMetrics = useMemo(() => {
    const totalSpend = filteredCategorySpend.reduce((acc, c) => acc + c.value, 0);
    const previousSpend = filteredCategorySpend.reduce((acc, c) => acc + c.previousValue, 0);
    const totalOrders = filteredCategorySpend.reduce((acc, c) => acc + c.orders, 0);
    const totalSavings = filteredSuppliers.reduce((acc, s) => acc + s.savings, 0);
    return { totalSpend, previousSpend, totalOrders, totalSavings, spendChange: previousSpend > 0 ? ((totalSpend - previousSpend) / previousSpend) * 100 : 0 };
  }, [filteredCategorySpend, filteredSuppliers]);

  const getPeriodLabel = () => {
    const m: Record<string, string> = { '1m': 'Último Mês', '3m': 'Últimos 3 Meses', '6m': 'Últimos 6 Meses', '1y': 'Último Ano' };
    return m[selectedPeriod] || 'Período Atual';
  };
  const getPreviousPeriodLabel = () => {
    const m: Record<string, string> = { '1m': 'Mês Anterior', '3m': '3 Meses Anteriores', '6m': '6 Meses Anteriores', '1y': 'Ano Anterior' };
    return m[selectedPeriod] || 'Período Anterior';
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
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card">
            <GitCompare className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="comparison-mode" className="text-sm cursor-pointer">Comparar Períodos</Label>
            <Switch id="comparison-mode" checked={showComparison} onCheckedChange={setShowComparison} />
          </div>
          <div className="flex items-center gap-1">
            {['1m', '3m', '6m', '1y'].map(p => (
              <Button key={p} variant="outline" size="sm" onClick={() => setSelectedPeriod(p)}
                className={selectedPeriod === p ? 'bg-primary text-primary-foreground' : ''}>
                {p === '1y' ? '1A' : p.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <ExecutiveFiltersBar
        selectedCategory={selectedCategory}
        selectedSupplier={selectedSupplier}
        onCategoryChange={setSelectedCategory}
        onSupplierChange={setSelectedSupplier}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        favorites={favorites}
        currentFilters={currentFilters}
        onSave={saveFavorite}
        onDelete={deleteFavorite}
        onSetDefault={setAsDefault}
        onApply={applyFilter}
        favoritesLoading={favoritesLoading}
      />

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
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-primary" /><span>Atual</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-muted-foreground/50" /><span>Anterior</span></div>
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
                <div className="text-center"><p className="text-xs text-muted-foreground">Spend Filtrado</p><p className="font-bold text-lg">{formatCurrency(filteredMetrics.totalSpend)}</p></div>
                <div className="text-center"><p className="text-xs text-muted-foreground">Pedidos</p><p className="font-bold text-lg">{filteredMetrics.totalOrders}</p></div>
                <div className="text-center"><p className="text-xs text-muted-foreground">Variação</p><p className={`font-bold text-lg ${filteredMetrics.spendChange >= 0 ? 'text-success' : 'text-destructive'}`}>{filteredMetrics.spendChange >= 0 ? '+' : ''}{filteredMetrics.spendChange.toFixed(1)}%</p></div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Critical Alerts */}
      {(activeMetrics.pendingApprovals.urgent > 0 || activeMetrics.overdueOrders.critical > 0) && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div className="flex-1">
                <p className="font-medium text-destructive">Atenção Requerida</p>
                <p className="text-sm text-muted-foreground">{activeMetrics.pendingApprovals.urgent} aprovações urgentes e {activeMetrics.overdueOrders.critical} pedidos críticos</p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => setDrillDown({ type: 'pending', data: filteredPendingItems })}>Ver Detalhes</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights Section */}
      <ExecutiveAIInsights 
        metrics={activeMetrics} 
        spendByCategory={realSpendByCategory || []} 
        topSuppliers={realTopSuppliers || []}
        loading={realDataLoading}
      />

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1"><PurchaseClimateWidget /></div>
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExecutiveMetricCard title="Spend Total" value={activeMetrics.totalSpend.value} previousValue={activeMetrics.totalSpend.previousValue} change={activeMetrics.totalSpend.change} target={activeMetrics.totalSpend.target} icon={DollarSign} format="currency" showComparison={showComparison} trendData={trendDataSets.spend} delay={0} />
          <ExecutiveMetricCard title="Economia Realizada" value={activeMetrics.savings.value} previousValue={activeMetrics.savings.previousValue} change={activeMetrics.savings.change} target={activeMetrics.savings.target} icon={TrendingUp} format="currency" showComparison={showComparison} trendData={trendDataSets.savings} delay={1} />
          <ExecutiveMetricCard title="Pedidos no Mês" value={activeMetrics.ordersThisMonth.value} previousValue={activeMetrics.ordersThisMonth.previousValue} change={activeMetrics.ordersThisMonth.change} target={activeMetrics.ordersThisMonth.target} icon={ShoppingCart} showComparison={showComparison} trendData={trendDataSets.orders} delay={2} />
          <ExecutiveMetricCard title="Tempo Médio Ciclo" value={activeMetrics.avgCycleTime.value} previousValue={activeMetrics.avgCycleTime.previousValue} change={activeMetrics.avgCycleTime.change} target={activeMetrics.avgCycleTime.target} icon={Clock} format="days" showComparison={showComparison} invertChange trendData={trendDataSets.cycleTime} delay={3} />
        </div>
      </div>

      {/* Charts and Analysis */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <ExecutiveChartsRow 
            showComparison={showComparison} 
            filteredCategorySpend={filteredCategorySpend} 
            onCategoryDrillDown={(data) => setDrillDown({ type: 'category', data })} 
          />
        </div>
        <div className="xl:col-span-1 grid grid-cols-1 gap-6">
          <PriceVarianceAnalysis />
          <KraljicMatrix />
        </div>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <ExecutiveMetricCard title="Aderência Contrato" value={activeMetrics.contractCompliance.value} change={activeMetrics.contractCompliance.change} target={activeMetrics.contractCompliance.target} icon={Target} format="percent" showComparison={showComparison} />
        <ExecutiveMetricCard title="Maverick Spend" value={activeMetrics.maverickSpend?.value || 0} change={-2.4} subtitle={`${activeMetrics.maverickSpend?.percentage || 0}% do total`} icon={AlertTriangle} format="currency" showComparison={showComparison} invertChange />
        <ExecutiveMetricCard title="Tail Spend" value={activeMetrics.tailSpend?.value || 0} change={1.5} subtitle={`${activeMetrics.tailSpend?.percentage || 0}% do total`} icon={Zap} format="currency" showComparison={showComparison} />
        <ExecutiveMetricCard title="Saving %" value={activeMetrics.savingsPercent} change={activeMetrics.savingsPercent > 10 ? activeMetrics.savingsPercent - 10 : 0} target={15} icon={Zap} format="percent" showComparison={showComparison} trendData={trendDataSets.savings.map((s, i) => (trendDataSets.spend[i] > 0 ? (s / trendDataSets.spend[i]) * 100 : 0))} />
        <ExecutiveMetricCard title="Base de Fornecedores" value={activeMetrics.supplierCount.value} previousValue={activeMetrics.supplierCount.previousValue} change={activeMetrics.supplierCount.change} target={activeMetrics.supplierCount.target} icon={Users} showComparison={showComparison} trendData={trendDataSets.suppliers} />
      </div>

      <ExecutiveTablesRow filteredSuppliers={filteredSuppliers} filteredBuyers={filteredBuyers} showComparison={showComparison} onSupplierDrillDown={(s) => setDrillDown({ type: 'supplier', data: s })} onBuyerDrillDown={(b) => setDrillDown({ type: 'buyer', data: b })} />
      <ExecutivePendingActions items={filteredPendingItems} />
      <ExecutiveDrillDownModal drillDown={drillDown} onClose={() => setDrillDown(null)} />
      {clearFlow.ConfirmDialog}
    </div>
  );
};
