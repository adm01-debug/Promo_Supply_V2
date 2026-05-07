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
  GitCompare, Filter, X
} from 'lucide-react';
import { useExecutiveDashboardData } from '@/hooks/useExecutiveDashboardData';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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

export const ExecutiveDashboard = () => {
  const [drillDown, setDrillDown] = useState<DrillDownData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('6m');
  const [showComparison, setShowComparison] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');

  const { metrics: realMetrics, loading: realDataLoading } = useExecutiveDashboardData();

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8" 
      data-tour="dashboard-content"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">Dashboard Executivo</h2>
          <p className="text-muted-foreground font-medium">Visão consolidada de compras — Inteligência em tempo real</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl border-border/40 bg-card/50 backdrop-blur-sm shadow-sm ring-1 ring-black/5 dark:ring-white/5">
            <GitCompare className="h-4 w-4 text-primary" />
            <Label htmlFor="comparison-mode" className="text-sm font-bold cursor-pointer">Comparar Períodos</Label>
            <Switch id="comparison-mode" checked={showComparison} onCheckedChange={setShowComparison} />
          </div>
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/30 border border-border/40">
            {['1m', '3m', '6m', '1y'].map(p => (
              <Button 
                key={p} 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedPeriod(p)}
                className={cn(
                  "rounded-lg px-4 text-xs font-bold transition-all",
                  selectedPeriod === p ? 'bg-primary text-primary-foreground shadow-glow-primary/20 hover:bg-primary/90' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {p === '1y' ? '1A' : p.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
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
      </motion.div>

      {/* Comparison & Alerts */}
      <AnimatePresence>
        {(showComparison || hasActiveFilters || activeMetrics.pendingApprovals.urgent > 0 || activeMetrics.overdueOrders.critical > 0) && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {showComparison && (
              <Card className="border-primary/20 bg-primary/[0.03] backdrop-blur-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-primary/10"><GitCompare className="h-5 w-5 text-primary" /></div>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Comparativo</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-bold text-foreground">{getPeriodLabel()}</span> vs <span className="font-bold text-foreground">{getPreviousPeriodLabel()}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {hasActiveFilters && (
              <Card className="border-info/20 bg-info/[0.03] backdrop-blur-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-info/10"><Filter className="h-5 w-5 text-info" /></div>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-info">Dados Filtrados</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedCategory !== 'all' && selectedCategory}
                      {selectedCategory !== 'all' && selectedSupplier !== 'all' && ' | '}
                      {selectedSupplier !== 'all' && selectedSupplier}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {(activeMetrics.pendingApprovals.urgent > 0 || activeMetrics.overdueOrders.critical > 0) && (
              <Card className="border-destructive/20 bg-destructive/[0.03] backdrop-blur-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-destructive/10 animate-pulse"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-destructive">Atenção</p>
                    <p className="text-xs text-muted-foreground">
                      {activeMetrics.pendingApprovals.urgent} urgentes | {activeMetrics.overdueOrders.critical} críticos
                    </p>
                  </div>
                  <Button variant="destructive" size="sm" className="h-7 text-[10px] font-black px-2" onClick={() => setDrillDown({ type: 'pending', data: filteredPendingItems })}>VER</Button>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="lg:col-span-1 h-full">
          <PurchaseClimateWidget />
        </motion.div>
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExecutiveMetricCard title="Spend Total" value={activeMetrics.totalSpend.value} previousValue={activeMetrics.totalSpend.previousValue} change={activeMetrics.totalSpend.change} target={activeMetrics.totalSpend.target} icon={DollarSign} format="currency" showComparison={showComparison} trendData={trendDataSets.spend} />
          <ExecutiveMetricCard title="Economia Realizada" value={activeMetrics.savings.value} previousValue={activeMetrics.savings.previousValue} change={activeMetrics.savings.change} target={activeMetrics.savings.target} icon={TrendingUp} format="currency" showComparison={showComparison} trendData={trendDataSets.savings} />
          <ExecutiveMetricCard title="Pedidos no Mês" value={activeMetrics.ordersThisMonth.value} previousValue={activeMetrics.ordersThisMonth.previousValue} change={activeMetrics.ordersThisMonth.change} target={activeMetrics.ordersThisMonth.target} icon={ShoppingCart} showComparison={showComparison} trendData={trendDataSets.orders} />
          <ExecutiveMetricCard title="Tempo Médio Ciclo" value={activeMetrics.avgCycleTime.value} previousValue={activeMetrics.avgCycleTime.previousValue} change={activeMetrics.avgCycleTime.change} target={activeMetrics.avgCycleTime.target} icon={Clock} format="days" showComparison={showComparison} invertChange trendData={trendDataSets.cycleTime} />
        </div>
      </div>

      {/* Secondary KPIs */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <ExecutiveMetricCard title="Saving %" value={activeMetrics.savingsPercent} change={activeMetrics.savingsPercent > 10 ? activeMetrics.savingsPercent - 10 : 0} target={15} icon={Zap} format="percent" showComparison={showComparison} trendData={trendDataSets.savings.map((s, i) => (trendDataSets.spend[i] > 0 ? (s / trendDataSets.spend[i]) * 100 : 0))} />
        <ExecutiveMetricCard title="Base Fornecedores" value={activeMetrics.supplierCount.value} previousValue={activeMetrics.supplierCount.previousValue} change={activeMetrics.supplierCount.change} target={activeMetrics.supplierCount.target} icon={Users} showComparison={showComparison} trendData={trendDataSets.suppliers} />
        <ExecutiveMetricCard title="Aprovações" value={activeMetrics.pendingApprovals.value} previousValue={activeMetrics.pendingApprovals.previousValue} change={activeMetrics.pendingApprovals.change} urgent={activeMetrics.pendingApprovals.urgent} icon={CheckCircle2} onClick={() => setDrillDown({ type: 'pending', data: filteredPendingItems })} showComparison={showComparison} invertChange trendData={trendDataSets.pendingApprovals} />
        <ExecutiveMetricCard title="Atrasos" value={activeMetrics.overdueOrders.value} previousValue={activeMetrics.overdueOrders.previousValue} change={activeMetrics.overdueOrders.change} critical={activeMetrics.overdueOrders.critical} icon={XCircle} showComparison={showComparison} invertChange trendData={trendDataSets.overdueOrders} />
        <ExecutiveMetricCard title="Compliance" value={activeMetrics.contractCompliance.value} previousValue={activeMetrics.contractCompliance.previousValue} change={activeMetrics.contractCompliance.change} target={activeMetrics.contractCompliance.target} icon={Target} format="percent" showComparison={showComparison} trendData={trendDataSets.compliance} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <ExecutiveChartsRow showComparison={showComparison} filteredCategorySpend={filteredCategorySpend} onCategoryDrillDown={(cat) => setDrillDown({ type: 'category', data: cat })} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <ExecutiveTablesRow filteredSuppliers={filteredSuppliers} filteredBuyers={filteredBuyers} showComparison={showComparison} onSupplierDrillDown={(s) => setDrillDown({ type: 'supplier', data: s })} onBuyerDrillDown={(b) => setDrillDown({ type: 'buyer', data: b })} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <ExecutivePendingActions items={filteredPendingItems} />
      </motion.div>

      <ExecutiveDrillDownModal drillDown={drillDown} onClose={() => setDrillDown(null)} />
      {clearFlow.ConfirmDialog}
    </motion.div>
  );
};