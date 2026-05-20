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
  TrendingDown,
  GitBranch
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SolicitacaoCard } from "@/components/compras/SolicitacaoCard";
import { SolicitacaoKanban } from "@/components/compras/SolicitacaoKanban";
import { NovaSolicitacaoModal } from "@/components/compras/NovaSolicitacaoModal";
import { IAAdvisor } from "@/components/compras/IAAdvisor";
import { FiltrosAvancados, initialFilters, type AdvancedFilters } from "@/components/compras/FiltrosAvancados";
import { ModuleErrorBoundary } from "@/features/layout/components/ModuleErrorBoundary";
import { PageHeaderStats } from "@/components/ui/page-header";
import { IllustratedEmptyState } from "@/components/ui/illustrated-empty-state";
import { EnhancedSearch } from "@/components/ui/enhanced-search";
import { KanbanSkeleton } from "@/components/ui/contextual-skeletons";
import { useSolicitacoes } from "@/features/solicitacoes";
import { EnhancedBulkActionsBar } from "@/components/compras/EnhancedBulkActionsBar";
import { type BulkItem, type BulkAction } from "@/components/compras/BulkOperationsPreview";
import { statusConfig as uiStatusConfig } from "./solicitacoesHelpers";
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
import { DynamicApprovalMatrix } from "@/components/compras/DynamicApprovalMatrix";
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BulkPlanningConsole } from "@/components/compras/BulkPlanningConsole";

const Solicitacoes = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todas");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(initialFilters);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const { solicitacoes, loading, updateStatus, bulkDelete, bulkUpdateStatus, refetch } = useSolicitacoes({
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

  const handleSelectChange = useCallback((id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(filteredSolicitacoes.map(s => s.id)));
  }, [filteredSolicitacoes]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkExecute = useCallback(async (action: BulkAction, itemIds: string[], options?: Record<string, unknown>) => {
    if (action.id === 'delete') {
      return await bulkDelete(itemIds);
    }
    const targetStatusOption = options?.['targetStatus'] as string | undefined;
    if (action.id === 'change-status' && targetStatusOption) {
      const dbStatus = mapLegacyStatusToDb(targetStatusOption);
      return await bulkUpdateStatus(itemIds, dbStatus);
    }
    if (action.targetStatus) {
      const dbStatus = mapLegacyStatusToDb(action.targetStatus);
      return await bulkUpdateStatus(itemIds, dbStatus);
    }
    return false;
  }, [bulkDelete, bulkUpdateStatus]);

  const bulkSelectedItems = useMemo((): BulkItem[] => {
    return filteredSolicitacoes
      .filter(s => selectedIds.has(s.id))
      .map(s => ({
        id: s.id,
        title: s.produto,
        subtitle: s.empresa,
        status: s.status,
        value: s.valorTotal,
      }));
  }, [filteredSolicitacoes, selectedIds]);

  const bulkStatusOptions = useMemo(() => {
    return Object.entries(uiStatusConfig).map(([value, config]) => ({
      value,
      label: config.label,
      color: config.color,
    }));
  }, []);

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
                <h1 className="text-4xl font-black text-white tracking-tight uppercase leading-none" style={{ fontFamily: 'Outfit, sans-serif' }}>Fluxo de Compras</h1>
                <div className="flex items-center gap-3 mt-3">
                   <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-violet-500/30 text-violet-300 px-3 py-1">{filteredSolicitacoes.length} Registros Ativos</Badge>
                   <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest opacity-50">• Ciclo Total de Suprimentos</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-white/[0.03] p-1 rounded-2xl border border-white/5 flex">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="rounded-xl px-5 font-black text-[10px] uppercase tracking-widest h-11 gap-2 text-zinc-400 hover:text-white"
                    >
                      <GitBranch className="w-4 h-4" /> REGRAS
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="sm:max-w-4xl bg-[#0a0a0f] border-white/10 overflow-y-auto">
                    <SheetHeader className="mb-6">
                      <SheetTitle className="text-2xl font-black text-white uppercase tracking-tight">Matriz de Aprovação</SheetTitle>
                      <SheetDescription className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">
                        Configure as regras e delegações para o fluxo de aprovação
                      </SheetDescription>
                    </SheetHeader>
                    <DynamicApprovalMatrix />
                  </SheetContent>
                </Sheet>

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
              title="Total de Solicitações"
              value={stats.total}
              icon={Package}
              delay={0}
            />
            <ExecutiveMetricCard
              title="Aguardando Cotação"
              value={stats.pending}
              icon={BarChart3}
              delay={1}
              urgent={stats.pending > 5 ? stats.pending : 0}
            />
            <ExecutiveMetricCard
              title="Volume Estimado"
              value={stats.value}
              icon={TrendingUp}
              format="currency"
              delay={2}
            />
          </div>

          <IAAdvisor stats={stats} />

          <BulkPlanningConsole />

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-2xl shadow-2xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="md:col-span-2">
                <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] ml-1 mb-2 block">Busca Inteligente Global</Label>
                <EnhancedSearch
                  placeholder="ID, item ou nome da empresa..."
                  onSearch={(q) => setSearchTerm(q)}
                  className="bg-white/[0.03] border-white/10 h-12 rounded-xl text-white font-bold"
                />
              </div>
              <div>
                <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] ml-1 mb-2 block">Filtro de Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-white/[0.03] h-12 border-white/10 rounded-xl text-zinc-200 font-bold">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-violet-400" />
                      <SelectValue placeholder="Todos os Status" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a0f] border-white/10 backdrop-blur-3xl rounded-2xl">
                    <SelectItem value="todas" className="text-xs font-bold py-2.5">Todas as Solicitações</SelectItem>
                    <SelectItem value="AGUARDANDO_COTACAO" className="text-xs font-bold py-2.5">Pendentes</SelectItem>
                    <SelectItem value="EM_COTACAO" className="text-xs font-bold py-2.5">Em Cotação</SelectItem>
                    <SelectItem value="FORNECEDOR_SELECIONADO" className="text-xs font-bold py-2.5">Aprovadas</SelectItem>
                    <SelectItem value="OWN" className="text-xs font-bold py-2.5 text-violet-400">Minhas Solicitações</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-3">
                 <Button 
                   variant="outline" 
                   onClick={() => setStatusFilter("OWN")}
                   className={cn(
                     "h-12 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 transition-all",
                     statusFilter === "OWN" ? "bg-violet-500 text-white border-none" : "bg-white/[0.03] border-white/10 text-zinc-400"
                   )}
                 >
                   Meus Itens
                 </Button>
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
                  selectable
                  selectedIds={selectedIds}
                  onSelectChange={handleSelectChange}
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
                      <SolicitacaoCard 
                        key={s.id} 
                        solicitacao={s} 
                        selectable
                        selected={selectedIds.has(s.id)}
                        onSelectChange={(selected) => handleSelectChange(s.id, selected)}
                      />
                    ))
                  ) : (
                    <IllustratedEmptyState type="orders" title="Nenhum registro encontrado" description="Ajuste seus filtros para refinar os resultados." />
                  )}
                </EliteCardGrid>
              </motion.div>
            )}
            <EnhancedBulkActionsBar
              entityType="solicitacoes"
              selectedItems={bulkSelectedItems}
              totalCount={filteredSolicitacoes.length}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onExecute={handleBulkExecute}
              isAllSelected={selectedIds.size === filteredSolicitacoes.length && filteredSolicitacoes.length > 0}
              statusOptions={bulkStatusOptions}
            />
          </AnimatePresence>
        </div>
      </ElitePageWrapper>
    </ModuleErrorBoundary>
  );
};

export default Solicitacoes;
