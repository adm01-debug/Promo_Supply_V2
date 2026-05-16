import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useAccountFilters } from "@/hooks/useAccountFilters";
import { useClearFiltersFlow } from "@/hooks/useClearFiltersFlow";
import { 
  ClipboardList,
  LayoutGrid,
  List,
  Plus,
  Filter,
  BarChart3,
  TrendingUp,
  Package,
  TrendingDown
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SolicitacaoCard } from "@/components/compras/SolicitacaoCard";
import { SolicitacaoKanban } from "@/components/compras/SolicitacaoKanban";
import { NovaSolicitacaoModal } from "@/components/compras/NovaSolicitacaoModal";
import { FiltrosAvancados, initialFilters, type AdvancedFilters } from "@/components/compras/FiltrosAvancados";
import { ModuleErrorBoundary } from "@/features/layout/components/ModuleErrorBoundary";
import { PageHeaderStats } from "@/components/ui/page-header";
import { IllustratedEmptyState } from "@/components/ui/illustrated-empty-state";
import { EnhancedSearch } from "@/components/ui/enhanced-search";
import { KanbanSkeleton } from "@/components/ui/contextual-skeletons";
import { useSolicitacoes } from "@/features/solicitacoes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { mapLegacyStatusToDb, adaptToLegacyFormat } from "./solicitacoesHelpers";
import { ElitePageWrapper } from "@/components/organisms/ElitePageWrapper";
import { EliteButton } from "@/components/atoms/EliteButton";
import { EliteCardGrid } from "@/components/organisms/EliteCardGrid";
import { motion, AnimatePresence } from "framer-motion";
import { ExecutiveMetricCard } from "@/components/compras/executive/ExecutiveMetricCard";

const Solicitacoes = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todas");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(initialFilters);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');

  const accountDefaults = useMemo(() => ({
    searchTerm: "", statusFilter: "todas", tipoFilter: "todos",
    advancedFilters: initialFilters as AdvancedFilters,
  }), []);
  const acct = useAccountFilters("solicitacoes", accountDefaults);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (acct.loading || hydratedRef.current) return;
    hydratedRef.current = true;
    setSearchTerm(acct.filters.searchTerm);
    setStatusFilter(acct.filters.statusFilter);
    setTipoFilter(acct.filters.tipoFilter);
    setAdvancedFilters(acct.filters.advancedFilters);
  }, [acct.loading, acct.filters]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    acct.patchFilters({ searchTerm, statusFilter, tipoFilter, advancedFilters });
  }, [searchTerm, statusFilter, tipoFilter, advancedFilters, acct]);

  const { solicitacoes, loading, updateStatus, refetch } = useSolicitacoes({
    search: searchTerm || undefined,
    status: statusFilter !== 'todas' ? mapLegacyStatusToDb(statusFilter) : undefined,
  });

  useRealtimeSubscription({
    tables: ['solicitacoes'],
    queryKeysToInvalidate: [['solicitacoes']],
    debounceMs: 1500,
  });

  const adaptedSolicitacoes = useMemo(() => solicitacoes.map(adaptToLegacyFormat), [solicitacoes]);

  const filteredSolicitacoes = useMemo(() => {
    return adaptedSolicitacoes.filter(s => {
      const matchesSearch = !searchTerm || 
        s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.produto.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "todas" || s.status === statusFilter;
      const matchesTipo = tipoFilter === "todos" || s.tipo === tipoFilter;

      const solicitacaoDate = new Date(s.prazoEntrega);
      const matchesDateFrom = !advancedFilters.dateRange.from || solicitacaoDate >= new Date(advancedFilters.dateRange.from);
      const matchesDateTo = !advancedFilters.dateRange.to || solicitacaoDate <= new Date(advancedFilters.dateRange.to);

      const solicitacaoValor = s.valorTotal || 0;
      const matchesValorMin = solicitacaoValor >= advancedFilters.valorMin;
      const matchesValorMax = solicitacaoValor <= advancedFilters.valorMax || advancedFilters.valorMax === 100000;

      return matchesSearch && matchesStatus && matchesTipo && matchesDateFrom && matchesDateTo && matchesValorMin && matchesValorMax;
    });
  }, [adaptedSolicitacoes, searchTerm, statusFilter, tipoFilter, advancedFilters]);

  const stats = useMemo(() => {
    const pending = filteredSolicitacoes.filter(s => ['AGUARDANDO_COTACAO', 'EM_COTACAO'].includes(s.status)).length;
    const totalValue = filteredSolicitacoes.reduce((acc, s) => acc + (s.valorTotal || 0), 0);

    return {
      total: filteredSolicitacoes.length,
      pending: pending,
      value: totalValue
    };
  }, [filteredSolicitacoes]);

  const handleStatusChange = useCallback(async (id: string, newLegacyStatus: string) => {
    const dbStatus = mapLegacyStatusToDb(newLegacyStatus);
    await updateStatus(id, dbStatus);
  }, [updateStatus]);

  if (loading) {
    return (
      <div className="space-y-6">
        <KanbanSkeleton columns={6} />
      </div>
    );
  }

  return (
    <ModuleErrorBoundary module="solicitacoes">
      <ElitePageWrapper>
        <div className="space-y-10 pb-20">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-violet-500/10 rounded-[2rem] flex items-center justify-center text-violet-400 shadow-inner">
                <ClipboardList className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-white tracking-tight uppercase leading-none" style={{ fontFamily: 'Outfit, sans-serif' }}>Purchasing Flow</h1>
                <div className="flex items-center gap-3 mt-3">
                   <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-violet-500/30 text-violet-300 px-3 py-1">{filteredSolicitacoes.length} Active Records</Badge>
                   <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest opacity-50">• Total Procurement Cycle</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-white/[0.03] p-1 rounded-2xl border border-white/5 flex">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setViewMode('kanban')}
                  className={cn(
                    "rounded-xl px-5 font-black text-[10px] uppercase tracking-widest h-11 gap-2",
                    viewMode === 'kanban' ? "bg-violet-500 text-white" : "text-zinc-400 hover:text-white"
                  )}
                >
                  <LayoutGrid className="w-4 h-4" /> KANBAN
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "rounded-xl px-5 font-black text-[10px] uppercase tracking-widest h-11 gap-2",
                    viewMode === 'list' ? "bg-violet-500 text-white" : "text-zinc-400 hover:text-white"
                  )}
                >
                  <List className="w-4 h-4" /> LIST
                </Button>
              </div>
              <NovaSolicitacaoModal onSuccess={refetch} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ExecutiveMetricCard
              title="Total Requests"
              value={stats.total}
              icon={Package}
              delay={0}
            />
            <ExecutiveMetricCard
              title="Pending Quotation"
              value={stats.pending}
              icon={BarChart3}
              delay={1}
              urgent={stats.pending > 5 ? stats.pending : 0}
            />
            <ExecutiveMetricCard
              title="Estimated Volume"
              value={stats.value}
              icon={TrendingUp}
              format="currency"
              delay={2}
            />
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-2xl shadow-2xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="md:col-span-2">
                <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] ml-1 mb-2 block">Global Smart Search</Label>
                <EnhancedSearch
                  placeholder="ID, item or company name..."
                  onSearch={(q) => setSearchTerm(q)}
                  className="bg-white/[0.03] border-white/10 h-12 rounded-xl text-white font-bold"
                />
              </div>
              <div>
                <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] ml-1 mb-2 block">Status Filter</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-white/[0.03] h-12 border-white/10 rounded-xl text-zinc-200 font-bold">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-violet-400" />
                      <SelectValue placeholder="All Status" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a0f] border-white/10 backdrop-blur-3xl rounded-2xl">
                    <SelectItem value="todas" className="text-xs font-bold py-2.5">All Requests</SelectItem>
                    <SelectItem value="AGUARDANDO_COTACAO" className="text-xs font-bold py-2.5">Pending</SelectItem>
                    <SelectItem value="EM_COTACAO" className="text-xs font-bold py-2.5">In Quotation</SelectItem>
                    <SelectItem value="FORNECEDOR_SELECIONADO" className="text-xs font-bold py-2.5">Approved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                 <FiltrosAvancados filters={advancedFilters} onFiltersChange={setAdvancedFilters} onApply={() => {}} />
              </div>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {viewMode === 'kanban' ? (
              <motion.div
                key="kanban"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.4 }}
              >
                <SolicitacaoKanban 
                  solicitacoes={filteredSolicitacoes} 
                  onStatusChange={handleStatusChange} 
                />
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
              >
                <EliteCardGrid columns={1}>
                  {filteredSolicitacoes.length > 0 ? (
                    filteredSolicitacoes.map(s => (
                      <SolicitacaoCard key={s.id} solicitacao={s} />
                    ))
                  ) : (
                    <IllustratedEmptyState type="orders" title="No matching records" description="Adjust your filters to refine the results." />
                  )}
                </EliteCardGrid>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ElitePageWrapper>
    </ModuleErrorBoundary>
  );
};

export default Solicitacoes;
