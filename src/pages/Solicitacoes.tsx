import { useState, useCallback, useMemo } from "react";
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
import { BulkActionsBar } from "@/components/compras/BulkActionsBar";
import { MainLayout } from "@/components/compras/MainLayout";
import { PageHeader, PageHeaderStats } from "@/components/ui/page-header";
import { IllustratedEmptyState } from "@/components/ui/illustrated-empty-state";
import { EnhancedSearch } from "@/components/ui/enhanced-search";
import { StatusIndicator, PriorityIndicator } from "@/components/ui/status-indicators";
import { KanbanSkeleton } from "@/components/ui/contextual-skeletons";
import { useSolicitacoes, type Solicitacao } from "@/hooks/useSolicitacoes";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Map DB status to legacy status for UI compatibility
const mapDbStatusToLegacy = (status: Solicitacao['status']): string => {
  const mapping: Record<string, string> = {
    'pendente': 'AGUARDANDO_COTACAO',
    'em_cotacao': 'EM_COTACAO',
    'aprovada': 'FORNECEDOR_SELECIONADO',
    'em_andamento': 'AGUARDANDO_PAGAMENTO',
    'concluida': 'PAGO',
    'rejeitada': 'CANCELADO',
    'cancelada': 'CANCELADO',
  };
  return mapping[status] || 'AGUARDANDO_COTACAO';
};

const mapLegacyStatusToDb = (legacyStatus: string): Solicitacao['status'] => {
  const mapping: Record<string, Solicitacao['status']> = {
    'AGUARDANDO_COTACAO': 'pendente',
    'EM_COTACAO': 'em_cotacao',
    'FORNECEDOR_SELECIONADO': 'aprovada',
    'AGUARDANDO_PAGAMENTO': 'em_andamento',
    'PAGO': 'concluida',
    'EM_TRANSITO': 'concluida',
    'CANCELADO': 'cancelada',
  };
  return mapping[legacyStatus] || 'pendente';
};

// Adapt DB solicitacao to legacy format for components
const adaptToLegacyFormat = (sol: Solicitacao): any => ({
  id: sol.id,
  empresa: sol.departamento || 'Empresa',
  produto: sol.titulo,
  quantidade: sol.quantidade,
  valorTotal: sol.valor_estimado || 0,
  vendedor: sol.observacoes || 'Vendedor',
  prazoEntrega: sol.data_necessidade || sol.created_at,
  status: mapDbStatusToLegacy(sol.status),
  tipo: sol.tipo === 'material' ? 'PE_LISO' : sol.tipo === 'servico' ? 'FAB_LISO' : 'FAB_PERSONALIZADO',
  dataCriacao: sol.created_at,
  prioridade: sol.prioridade,
});

const Solicitacoes = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todas");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(initialFilters);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Use real data from Supabase
  const { 
    solicitacoes, 
    loading, 
    updateStatus, 
    bulkDelete, 
    bulkUpdateStatus,
    refetch 
  } = useSolicitacoes({
    search: searchTerm || undefined,
    status: statusFilter !== 'todas' ? mapLegacyStatusToDb(statusFilter) : undefined,
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

      return matchesSearch && matchesStatus && matchesTipo && 
        matchesDateFrom && matchesDateTo && 
        matchesValorMin && matchesValorMax && 
        matchesEmpresas && matchesTiposAdvanced;
    });
  }, [adaptedSolicitacoes, searchTerm, statusFilter, tipoFilter, advancedFilters]);

  const groupedByStatus = useMemo(() => ({
    AGUARDANDO_COTACAO: filteredSolicitacoes.filter(s => s.status === 'AGUARDANDO_COTACAO'),
    EM_COTACAO: filteredSolicitacoes.filter(s => s.status === 'EM_COTACAO'),
    FORNECEDOR_SELECIONADO: filteredSolicitacoes.filter(s => s.status === 'FORNECEDOR_SELECIONADO'),
    AGUARDANDO_PAGAMENTO: filteredSolicitacoes.filter(s => s.status === 'AGUARDANDO_PAGAMENTO'),
    PAGO: filteredSolicitacoes.filter(s => s.status === 'PAGO'),
    EM_TRANSITO: filteredSolicitacoes.filter(s => s.status === 'EM_TRANSITO'),
  }), [filteredSolicitacoes]);

  const statusConfig: Record<string, { label: string; color: string; indicatorStatus: "pending" | "processing" | "approved" | "completed" | "warning" | "info" }> = {
    AGUARDANDO_COTACAO: { label: 'Aguardando Cotação', color: 'bg-emerald-500', indicatorStatus: 'pending' },
    EM_COTACAO: { label: 'Em Cotação', color: 'bg-yellow-500', indicatorStatus: 'warning' },
    FORNECEDOR_SELECIONADO: { label: 'Fornecedor Selecionado', color: 'bg-blue-500', indicatorStatus: 'info' },
    AGUARDANDO_PAGAMENTO: { label: 'Aguardando Pagamento', color: 'bg-orange-500', indicatorStatus: 'processing' },
    PAGO: { label: 'Pago', color: 'bg-cyan-500', indicatorStatus: 'completed' },
    EM_TRANSITO: { label: 'Em Trânsito', color: 'bg-purple-500', indicatorStatus: 'approved' },
  };

  // Calculate stats for header
  const stats = useMemo(() => {
    const pending = groupedByStatus.AGUARDANDO_COTACAO.length + groupedByStatus.EM_COTACAO.length;
    const inProgress = groupedByStatus.FORNECEDOR_SELECIONADO.length + groupedByStatus.AGUARDANDO_PAGAMENTO.length;
    const completed = groupedByStatus.PAGO.length + groupedByStatus.EM_TRANSITO.length;
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

  const handleBulkExport = useCallback((format: 'pdf' | 'excel') => {
    const selectedItems = filteredSolicitacoes.filter(s => selectedIds.has(s.id));
    console.log(`Exporting ${selectedItems.length} items to ${format}`, selectedItems);
    toast.success(`Exportando ${selectedItems.length} solicitação(ões) para ${format.toUpperCase()}`);
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
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header com novo componente */}
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

        {/* Stats Row */}
        <PageHeaderStats stats={stats} />

        {/* Enhanced Search and Filters */}
        <Card className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <EnhancedSearch
                placeholder="Buscar por produto, empresa, ID..."
                onSearch={handleSearch}
                recentSearches={['Notebook Dell', 'Material de escritório']}
                trendingSearches={['Equipamentos TI', 'Suprimentos']}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  <SelectItem value="todas">Todos os Status</SelectItem>
                  <SelectItem value="AGUARDANDO_COTACAO">Aguardando Cotação</SelectItem>
                  <SelectItem value="EM_COTACAO">Em Cotação</SelectItem>
                  <SelectItem value="FORNECEDOR_SELECIONADO">Fornecedor Selecionado</SelectItem>
                  <SelectItem value="AGUARDANDO_PAGAMENTO">Aguardando Pagamento</SelectItem>
                  <SelectItem value="PAGO">Pago</SelectItem>
                  <SelectItem value="EM_TRANSITO">Em Trânsito</SelectItem>
                </SelectContent>
              </Select>

              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="w-[160px] bg-background">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  <SelectItem value="todos">Todos os Tipos</SelectItem>
                  <SelectItem value="PE_LISO">P.E. Liso</SelectItem>
                  <SelectItem value="FAB_LISO">Fab. Liso</SelectItem>
                  <SelectItem value="FAB_PERSONALIZADO">Fab. Personalizado</SelectItem>
                </SelectContent>
              </Select>

              <FiltrosAvancados 
                filters={advancedFilters}
                onFiltersChange={setAdvancedFilters}
                onApply={() => {}}
              />

              <NovaSolicitacaoModal onSuccess={refetch} />
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
          <div className="overflow-x-auto -mx-4 px-4">
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
                : { label: "Limpar Filtros", onClick: () => { setSearchTerm(''); setStatusFilter('todas'); setTipoFilter('todos'); }, variant: "outline" }
            }
          />
        )}

        {/* Bulk Actions Bar */}
        <BulkActionsBar
          selectedCount={selectedIds.size}
          totalCount={filteredSolicitacoes.length}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onDelete={handleBulkDelete}
          onChangeStatus={handleBulkStatusChange}
          onExport={handleBulkExport}
          isAllSelected={isAllSelected}
        />
      </div>
    </MainLayout>
  );
};

export default Solicitacoes;
