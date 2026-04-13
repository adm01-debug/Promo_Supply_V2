import { useState, useMemo, useCallback } from "react";
import { 
  FileText, Search, Download, Eye, Printer, Building2, Calendar, Clock,
  CheckCircle2, Truck, Package, DollarSign, MoreHorizontal, Copy, Mail,
  MessageCircle, X, ArrowUpDown, ChevronDown, RefreshCw, Trash2, BarChart3, ClipboardCheck
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { MainLayout } from "@/components/compras/MainLayout";
import { OnboardingTour, pedidosTourSteps } from "@/components/onboarding/OnboardingTour";
import { useTourPreferences } from "@/hooks/useTourPreferences";
import { EnhancedBulkActionsBar } from "@/components/compras/EnhancedBulkActionsBar";
import { useBulkOperations, pedidosStatusOptions } from "@/hooks/useBulkOperations";
import { BulkAction, BulkItem } from "@/components/compras/BulkOperationsPreview";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TableSkeleton, KPICardSkeleton } from "@/components/ui/contextual-skeletons";
import { IllustratedEmptyState } from "@/components/ui/illustrated-empty-state";
import { PedidoMobileCard } from "@/components/pedidos/PedidoMobileCard";
import { PedidosKPIs } from "@/pages/pedidos/PedidosKPIs";
import { PedidoDetailsDialog } from "@/pages/pedidos/PedidoDetailsDialog";
import { toast } from "@/lib/feedbackToast";
import { format, differenceInDays } from "date-fns";
import { usePedidos, usePedidosKPIs, type Pedido } from "@/hooks/usePedidos";
import { useFornecedores } from "@/hooks/useFornecedores";
import { useIsMobile } from "@/hooks/use-mobile";
import { PriceHistoryModal } from "@/components/compras/PriceHistoryModal";
import { ReceivingModal } from "@/components/compras/ReceivingModal";
import { OrderPreviewModal } from "@/components/compras/OrderPreviewModal";
import { exportToCSV, pedidoColumns } from "@/lib/exportData";

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pendente: { label: 'Pendente', color: 'bg-warning/10 text-warning border-yellow-500/20', icon: Clock },
  aprovado: { label: 'Aprovado', color: 'bg-info/10 text-info border-blue-500/20', icon: CheckCircle2 },
  enviado: { label: 'Enviado', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20', icon: FileText },
  em_transito: { label: 'Em Trânsito', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: Truck },
  entregue: { label: 'Entregue', color: 'bg-success/10 text-success border-green-500/20', icon: CheckCircle2 },
  cancelado: { label: 'Cancelado', color: 'bg-destructive/10 text-destructive border-red-500/20', icon: X },
};

const Pedidos = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fornecedorFilter, setFornecedorFilter] = useState("all");
  const [sortField, setSortField] = useState<'data_emissao' | 'valor_total' | 'data_previsao'>('data_emissao');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [priceHistoryOpen, setPriceHistoryOpen] = useState(false);
  const [receivingPedido, setReceivingPedido] = useState<Pedido | null>(null);
  const [previewPedido, setPreviewPedido] = useState<Pedido | null>(null);
  const [receivingItems, setReceivingItems] = useState<Array<{
    id: string; descricao: string; quantidade: number;
    quantidade_recebida: number | null; unidade: string | null;
    valor_unitario: number; valor_total: number;
  }>>([]);

  const isMobile = useIsMobile();
  const { pedidos, loading, refetch, updateStatus, bulkUpdateStatus, bulkDelete } = usePedidos();
  const { kpis } = usePedidosKPIs();
  const { fornecedores } = useFornecedores();
  const { isOpen: isTourOpen, complete: completeTour, skip: skipTour, isLoading: isTourLoading } = useTourPreferences('pedidos');

  const filteredPedidos = useMemo(() => {
    let result = pedidos.filter(pedido => {
      const matchSearch = pedido.numero.toLowerCase().includes(search.toLowerCase()) ||
        (pedido.fornecedor?.razao_social?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (pedido.observacoes?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchStatus = statusFilter === 'all' || pedido.status === statusFilter;
      const matchFornecedor = fornecedorFilter === 'all' || pedido.fornecedor_id === fornecedorFilter;
      return matchSearch && matchStatus && matchFornecedor;
    });
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'data_emissao') comparison = new Date(a.data_emissao).getTime() - new Date(b.data_emissao).getTime();
      else if (sortField === 'valor_total') comparison = a.valor_total - b.valor_total;
      else if (sortField === 'data_previsao') comparison = (a.data_previsao ? new Date(a.data_previsao).getTime() : 0) - (b.data_previsao ? new Date(b.data_previsao).getTime() : 0);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return result;
  }, [pedidos, search, statusFilter, fornecedorFilter, sortField, sortDirection]);

  const { executeAction, convertToBulkItems } = useBulkOperations({
    onDelete: bulkDelete,
    onUpdateStatus: bulkUpdateStatus as (ids: string[], status: string) => Promise<boolean>,
  });

  const bulkActions: BulkAction[] = [
    { id: 'approve', label: 'Aprovar', icon: CheckCircle2, variant: 'default', targetStatus: 'aprovado' },
    { id: 'mark-shipped', label: 'Marcar Enviado', icon: Truck, variant: 'default', targetStatus: 'enviado' },
    { id: 'mark-delivered', label: 'Marcar Entregue', icon: Package, variant: 'default', targetStatus: 'entregue' },
    { id: 'change-status', label: 'Alterar Status', icon: RefreshCw },
    { id: 'delete', label: 'Excluir', icon: Trash2, variant: 'destructive', requiresConfirmation: true },
  ];

  const handleBulkAction = useCallback(async (action: BulkAction, itemIds: string[], options?: { targetStatus?: string }) => {
    const success = await executeAction(action, itemIds, options);
    if (success) setSelectedIds([]);
    return success;
  }, [executeAction]);

  const selectedBulkItems: BulkItem[] = useMemo(() => {
    const selectedPedidos = pedidos.filter(p => selectedIds.includes(p.id));
    return convertToBulkItems(selectedPedidos, (pedido) => ({
      title: pedido.numero, subtitle: pedido.fornecedor?.razao_social || 'Fornecedor',
      status: pedido.status, value: pedido.valor_total,
    }));
  }, [pedidos, selectedIds, convertToBulkItems]);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(selectedIds.length === filteredPedidos.length ? [] : filteredPedidos.map(p => p.id));
  }, [selectedIds.length, filteredPedidos]);

  const handleSelectOne = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('desc'); }
  };

  const handleViewDetails = (pedido: Pedido) => { setSelectedPedido(pedido); setDetailsOpen(true); };
  const handleCopyOrderNumber = (numero: string) => { navigator.clipboard.writeText(numero); toast.success("Número do pedido copiado!"); };

  const handleUpdateStatus = async (pedidoId: string, newStatus: Pedido['status']) => {
    const success = await updateStatus(pedidoId, newStatus);
    if (success) toast.success(`Status atualizado para ${statusConfig[newStatus]?.label || newStatus}`);
  };

  const handleExportPDF = () => {
    const exportData = filteredPedidos.map(p => ({
      numero: p.numero, status: statusConfig[p.status]?.label || p.status,
      fornecedor: p.fornecedor?.razao_social || '', valor_total: p.valor_total,
      data_emissao: p.data_emissao, data_previsao: p.data_previsao,
      data_entrega: p.data_entrega, condicao_pagamento: p.condicao_pagamento, observacoes: p.observacoes,
    }));
    exportToCSV(exportData, pedidoColumns, 'pedidos');
    toast.success(`${exportData.length} pedido(s) exportado(s) com sucesso`);
  };

  const getPrazoStatus = (prazo: string | null) => {
    if (!prazo) return { label: 'Sem prazo', color: 'text-muted-foreground', urgent: false };
    const dias = differenceInDays(new Date(prazo), new Date());
    if (dias < 0) return { label: 'Atrasado', color: 'text-destructive', urgent: true };
    if (dias === 0) return { label: 'Hoje', color: 'text-destructive', urgent: true };
    if (dias <= 2) return { label: `${dias}d`, color: 'text-warning', urgent: true };
    return { label: `${dias}d`, color: 'text-muted-foreground', urgent: false };
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-2"><div className="h-8 w-64 bg-muted animate-pulse rounded" /><div className="h-4 w-48 bg-muted animate-pulse rounded" /></div>
            <div className="h-10 w-32 bg-muted animate-pulse rounded" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">{[...Array(5)].map((_, i) => <KPICardSkeleton key={i} />)}</div>
          <TableSkeleton rows={8} columns={6} />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4" data-tour="pedidos-header">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />Pedidos de Compra
            </h1>
            <p className="text-sm text-muted-foreground">Gerencie todos os pedidos de compra</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-2" />Atualizar</Button>
            <Button variant="outline" size="sm" onClick={() => setPriceHistoryOpen(true)}><BarChart3 className="w-4 h-4 mr-2" />Histórico Preços</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Exportar<ChevronDown className="w-4 h-4 ml-2" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleExportPDF}><FileText className="w-4 h-4 mr-2" />Exportar PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}><FileText className="w-4 h-4 mr-2" />Exportar Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <PedidosKPIs kpis={kpis} />

        {/* Filtros */}
        <Card className="p-4" data-tour="pedidos-filtros">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por número, fornecedor ou observações..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (<SelectItem key={key} value={key}>{config.label}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={fornecedorFilter} onValueChange={setFornecedorFilter}>
              <SelectTrigger className="w-full md:w-[200px]"><SelectValue placeholder="Fornecedor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Fornecedores</SelectItem>
                {fornecedores.map(f => (<SelectItem key={f.id} value={f.id}>{f.razao_social}</SelectItem>))}
              </SelectContent>
            </Select>
            {(search || statusFilter !== 'all' || fornecedorFilter !== 'all') && (
              <Button variant="ghost" size="icon" onClick={() => { setSearch(""); setStatusFilter("all"); setFornecedorFilter("all"); }}><X className="w-4 h-4" /></Button>
            )}
          </div>
        </Card>

        {/* Mobile View */}
        {isMobile ? (
          <div className="space-y-3">
            {filteredPedidos.length === 0 ? (
              <Card className="p-8"><IllustratedEmptyState type="orders" title="Nenhum pedido encontrado" description={search || statusFilter !== 'all' || fornecedorFilter !== 'all' ? 'Tente ajustar os filtros de busca' : 'Crie um novo pedido para começar a gerenciar suas compras'} size="sm" /></Card>
            ) : filteredPedidos.map((pedido) => (
              <PedidoMobileCard key={pedido.id} pedido={pedido} onView={handleViewDetails} onUpdateStatus={handleUpdateStatus} />
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden" data-tour="pedidos-tabela">
            <Table aria-label="Tabela de dados">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12"><Checkbox checked={selectedIds.length === filteredPedidos.length && filteredPedidos.length > 0} onCheckedChange={handleSelectAll} aria-label="Selecionar todos" /></TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="cursor-pointer hover:text-foreground" onClick={() => handleSort('data_previsao')}><div className="flex items-center gap-1">Prazo<ArrowUpDown className="w-3 h-3" /></div></TableHead>
                  <TableHead className="text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('valor_total')}><div className="flex items-center justify-end gap-1">Valor Total<ArrowUpDown className="w-3 h-3" /></div></TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPedidos.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-32 text-center p-8"><IllustratedEmptyState type="orders" title="Nenhum pedido encontrado" description={search || statusFilter !== 'all' || fornecedorFilter !== 'all' ? 'Tente ajustar os filtros de busca' : 'Crie um novo pedido para começar'} size="sm" /></TableCell></TableRow>
                ) : filteredPedidos.map((pedido) => {
                  const config = statusConfig[pedido.status] || statusConfig.pendente;
                  const StatusIcon = config?.icon || FileText;
                  const prazoStatus = getPrazoStatus(pedido.data_previsao);
                  const isSelected = selectedIds.includes(pedido.id);
                  return (
                    <TableRow key={pedido.id} className={`hover:bg-muted/30 cursor-pointer ${isSelected ? 'bg-primary/5' : ''}`} onClick={() => handleViewDetails(pedido)}>
                      <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={isSelected} onCheckedChange={() => handleSelectOne(pedido.id)} aria-label={`Selecionar ${pedido.numero}`} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-primary">{pedido.numero}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleCopyOrderNumber(pedido.numero); }}><Copy className="w-3 h-3" /></Button>
                        </div>
                        <p className="text-xs text-muted-foreground">{format(new Date(pedido.data_emissao), 'dd/MM/yyyy')}</p>
                      </TableCell>
                      <TableCell><div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-muted-foreground" /><span className="text-sm">{pedido.fornecedor?.razao_social || 'Fornecedor não encontrado'}</span></div></TableCell>
                      <TableCell><Badge variant="outline" className={config?.color}><StatusIcon className="w-3 h-3 mr-1" />{config?.label}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{pedido.data_previsao ? format(new Date(pedido.data_previsao), 'dd/MM/yy') : '-'}</span>
                          {prazoStatus.urgent && pedido.status !== 'entregue' && (<Badge variant="outline" className={`text-xs ${prazoStatus.color}`}>{prazoStatus.label}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right"><span className="font-bold">{pedido.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(pedido)}><Eye className="w-4 h-4 mr-2" />Ver Detalhes</DropdownMenuItem>
                            <DropdownMenuItem><Printer className="w-4 h-4 mr-2" />Imprimir</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateStatus(pedido.id, 'aprovado'); }}><CheckCircle2 className="w-4 h-4 mr-2" />Aprovar</DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateStatus(pedido.id, 'enviado'); }}><Truck className="w-4 h-4 mr-2" />Marcar Enviado</DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateStatus(pedido.id, 'entregue'); }}><Package className="w-4 h-4 mr-2" />Marcar Entregue</DropdownMenuItem>
                            <DropdownMenuItem onClick={async (e) => {
                              e.stopPropagation();
                              const { data } = await (await import('@/integrations/supabase/client')).supabase.from('pedido_itens').select('*').eq('pedido_id', pedido.id);
                              setReceivingItems((data || []).map((i: any) => ({ id: i.id, descricao: i.descricao, quantidade: i.quantidade, quantidade_recebida: i.quantidade_recebida, unidade: i.unidade, valor_unitario: i.valor_unitario, valor_total: i.valor_total })));
                              setReceivingPedido(pedido);
                            }}><ClipboardCheck className="w-4 h-4 mr-2" />Conferir Recebimento</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem><Mail className="w-4 h-4 mr-2" />Enviar por E-mail</DropdownMenuItem>
                            <DropdownMenuItem><MessageCircle className="w-4 h-4 mr-2" />Enviar WhatsApp</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>Mostrando {filteredPedidos.length} de {pedidos.length} pedidos</p>
          <p className="hidden sm:block">Valor filtrado: {filteredPedidos.reduce((acc, o) => acc + o.valor_total, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        </div>
      </div>

      <PedidoDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} pedido={selectedPedido} />

      <EnhancedBulkActionsBar
        entityType="pedidos" selectedItems={selectedBulkItems} totalCount={filteredPedidos.length}
        onSelectAll={handleSelectAll} onDeselectAll={() => setSelectedIds([])}
        onExecute={handleBulkAction} isAllSelected={selectedIds.length === filteredPedidos.length && filteredPedidos.length > 0}
        statusOptions={pedidosStatusOptions} availableActions={bulkActions}
      />

      {!isTourLoading && <OnboardingTour steps={pedidosTourSteps} isOpen={isTourOpen} onComplete={completeTour} onSkip={skipTour} />}
      <PriceHistoryModal open={priceHistoryOpen} onOpenChange={setPriceHistoryOpen} />
      {receivingPedido && <ReceivingModal open={!!receivingPedido} onOpenChange={(open) => !open && setReceivingPedido(null)} pedidoId={receivingPedido.id} pedidoNumero={receivingPedido.numero} items={receivingItems} onSuccess={() => refetch()} />}
      <OrderPreviewModal pedido={previewPedido} open={!!previewPedido} onOpenChange={(open) => !open && setPreviewPedido(null)} onConfirmSend={previewPedido?.status === 'aprovado' ? () => { handleUpdateStatus(previewPedido.id, 'enviado'); setPreviewPedido(null); } : undefined} />
    </MainLayout>
  );
};

export default Pedidos;
