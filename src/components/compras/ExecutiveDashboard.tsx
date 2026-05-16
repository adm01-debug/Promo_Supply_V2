import { useState, useMemo, useEffect, useRef } from 'react';
import { useAccountFilters } from '@/hooks/useAccountFilters';
import { useClearFiltersFlow } from '@/hooks/useClearFiltersFlow';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDashboardFilters, DashboardFilter } from '@/hooks/useDashboardFilters';
import { PurchaseClimateWidget } from './PurchaseClimateWidget';
import {
  DollarSign, TrendingUp, ShoppingCart, Target, GitCompare, Download,
  ShieldCheck, Brain, Sparkles
} from 'lucide-react';
import { useExecutiveDashboardData } from '@/hooks/useExecutiveDashboardData';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { ElitePageWrapper } from '@/components/organisms/ElitePageWrapper';
import { EliteButton } from '@/components/atoms/EliteButton';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import {
  executiveMetrics, calculateChange, 
  categorySpend, topSuppliers, buyerPerformance, pendingItems,
  type DrillDownData
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
      ...executiveMetrics,
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
      contractCompliance: {
        value: rm.contractCompliance.value || executiveMetrics.contractCompliance.value,
        previousValue: executiveMetrics.contractCompliance.previousValue,
        change: rm.contractCompliance.value > 0 ? calculateChange(rm.contractCompliance.value, executiveMetrics.contractCompliance.previousValue) : executiveMetrics.contractCompliance.change,
        target: rm.contractCompliance.target || executiveMetrics.contractCompliance.target
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
    };
  }, [realMetrics, realDataLoading]);

  useRealtimeSubscription({ tables: ['pedidos', 'solicitacoes', 'cotacoes', 'pagamentos'] });

  const { favorites, loading: favoritesLoading, saveFavorite, deleteFavorite, setAsDefault, getDefaultFilter } = useDashboardFilters();

  const applyFilter = (filter: DashboardFilter) => {
    setSelectedCategory(filter.category_filter ?? 'all');
    setSelectedSupplier(filter.supplier_filter ?? 'all');
    setSelectedPeriod(filter.period_filter ?? '6m');
    setShowComparison(filter.show_comparison ?? true);
  };

  const currentFilters = { category: selectedCategory, supplier: selectedSupplier, period: selectedPeriod, showComparison };
  const hasActiveFilters = selectedCategory !== 'all' || selectedSupplier !== 'all';

  const { requestClear, ConfirmDialog } = useClearFiltersFlow({
    scope: 'executive-dashboard',
    screenLabel: 'Dashboard Executivo',
    describeActiveFilters: () => [
      { key: 'category', label: 'Categoria', value: selectedCategory },
      { key: 'supplier', label: 'Fornecedor', value: selectedSupplier },
    ],
    takeSnapshot: () => ({ selectedCategory, selectedSupplier, selectedPeriod, showComparison }),
    applySnapshot: (s: any) => {
      setSelectedCategory(s.selectedCategory); setSelectedSupplier(s.selectedSupplier);
    },
    performClear: () => {
      setSelectedCategory('all'); setSelectedSupplier('all');
      return [];
    },
  });

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

  const handleCategoryDrillDown = (category: any) => {
     setSelectedCategory(category.name);
  };

  return (
    <ElitePageWrapper>
      <div className="space-y-8 pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
              <TrendingUp className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight uppercase leading-none" style={{ fontFamily: 'Outfit, sans-serif' }}>Executive Dashboard</h1>
              <div className="flex items-center gap-2 mt-2">
                 <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-violet-500/30 text-violet-300">Real-time Intelligence</Badge>
                 <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-50">• Global Procurement Control</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-xl">
              <GitCompare className="h-4 w-4 text-violet-400" />
              <Label htmlFor="comparison-mode" className="text-[10px] font-black uppercase tracking-widest cursor-pointer">Comparing</Label>
              <Switch id="comparison-mode" checked={showComparison} onCheckedChange={setShowComparison} />
            </div>
            <div className="bg-white/[0.03] p-1 rounded-xl flex border border-white/5">
               {['1m', '3m', '6m', '1y'].map(p => (
                 <Button 
                   key={p} 
                   variant={selectedPeriod === p ? 'secondary' : 'ghost'} 
                   size="sm" 
                   onClick={() => setSelectedPeriod(p)}
                   className="rounded-lg px-3 font-bold text-[9px] uppercase tracking-widest h-8"
                 >
                   {p === '1y' ? '1A' : p.toUpperCase()}
                 </Button>
               ))}
            </div>
            <EliteButton variant="default" size="sm" onClick={() => {}} className="h-11 px-6">
              <Download className="w-4 h-4 mr-2" /> EXPORT REPORT
            </EliteButton>
          </div>
        </div>

        <ExecutiveFiltersBar
          selectedCategory={selectedCategory}
          selectedSupplier={selectedSupplier}
          onCategoryChange={setSelectedCategory}
          onSupplierChange={setSelectedSupplier}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={requestClear}
          favorites={favorites}
          currentFilters={currentFilters}
          onSave={saveFavorite}
          onDelete={deleteFavorite}
          onSetDefault={setAsDefault}
          onApply={applyFilter}
          favoritesLoading={favoritesLoading}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ExecutiveMetricCard
            title="Total Spend"
            value={activeMetrics.totalSpend.value}
            previousValue={activeMetrics.totalSpend.previousValue}
            change={activeMetrics.totalSpend.change}
            target={activeMetrics.totalSpend.target}
            icon={DollarSign}
            format="currency"
            showComparison={showComparison}
            delay={0}
          />
          <ExecutiveMetricCard
            title="Total Savings"
            value={activeMetrics.savings.value}
            previousValue={activeMetrics.savings.previousValue}
            change={activeMetrics.savings.change}
            target={activeMetrics.savings.target}
            icon={TrendingUp}
            format="currency"
            subtitle={`${activeMetrics.savingsPercent.toFixed(1)}% optimization`}
            showComparison={showComparison}
            delay={1}
          />
          <ExecutiveMetricCard
            title="Orders Volume"
            value={activeMetrics.ordersThisMonth.value}
            previousValue={activeMetrics.ordersThisMonth.previousValue}
            change={activeMetrics.ordersThisMonth.change}
            icon={ShoppingCart}
            showComparison={showComparison}
            delay={2}
          />
          <ExecutiveMetricCard
            title="Contract Compliance"
            value={activeMetrics.contractCompliance.value}
            previousValue={activeMetrics.contractCompliance.previousValue}
            change={activeMetrics.contractCompliance.change}
            target={activeMetrics.contractCompliance.target}
            icon={ShieldCheck}
            format="percent"
            showComparison={showComparison}
            delay={3}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-8">
              <ExecutiveAIInsights 
                metrics={activeMetrics as any} 
                spendByCategory={realSpendByCategory || []} 
                topSuppliers={(realTopSuppliers || []).map(s => ({ name: s.name, rating: 4.5 }))} 
              />
              <ExecutiveChartsRow 
                showComparison={showComparison} 
                filteredCategorySpend={filteredCategorySpend} 
                onCategoryDrillDown={handleCategoryDrillDown} 
                selectedCategory={selectedCategory} 
                selectedSupplier={selectedSupplier} 
              />
              <PriceVarianceAnalysis />
           </div>
           <div className="space-y-8">
              <ExecutivePendingActions items={filteredPendingItems} />
              <PurchaseClimateWidget />
              <Card className="p-8 rounded-[2.5rem] border-white/5 bg-white/[0.03] backdrop-blur-2xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12">
                   <Brain className="w-24 h-24 text-violet-500" />
                </div>
                <div className="flex items-center gap-3 mb-6">
                   <Sparkles className="w-5 h-5 text-violet-400" />
                   <h3 className="font-black uppercase tracking-tight text-white">Strategic Intelligence</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium mb-6">
                  Sua matriz de risco Kraljic foi atualizada com base nos dados de mercado deste mês. Recomendamos revisar os fornecedores críticos.
                </p>
                <EliteButton variant="outline" className="w-full rounded-2xl h-12 text-[10px] font-black uppercase tracking-[0.2em]">VER MATRIZ KRALJIC</EliteButton>
              </Card>
           </div>
        </div>

        <ExecutiveTablesRow 
          filteredSuppliers={filteredSuppliers} 
          filteredBuyers={filteredBuyers} 
          showComparison={showComparison}
          onSupplierDrillDown={(s) => setDrillDown({ type: 'supplier', data: s })}
          onBuyerDrillDown={(b) => setDrillDown({ type: 'buyer', data: b })}
        />
        
        <div className="pt-8">
           <KraljicMatrix />
        </div>
      </div>

      <ExecutiveDrillDownModal
        drillDown={drillDown}
        onClose={() => setDrillDown(null)}
      />
      {ConfirmDialog}
    </ElitePageWrapper>
  );
};
