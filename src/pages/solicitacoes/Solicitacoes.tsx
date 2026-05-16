import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useAccountFilters } from "@/hooks/useAccountFilters";
import { useClearFiltersFlow } from "@/hooks/useClearFiltersFlow";
import { exportToCSV, solicitacaoColumns } from "@/lib/exportData";
import { 
  ClipboardList,
  LayoutGrid,
  List,
  Plus,
  Search,
  Filter,
  ArrowRight
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { SolicitacaoCard } from "@/components/compras/SolicitacaoCard";
import { SolicitacaoKanban } from "@/components/compras/SolicitacaoKanban";
import { NovaSolicitacaoModal } from "@/components/compras/NovaSolicitacaoModal";
import { FiltrosAvancados, initialFilters, type AdvancedFilters } from "@/components/compras/FiltrosAvancados";
import { EnhancedBulkActionsBar } from "@/components/compras/EnhancedBulkActionsBar";
import { ModuleErrorBoundary } from "@/features/layout/components/ModuleErrorBoundary";
import { PageHeader, PageHeaderStats } from "@/components/ui/page-header";
import { IllustratedEmptyState } from "@/components/ui/illustrated-empty-state";
import { EnhancedSearch } from "@/components/ui/enhanced-search";
import { KanbanSkeleton } from "@/components/ui/contextual-skeletons";
import { useSolicitacoes, type Solicitacao } from "@/features/solicitacoes";
import { useBulkOperations } from "@/hooks/useBulkOperations";
import { BulkItem, BulkAction } from "@/components/compras/BulkOperationsPreview";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTourPreferences } from "@/hooks/useTourPreferences";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { mapLegacyStatusToDb, adaptToLegacyFormat } from "./solicitacoesHelpers";
import { ElitePageWrapper } from "@/components/organisms/ElitePageWrapper";
import { EliteButton } from "@/components/atoms/EliteButton";
import { EliteCardGrid } from "@/components/organisms/EliteCardGrid";
import { motion, AnimatePresence } from "framer-motion";

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

  const { solicitacoes, loading, updateStatus, bulkDelete, bulkUpdateStatus, refetch, duplicateSolicitacao } = useSolicitacoes({
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

    return [
      { label: 'Total', value: filteredSolicitacoes.length },
      { label: 'Pendentes', value: pending, trend: pending > 0 ? { value: 8, direction: 'up' as const } : undefined },
      { label: 'Valor Estimado', value: `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` },
    ];
  }, [filteredSolicitacoes]);

  const handleStatusChange = useCallback(async (id: string, newLegacyStatus: string) => {
    const dbStatus = mapLegacyStatusToDb(newLegacyStatus);
    await updateStatus(id, dbStatus);
  }, [updateStatus]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Solicitações" description="Carregando..." icon={ClipboardList} />
        <KanbanSkeleton columns={6} />
      </div>
    );
  }

  return (
    <ModuleErrorBoundary module="solicitacoes">
      <ElitePageWrapper>
        <div className="space-y-8 pb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                <ClipboardList className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-foreground tracking-tight uppercase leading-none">Solicitações</h1>
                <div className="flex items-center gap-2 mt-2">
                   <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest">{filteredSolicitacoes.length} Registros</Badge>
                   <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-50">• Procurement Cycle</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <EliteButton 
                variant="outline" 
                size="sm" 
                onClick={() => setViewMode(prev => prev === 'kanban' ? 'list' : 'kanban')}
                className="gap-2 h-11 px-4"
              >
                {viewMode === 'kanban' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                {viewMode === 'kanban' ? 'VER LISTA' : 'VER KANBAN'}
              </EliteButton>
              <NovaSolicitacaoModal onSuccess={refetch} />
            </div>
          </div>

          <PageHeaderStats stats={stats} />

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card/40 p-6 rounded-[2rem] border border-border/40 backdrop-blur-xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-2">
                <EnhancedSearch
                  placeholder="Busca inteligente..."
                  onSearch={(q) => setSearchTerm(q)}
                  className="bg-background/40 border-border/50 h-12 rounded-xl"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-background/40 h-12 border-border/50 rounded-xl">
                    <Filter className="w-4 h-4 mr-2 text-primary" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="todas">Todos os Status</SelectItem>
                    <SelectItem value="AGUARDANDO_COTACAO">Pendente</SelectItem>
                    <SelectItem value="EM_COTACAO">Em Cotação</SelectItem>
                    <SelectItem value="FORNECEDOR_SELECIONADO">Aprovada</SelectItem>
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
                transition={{ duration: 0.3 }}
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
                transition={{ duration: 0.3 }}
              >
                <EliteCardGrid columns={1}>
                  {filteredSolicitacoes.length > 0 ? (
                    filteredSolicitacoes.map(s => (
                      <SolicitacaoCard key={s.id} solicitacao={s} />
                    ))
                  ) : (
                    <IllustratedEmptyState type="orders" title="Sem resultados" description="Tente ajustar seus filtros." />
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
