import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useAccountFilters } from "@/hooks/useAccountFilters";
import { useClearFiltersFlow } from "@/hooks/useClearFiltersFlow";
import { exportToCSV, solicitacaoColumns } from "@/lib/exportData";
import { 
  ClipboardList,
  LayoutGrid,
  List,
  Plus
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
import { MainLayout } from "@/components/compras/MainLayout";
import { ModuleErrorBoundary, withModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { PageHeader, PageHeaderStats } from "@/components/ui/page-header";
import { IllustratedEmptyState } from "@/components/ui/illustrated-empty-state";
import { EnhancedSearch } from "@/components/ui/enhanced-search";
import { StatusIndicator, PriorityIndicator } from "@/components/ui/status-indicators";
import { KanbanSkeleton } from "@/components/ui/contextual-skeletons";
import { useSolicitacoes, type Solicitacao, type CostCenter } from "@/features/solicitacoes";
import { useBulkOperations, solicitacoesStatusOptions } from "@/hooks/useBulkOperations";
import { BulkItem, BulkAction } from "@/components/compras/BulkOperationsPreview";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OnboardingTour, solicitacoesTourSteps } from "@/components/onboarding/OnboardingTour";
import { useTourPreferences } from "@/hooks/useTourPreferences";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import type { Solicitacao as MockSolicitacao } from "@/types/legacyTypes";
import { mapDbStatusToLegacy, mapLegacyStatusToDb, adaptToLegacyFormat, statusConfig } from "./solicitacoes/solicitacoesHelpers";

const Solicitacoes = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todas");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(initialFilters);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Account-based persistence
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

  const advancedFiltersAreActive = useMemo(() => {
    return JSON.stringify(advancedFilters) !== JSON.stringify(initialFilters);
  }, [advancedFilters]);

  const clearFlow = useClearFiltersFlow<{
    searchTerm: string; statusFilter: string; tipoFilter: string; advancedFilters: AdvancedFilters;
  }>({
    scope: "solicitacoes",
    screenLabel: "Solicitações",
    describeActiveFilters: () => [
      { key: "searchTerm", label: "Busca", value: searchTerm },
      { key: "statusFilter", label: "Status", value: statusFilter },
      { key: "tipoFilter", label: "Tipo", value: tipoFilter },
      { key: "advancedFilters", label: "Filtros avançados", value: advancedFiltersAreActive ? "ativos" : null },
    ],
    takeSnapshot: () => ({ searchTerm, statusFilter, tipoFilter, advancedFilters }),
    applySnapshot: (s) => {
      setSearchTerm(s.searchTerm); setStatusFilter(s.statusFilter);
      setTipoFilter(s.tipoFilter); setAdvancedFilters(s.advancedFilters);
    },
    performClear: async () => {
      setSearchTerm(""); setStatusFilter("todas"); setTipoFilter("todos");
      setAdvancedFilters(initialFilters);
      return acct.clearFilters();
    },
  });

  // Tour preferences
  const { isOpen: isTourOpen, isLoading: isTourLoading, complete: completeTour, skip: skipTour } = useTourPreferences('solicitacoes');

  // Use real data from Supabase
  const { 
    solicitacoes, 
    loading, 
    updateStatus, 
    bulkDelete, 
    bulkUpdateStatus,
    refetch,
    duplicateSolicitacao,
  } = useSolicitacoes({
    search: searchTerm || undefined,
    status: statusFilter !== 'todas' ? mapLegacyStatusToDb(statusFilter) : undefined,
  });

  // Realtime subscription with debounce
  useRealtimeSubscription({
    tables: ['solicitacoes'],
    queryKeysToInvalidate: [['solicitacoes']],
    debounceMs: 1500,
  });

  // Adapt and filter solicitacoes
  const adaptedSolicitacoes = useMemo(() => {
    return solicitacoes.map(adaptToLegacyFormat);
  }, [solicitacoes]);

  const filteredSolicitacoes = useMemo(() => {
    return adaptedSolicitacoes.filter(s => {
      const matchesSearch = !searchTerm || 
        s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.produto.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "todas" || s.status === statusFilter;
      const matchesTipo = tipoFilter === "todos" || s.tipo === tipoFilter;

      const solicitacaoDate = new Date(s.prazoEntrega);
      const matchesDateFrom = !advancedFilters.dateRange.from || 
        solicitacaoDate >= new Date(advancedFilters.dateRange.from);
      const matchesDateTo = !advancedFilters.dateRange.to || 
        solicitacaoDate <= new Date(advancedFilters.dateRange.to);

      const solicitacaoValor = s.valorTotal || 0;
      const matchesValorMin = solicitacaoValor >= advancedFilters.valorMin;
      const matchesValorMax = solicitacaoValor <= advancedFilters.valorMax || advancedFilters.valorMax === 100000;

      const matchesEmpresas = advancedFilters.empresas.length === 0 || 
        advancedFilters.empresas.includes(s.empresa);

      const matchesTiposAdvanced = advancedFilters.tipos.length === 0 || 
        advancedFilters.tipos.includes(s.tipo);

      const matchesStatusAdvanced = advancedFilters.status.length === 0 || 
        advancedFilters.status.includes(s.status);

      return matchesSearch && matchesStatus && matchesTipo && 
        matchesDateFrom && matchesDateTo && 
        matchesValorMin && matchesValorMax && 
        matchesEmpresas && matchesTiposAdvanced && matchesStatusAdvanced;
    });
  }, [adaptedSolicitacoes, searchTerm, statusFilter, tipoFilter, advancedFilters]);

  const groupedByStatus = useMemo(() => ({
    AGUARDANDO_COTACAO: filteredSolicitacoes.filter(s => s.status === 'AGUARDANDO_COTACAO'),
    EM_COTACAO: filteredSolicitacoes.filter(s => s.status === 'EM_COTACAO'),
    FORNECEDOR_SELECIONADO: filteredSolicitacoes.filter(s => s.status === 'FORNECEDOR_SELECIONADO'),
    AGUARDANDO_PAGAMENTO: filteredSolicitacoes.filter(s => s.status === 'AGUARDANDO_PAGAMENTO'),
    ENTREGUE: filteredSolicitacoes.filter(s => s.status === 'ENTREGUE'),
    REJEITADA: filteredSolicitacoes.filter(s => s.status === 'REJEITADA'),
    CANCELADA: filteredSolicitacoes.filter(s => s.status === 'CANCELADA'),
  }), [filteredSolicitacoes]);

  // statusConfig imported from solicitacoesHelpers

  // Calculate stats for header
  const stats = useMemo(() => {
    const pending = groupedByStatus.AGUARDANDO_COTACAO.length + groupedByStatus.EM_COTACAO.length;
    const inProgress = groupedByStatus.FORNECEDOR_SELECIONADO.length + groupedByStatus.AGUARDANDO_PAGAMENTO.length;
    const completed = groupedByStatus.ENTREGUE.length;
    const totalValue = filteredSolicitacoes.reduce((acc, s) => acc + (s.valorTotal || 0), 0);

    return [
      { label: 'Total', value: filteredSolicitacoes.length },
      { label: 'Pendentes', value: pending, trend: pending > 0 ? { value: 12, direction: 'up' as const } : undefined },
      { label: 'Em Andamento', value: inProgress },
      { label: 'Valor Total', value: `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` },
    ];
  }, [groupedByStatus, filteredSolicitacoes]);

  // Handle status change from drag-and-drop
  const handleStatusChange = useCallback(async (id: string, newLegacyStatus: string) => {
    const dbStatus = mapLegacyStatusToDb(newLegacyStatus);
    await updateStatus(id, dbStatus);
  }, [updateStatus]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchTerm(query);
  }, []);

  // Selection handlers
  const handleSelectItem = useCallback((id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(filteredSolicitacoes.map(s => s.id)));
  }, [filteredSolicitacoes]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleSingleDelete = useCallback(async (id: string) => {
    await bulkDelete([id]);
    toast.success('Solicitação excluída com sucesso');
  }, [bulkDelete]);

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    await bulkDelete(ids);
    setSelectedIds(new Set());
  }, [selectedIds, bulkDelete]);

  const handleBulkStatusChange = useCallback(async (newLegacyStatus: string) => {
    const ids = Array.from(selectedIds);
    const dbStatus = mapLegacyStatusToDb(newLegacyStatus);
    await bulkUpdateStatus(ids, dbStatus);
    setSelectedIds(new Set());
  }, [selectedIds, bulkUpdateStatus]);

  const handleBulkExport = useCallback((format: 'pdf' | 'excel', itemIds?: string[]) => {
    const ids = itemIds || Array.from(selectedIds);
    const selectedItems = filteredSolicitacoes.filter(s => ids.includes(s.id));
    const exportData = selectedItems.map(s => ({
      numero: s.itemNumber || s.id.slice(0, 8),
      titulo: s.produto || '',
      status: s.status,
      prioridade: '',
      tipo: s.tipo || '',
      valor_estimado: s.valorTotal || 0,
      quantidade: s.quantidade || 1,
      departamento: s.empresa || '',
      data_necessidade: s.prazoEntrega || '',
      created_at: s.createdAt || '',
    }));
    exportToCSV(exportData, solicitacaoColumns, 'solicitacoes');
    toast.success(`${exportData.length} solicitação(ões) exportada(s)`);
  }, [filteredSolicitacoes, selectedIds]);

  // Bulk operations hook
  const { executeAction, convertToBulkItems } = useBulkOperations({
    onDelete: async (ids) => {
      await bulkDelete(ids);
      setSelectedIds(new Set());
      return true;
    },
    onUpdateStatus: async (ids, status) => {
      await bulkUpdateStatus(ids, status as Solicitacao['status']);
      setSelectedIds(new Set());
      return true;
    },
    onCustomAction: async (actionId, ids) => {
      if (actionId === 'duplicate') {
        for (const id of ids) {
          await duplicateSolicitacao(id);
        }
        toast.success(`${ids.length} solicitações duplicadas com sucesso`);
        refetch();
        setSelectedIds(new Set());
        return true;
      }
      return false;
    },
  });

  // Convert selected items to BulkItem format for preview
  const selectedBulkItems: BulkItem[] = useMemo(() => {
    return filteredSolicitacoes
      .filter(s => selectedIds.has(s.id))
      .map(s => ({
        id: s.id,
        title: s.produto,
        subtitle: s.empresa,
        status: mapLegacyStatusToDb(s.status),
        value: s.valorTotal,
        date: s.createdAt,
      }));
  }, [filteredSolicitacoes, selectedIds]);

  const handleSelectAllInGroup = useCallback((status: string) => {
    const items = groupedByStatus[status as keyof typeof groupedByStatus] || [];
    const allSelected = items.every(s => selectedIds.has(s.id));
    
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      items.forEach(s => {
        if (allSelected) {
          newSet.delete(s.id);
        } else {
          newSet.add(s.id);
        }
      });
      return newSet;
    });
  }, [groupedByStatus, selectedIds]);

  const isAllSelected = filteredSolicitacoes.length > 0 && 
    filteredSolicitacoes.every(s => selectedIds.has(s.id));

  // Loading skeleton using contextual skeleton
  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <PageHeader
            title="Solicitações"
            description="Carregando solicitações de compra..."
            icon={ClipboardList}
          />
          <KanbanSkeleton columns={6} />
        </div>
      </MainLayout>
    );
  }

  return (
    <ModuleErrorBoundary module="solicitacoes">
      <MainLayout>
      <div className="space-y-6">
        {/* Page Header com novo componente */}
        <div data-tour="solicitacoes-header">
          <PageHeader
            title="Solicitações de Compra"
            description="Gerencie todo o ciclo de vida das suas solicitações"
            icon={ClipboardList}
            badge={solicitacoes.length > 0 ? { label: `${solicitacoes.length} registros`, variant: 'secondary' } : undefined}
            breadcrumbs={[
              { label: 'Dashboard', href: '/compras' },
              { label: 'Solicitações' }
            ]}
            actions={[
              {
                label: viewMode === 'kanban' ? 'Lista' : 'Kanban',
                icon: viewMode === 'kanban' ? List : LayoutGrid,
                variant: 'outline',
                onClick: () => setViewMode(prev => prev === 'kanban' ? 'list' : 'kanban')
              }
            ]}
          />
        </div>

        {/* Stats Row */}
        <div data-tour="solicitacoes-stats">
          <PageHeaderStats stats={stats} />
        </div>

        {/* Enhanced Search and Filters */}
        <Card className="p-3 md:p-4" data-tour="solicitacoes-busca">
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="w-full">
              <EnhancedSearch
                placeholder="Buscar por produto, empresa, ID..."
                onSearch={handleSearch}
                results={filteredSolicitacoes.map(s => ({
                  id: s.id,
                  title: s.produto,
                  subtitle: `${s.itemNumber} • ${s.empresa}`,
                  type: 'solicitacao' as const,
                  href: `/solicitacoes?id=${s.id}`
                }))}
                onSelect={(res) => {
                  setSearchTerm(res.title);
                }}
                recentSearches={['Notebook Dell', 'Material de escritório']}
                trendingSearches={['Equipamentos TI', 'Suprimentos']}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[160px] md:w-[180px] bg-background text-xs sm:text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  <SelectItem value="todas">Todos os Status</SelectItem>
                  <SelectItem value="AGUARDANDO_COTACAO">Pendente</SelectItem>
                  <SelectItem value="EM_COTACAO">Em Cotação</SelectItem>
                  <SelectItem value="FORNECEDOR_SELECIONADO">Aprovada</SelectItem>
                  <SelectItem value="AGUARDANDO_PAGAMENTO">Em Andamento</SelectItem>
                  <SelectItem value="ENTREGUE">Finalizada</SelectItem>
                  <SelectItem value="REJEITADA">Rejeitada</SelectItem>
                  <SelectItem value="CANCELADA">Cancelada</SelectItem>
                </SelectContent>
              </Select>

              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="w-full sm:w-[140px] md:w-[160px] bg-background text-xs sm:text-sm">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  <SelectItem value="todos">Todos os Tipos</SelectItem>
                  <SelectItem value="PE_LISO">P.E. Liso</SelectItem>
                  <SelectItem value="FAB_LISO">Fab. Liso</SelectItem>
                  <SelectItem value="FAB_PERSONALIZADO">Fab. Personalizado</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2 w-full sm:w-auto">
                <FiltrosAvancados 
                  filters={advancedFilters}
                  onFiltersChange={setAdvancedFilters}
                  onApply={() => {}}
                />

                <div data-tour="solicitacoes-nova">
                  <NovaSolicitacaoModal onSuccess={refetch} />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Status Counters with new StatusIndicator (only in list view) */}
        {viewMode === 'list' && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(statusConfig).map(([key, config]) => {
              const count = groupedByStatus[key as keyof typeof groupedByStatus]?.length || 0;
              if (count === 0 && statusFilter !== "todas" && statusFilter !== key) return null;
              
              return (
                <div
                  key={key}
                  onClick={() => setStatusFilter(statusFilter === key ? "todas" : key)}
                  className="cursor-pointer"
                >
                  <StatusIndicator 
                    status={config.indicatorStatus}
                    label={`${config.label} (${count})`}
                    showPulse={statusFilter === key}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Kanban View */}
        {viewMode === 'kanban' && filteredSolicitacoes.length > 0 && (
          <div className="overflow-x-auto -mx-4 px-4" data-tour="solicitacoes-kanban">
            <SolicitacaoKanban 
              solicitacoes={filteredSolicitacoes}
              onStatusChange={handleStatusChange}
              selectable
              selectedIds={selectedIds}
              onSelectChange={handleSelectItem}
            />
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && filteredSolicitacoes.length > 0 && (
          <div className="space-y-6">
            {Object.entries(groupedByStatus).map(([status, items]) => {
              if (items.length === 0) return null;
              if (statusFilter !== "todas" && statusFilter !== status) return null;
              
              const config = statusConfig[status];
              const allInGroupSelected = items.every(s => selectedIds.has(s.id));

              return (
                <div key={status} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={allInGroupSelected}
                      onCheckedChange={() => handleSelectAllInGroup(status)}
                      className="h-5 w-5"
                    />
                    <span className={`w-3 h-3 rounded-full ${config.color}`} />
                    <h2 className="font-semibold text-foreground">{config.label}</h2>
                    <Badge variant="secondary" className="ml-2">{items.length}</Badge>
                  </div>

                  <div className="grid gap-3">
                    {items.map((solicitacao) => (
                      <SolicitacaoCard 
                        key={solicitacao.id} 
                        solicitacao={solicitacao}
                        selectable
                        selected={selectedIds.has(solicitacao.id)}
                        onSelectChange={(selected) => handleSelectItem(solicitacao.id, selected)}
                        onDelete={() => handleSingleDelete(solicitacao.id)}
                        onDuplicate={() => duplicateSolicitacao(solicitacao.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State with IllustratedEmptyState */}
        {filteredSolicitacoes.length === 0 && !loading && (
          <IllustratedEmptyState
            type={solicitacoes.length === 0 ? "requests" : "search"}
            title={solicitacoes.length === 0 ? "Nenhuma solicitação cadastrada" : "Nenhum resultado encontrado"}
            description={
              solicitacoes.length === 0 
                ? "Crie sua primeira solicitação de compra para começar a gerenciar suas aquisições."
                : "Tente ajustar os filtros ou buscar por outros termos."
            }
            action={
              solicitacoes.length === 0 
                ? undefined
                : { label: "Limpar Filtros", onClick: clearFlow.requestClear, variant: "outline" }
            }
          />
        )}

        {/* Enhanced Bulk Actions Bar with Preview */}
        <EnhancedBulkActionsBar
          entityType="solicitacoes"
          selectedItems={selectedBulkItems}
          totalCount={filteredSolicitacoes.length}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onExecute={executeAction}
          onExport={handleBulkExport}
          isAllSelected={isAllSelected}
          statusOptions={solicitacoesStatusOptions}
        />
      </div>

      {/* Onboarding Tour */}
      {isTourOpen && !isTourLoading && (
        <OnboardingTour
          steps={solicitacoesTourSteps}
          isOpen={isTourOpen}
          onComplete={completeTour}
          onSkip={skipTour}
        />
      )}
      {clearFlow.ConfirmDialog}
      </MainLayout>
    </ModuleErrorBoundary>
  );
};

export default withModuleErrorBoundary(Solicitacoes, 'solicitacoes');
