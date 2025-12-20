import { useState, useCallback, useMemo } from "react";
import { 
  Search, 
  ClipboardList,
  LayoutGrid,
  List,
  Loader2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SolicitacaoCard } from "@/components/compras/SolicitacaoCard";
import { SolicitacaoKanban } from "@/components/compras/SolicitacaoKanban";
import { NovaSolicitacaoModal } from "@/components/compras/NovaSolicitacaoModal";
import { FiltrosAvancados, initialFilters, type AdvancedFilters } from "@/components/compras/FiltrosAvancados";
import { BulkActionsBar } from "@/components/compras/BulkActionsBar";
import { MainLayout } from "@/components/compras/MainLayout";
import { useSolicitacoes, type Solicitacao } from "@/hooks/useSolicitacoes";
import { toast } from "sonner";

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
      // Text search (already filtered server-side, but double check)
      const matchesSearch = !searchTerm || 
        s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.produto.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Basic filters
      const matchesStatus = statusFilter === "todas" || s.status === statusFilter;
      const matchesTipo = tipoFilter === "todos" || s.tipo === tipoFilter;

      // Advanced filters
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

  const statusConfig: Record<string, { label: string; color: string }> = {
    AGUARDANDO_COTACAO: { label: 'Aguardando Cotação', color: 'bg-emerald-500' },
    EM_COTACAO: { label: 'Em Cotação', color: 'bg-yellow-500' },
    FORNECEDOR_SELECIONADO: { label: 'Fornecedor Selecionado', color: 'bg-blue-500' },
    AGUARDANDO_PAGAMENTO: { label: 'Aguardando Pagamento', color: 'bg-orange-500' },
    PAGO: { label: 'Pago', color: 'bg-cyan-500' },
    EM_TRANSITO: { label: 'Em Trânsito', color: 'bg-purple-500' },
  };

  // Handle status change from drag-and-drop
  const handleStatusChange = useCallback(async (id: string, newLegacyStatus: string) => {
    const dbStatus = mapLegacyStatusToDb(newLegacyStatus);
    await updateStatus(id, dbStatus);
  }, [updateStatus]);

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

  // Loading skeleton
  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Solicitações</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie todas as solicitações de compra ({solicitacoes.length} registros)
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'kanban')}>
              <TabsList className="h-9">
                <TabsTrigger value="kanban" className="px-3">
                  <LayoutGrid className="w-4 h-4 mr-1" />
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="list" className="px-3">
                  <List className="w-4 h-4 mr-1" />
                  Lista
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <NovaSolicitacaoModal onSuccess={refetch} />
          </div>
        </div>

        {/* Busca e Filtros */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar pedido, empresa, produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-2">
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
            </div>
          </div>
        </Card>

        {/* Contadores por Status (only in list view) */}
        {viewMode === 'list' && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(statusConfig).map(([key, config]) => {
              const count = groupedByStatus[key as keyof typeof groupedByStatus]?.length || 0;
              if (count === 0 && statusFilter !== "todas" && statusFilter !== key) return null;
              
              return (
                <Badge
                  key={key}
                  variant={statusFilter === key ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setStatusFilter(statusFilter === key ? "todas" : key)}
                >
                  <span className={`w-2 h-2 rounded-full ${config.color} mr-2`} />
                  {config.label} ({count})
                </Badge>
              );
            })}
          </div>
        )}

        {/* Kanban View */}
        {viewMode === 'kanban' && (
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
        {viewMode === 'list' && (
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
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredSolicitacoes.length === 0 && !loading && (
          <Card className="p-8 text-center">
            <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Nenhuma solicitação encontrada</h3>
            <p className="text-sm text-muted-foreground">
              {solicitacoes.length === 0 
                ? "Crie sua primeira solicitação de compra"
                : "Tente ajustar os filtros ou criar uma nova solicitação"
              }
            </p>
          </Card>
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
