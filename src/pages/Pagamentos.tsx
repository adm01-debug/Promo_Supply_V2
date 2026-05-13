import { useState, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/compras/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableSkeleton, KPICardSkeleton } from "@/components/ui/contextual-skeletons";
import { IllustratedEmptyState } from "@/components/ui/illustrated-empty-state";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { EnhancedBulkActionsBar } from "@/components/compras/EnhancedBulkActionsBar";
import { useBulkOperations, pagamentosStatusOptions } from "@/hooks/useBulkOperations";
import { BulkAction, BulkItem } from "@/components/compras/BulkOperationsPreview";
import { Progress } from "@/components/ui/progress";
import { PagamentoAdvancedKPIs } from "@/components/pagamentos/PagamentoAdvancedKPIs";
import { PagamentoAdvancedFilters, applyAdvancedFilters, INITIAL_FILTERS, type PagamentoFiltersState } from "@/components/pagamentos/PagamentoAdvancedFilters";
import { PagamentoDetailModal } from "@/components/pagamentos/PagamentoDetailModal";
import { PagamentoMobileCard } from "@/components/pagamentos/PagamentoMobileCard";
import { PagamentoFinancialDashboard } from "@/components/pagamentos/PagamentoFinancialDashboard";
import { PagamentoScheduleModal } from "@/components/pagamentos/PagamentoScheduleModal";
import { PagamentoNotificationsWidget } from "@/components/pagamentos/PagamentoNotificationsWidget";
import { PagamentoExportPanel } from "@/components/pagamentos/PagamentoExportPanel";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  CreditCard, QrCode, FileText, Clock, CheckCircle2, AlertTriangle,
  Building2, Calendar, DollarSign, RefreshCw, Eye, MoreHorizontal,
  Trash2, CalendarClock, Banknote, BarChart3
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip, TooltipContent, TooltipTrigger, TooltipProvider,
} from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { usePagamentos, usePagamentosKPIs, type Pagamento } from "@/hooks/usePagamentos";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/lib/feedbackToast";
import { format } from "date-fns/format";
import { differenceInDays } from "date-fns/differenceInDays";
import { cn } from "@/lib/utils";

const Pagamentos = () => {
  const [filters, setFilters] = useState<PagamentoFiltersState>(INITIAL_FILTERS);
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<Pagamento | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("pendentes");
  const [showDashboard, setShowDashboard] = useState(true);

  const isMobile = useIsMobile();
  const { pagamentos, loading, refetch, markAsPaid, approvePagamento, bulkUpdateStatus, bulkDelete, updatePagamento } = usePagamentos();
  const { kpis } = usePagamentosKPIs();

  const handleSchedule = useCallback(async (ids: string[], date: string) => {
    const success = await bulkUpdateStatus(ids, 'agendado');
    return success;
  }, [bulkUpdateStatus]);

  const selectedForSchedule = useMemo(() =>
    pagamentos.filter(p => selectedIds.includes(p.id) && ['pendente', 'aprovado'].includes(p.status)),
    [pagamentos, selectedIds]
  );

  // Split by tab
  const pagamentosPendentes = useMemo(() =>
    pagamentos.filter(p => ['pendente', 'aprovado', 'agendado', 'parcial', 'atrasado'].includes(p.status)),
    [pagamentos]
  );
  const pagamentosPagos = useMemo(() =>
    pagamentos.filter(p => p.status === 'pago'),
    [pagamentos]
  );

  const currentList = activeTab === 'pendentes' ? pagamentosPendentes : pagamentosPagos;
  const filteredPagamentos = useMemo(() => applyAdvancedFilters(currentList, filters), [currentList, filters]);

  // Bulk operations
  const { executeAction, convertToBulkItems } = useBulkOperations({
    onDelete: bulkDelete,
    onUpdateStatus: bulkUpdateStatus as (ids: string[], status: string) => Promise<boolean>,
  });

  const bulkActions: BulkAction[] = [
    { id: 'approve', label: 'Aprovar', icon: CheckCircle2, variant: 'default', targetStatus: 'aprovado' },
    { id: 'mark-paid', label: 'Marcar Pago', icon: CreditCard, variant: 'default', targetStatus: 'pago' },
    { id: 'schedule', label: 'Agendar', icon: CalendarClock, variant: 'default', targetStatus: 'agendado' },
    { id: 'change-status', label: 'Alterar Status', icon: RefreshCw },
    { id: 'delete', label: 'Excluir', icon: Trash2, variant: 'destructive', requiresConfirmation: true },
  ];

  const handleBulkAction = useCallback(async (action: BulkAction, itemIds: string[], options?: { targetStatus?: string }) => {
    const success = await executeAction(action, itemIds, options);
    if (success) setSelectedIds([]);
    return success;
  }, [executeAction]);

  const selectedBulkItems: BulkItem[] = useMemo(() => {
    const selected = pagamentos.filter(p => selectedIds.includes(p.id));
    return convertToBulkItems(selected, (p) => ({
      title: p.numero, subtitle: p.fornecedor?.razao_social || 'Fornecedor',
      status: p.status, value: p.valor,
    }));
  }, [pagamentos, selectedIds, convertToBulkItems]);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(prev =>
      prev.length === filteredPagamentos.length ? [] : filteredPagamentos.map(p => p.id)
    );
  }, [filteredPagamentos]);

  const handleSelectOne = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const handleTabChange = (value: string) => { setActiveTab(value); setSelectedIds([]); };

  const handlePagar = (pagamento: Pagamento) => {
    setPagamentoSelecionado(pagamento);
    setModalOpen(true);
  };

  const handleConfirmarPagamento = async (id: string, valorParcial?: number) => {
    const success = await markAsPaid(id, valorParcial);
    if (success) toast.success(valorParcial ? "Pagamento parcial registrado!" : "Pagamento confirmado!");
    return success;
  };

  const handleAprovar = async (pagamento: Pagamento) => {
    const success = await approvePagamento(pagamento.id);
    if (success) toast.success("Pagamento aprovado!");
  };

  const getVencimentoInfo = (venc: string, status: string) => {
    if (status === 'pago') return { label: "Pago", color: "text-success", bg: "bg-success/10", icon: CheckCircle2 };
    const dias = differenceInDays(new Date(venc), new Date());
    if (dias < 0) return { label: `${Math.abs(dias)}d vencido`, color: "text-destructive", bg: "bg-destructive/10", icon: AlertTriangle };
    if (dias === 0) return { label: "Vence Hoje", color: "text-destructive", bg: "bg-destructive/10", icon: AlertTriangle };
    if (dias <= 3) return { label: `${dias}d restante${dias > 1 ? 's' : ''}`, color: "text-warning", bg: "bg-warning/10", icon: Clock };
    return { label: `${dias}d`, color: "text-muted-foreground", bg: "bg-muted", icon: Calendar };
  };

  const getStatusConfig = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      pendente: { label: 'Pendente', className: 'bg-warning/10 text-warning border-amber-500/20' },
      aprovado: { label: 'Aprovado', className: 'bg-info/10 text-info border-blue-500/20' },
      agendado: { label: 'Agendado', className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
      pago: { label: 'Pago', className: 'bg-success/10 text-success border-emerald-500/20' },
      parcial: { label: 'Parcial', className: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
      cancelado: { label: 'Cancelado', className: 'bg-destructive/10 text-destructive border-red-500/20' },
      atrasado: { label: 'Atrasado', className: 'bg-destructive/10 text-destructive border-red-500/20' },
    };
    return map[status] || map["pendente"];
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <KPICardSkeleton key={i} />)}
          </div>
          <TableSkeleton rows={6} columns={7} />
        </div>
      </MainLayout>
    );
  }

  const renderTable = (list: Pagamento[], showCheckbox: boolean) => (
    <TooltipProvider>
      <Card>
        <Table aria-label="Tabela de dados">
          <TableHeader>
            <TableRow>
              {showCheckbox && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedIds.length === list.length && list.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              <TableHead>Número</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>NF</TableHead>
              <TableHead>Forma</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((p) => {
              const vencInfo = getVencimentoInfo(p.data_vencimento, p.status);
              const VencIcon = vencInfo.icon;
              const statusCfg = getStatusConfig(p.status);
              const isSelected = selectedIds.includes(p.id);
              const hasParcial = p.status === 'parcial' || (p.valor_pago || 0) > 0;
              const pctPago = ((p.valor_pago || 0) / p.valor) * 100;

              return (
                <TableRow key={p.id} className={cn(isSelected && 'bg-primary/5', "cursor-pointer")} onClick={() => handlePagar(p)}>
                  {showCheckbox && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={isSelected} onCheckedChange={() => handleSelectOne(p.id)} />
                    </TableCell>
                  )}
                  <TableCell>
                    <span className="font-mono font-medium text-sm">{p.numero}</span>
                    <div className="mt-0.5">
                      <Badge variant="outline" className={cn("text-xs", statusCfg.className)}>{statusCfg.label}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[180px]">{p.fornecedor?.razao_social || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{p.numero_nf || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1 text-xs">
                      {p.forma_pagamento === "pix" ? <QrCode className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                      {p.forma_pagamento?.toUpperCase() || 'N/D'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className={cn("flex items-center gap-1.5 text-xs font-medium", vencInfo.color)}>
                      <VencIcon className="h-3.5 w-3.5" />
                      {vencInfo.label}
                    </div>
                    <p className="text-xs text-muted-foreground">{format(new Date(p.data_vencimento), 'dd/MM/yyyy')}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <span className="font-bold text-sm">{fmt(p.valor)}</span>
                          {hasParcial && (
                            <div className="mt-1">
                              <Progress value={pctPago} className="h-1.5" />
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {fmt(p.valor_pago || 0)} / {fmt(p.valor)}
                              </p>
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs space-y-1">
                          <p>Valor total: {fmt(p.valor)}</p>
                          <p>Pago: {fmt(p.valor_pago || 0)}</p>
                          <p>Restante: {fmt(p.valor - (p.valor_pago || 0))}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handlePagar(p)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        {!['pago', 'cancelado'].includes(p.status) && (
                          <>
                            <DropdownMenuItem onClick={() => handlePagar(p)}>
                              <CreditCard className="w-4 h-4 mr-2" />
                              Registrar Pagamento
                            </DropdownMenuItem>
                            {p.status === 'pendente' && (
                              <DropdownMenuItem onClick={() => handleAprovar(p)}>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Aprovar
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {list.length === 0 && (
              <TableRow>
                <TableCell colSpan={showCheckbox ? 8 : 7} className="text-center py-8">
                  <IllustratedEmptyState
                    type="payments"
                    title="Nenhum pagamento encontrado"
                    description="Ajuste os filtros ou aguarde novos pagamentos"
                    size="sm"
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </TooltipProvider>
  );

  const renderMobile = (list: Pagamento[]) => (
    <div className="space-y-3">
      {list.length === 0 ? (
        <Card className="p-8">
          <IllustratedEmptyState type="payments" title="Nenhum pagamento encontrado" description="Ajuste os filtros" size="sm" />
        </Card>
      ) : (
        list.map((p) => (
          <PagamentoMobileCard key={p.id} pagamento={p} onPagar={handlePagar} onAprovar={handleAprovar} onView={handlePagar} />
        ))
      )}
    </div>
  );

  return (
    <ModuleErrorBoundary module="pagamentos">
      <MainLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-primary" />
              Contas a Pagar
            </h1>
            <p className="text-sm text-muted-foreground">Gestão financeira completa de pagamentos</p>
          </div>
          <div className="flex gap-2">
            <PagamentoExportPanel pagamentos={filteredPagamentos} />
            {selectedForSchedule.length > 0 && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setScheduleModalOpen(true)}>
                <CalendarClock className="h-4 w-4" />
                Agendar ({selectedForSchedule.length})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowDashboard(!showDashboard)}>
              <BarChart3 className="w-4 h-4 mr-2" />
              {showDashboard ? 'Ocultar' : 'Dashboard'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Notifications Widget */}
        <PagamentoNotificationsWidget pagamentos={pagamentos} />

        {/* Advanced KPIs */}
        <PagamentoAdvancedKPIs pagamentos={pagamentos} />

        {/* Financial Dashboard (collapsible) */}
        {showDashboard && <PagamentoFinancialDashboard pagamentos={pagamentos} />}

        {/* Advanced Filters */}
        <PagamentoAdvancedFilters pagamentos={pagamentos} filters={filters} onFiltersChange={setFilters} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-3">
          <TabsList className="w-full grid grid-cols-2 h-auto p-1">
            <TabsTrigger value="pendentes" className="gap-1.5 text-xs sm:text-sm py-2">
              <Clock className="h-3.5 w-3.5" />
              Pendentes ({pagamentosPendentes.length})
            </TabsTrigger>
            <TabsTrigger value="pagos" className="gap-1.5 text-xs sm:text-sm py-2">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Pagos ({pagamentosPagos.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendentes">
            {isMobile ? renderMobile(filteredPagamentos) : renderTable(filteredPagamentos, true)}
          </TabsContent>

          <TabsContent value="pagos">
            {isMobile ? renderMobile(filteredPagamentos) : renderTable(filteredPagamentos, false)}
          </TabsContent>
        </Tabs>

        {/* Summary footer */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>{filteredPagamentos.length} de {currentList.length} pagamentos</p>
          <p>Total filtrado: {fmt(filteredPagamentos.reduce((s, p) => s + p.valor, 0))}</p>
        </div>
      </div>

      {/* Detail Modal */}
      <PagamentoDetailModal
        pagamento={pagamentoSelecionado}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onConfirmarPagamento={handleConfirmarPagamento}
      />

      {/* Schedule Modal */}
      <PagamentoScheduleModal
        pagamentos={selectedForSchedule}
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        onSchedule={handleSchedule}
      />

      {/* Bulk Actions */}
      <EnhancedBulkActionsBar
        entityType="pagamentos"
        selectedItems={selectedBulkItems}
        totalCount={filteredPagamentos.length}
        onSelectAll={handleSelectAll}
        onDeselectAll={() => setSelectedIds([])}
        onExecute={handleBulkAction}
        isAllSelected={selectedIds.length === filteredPagamentos.length && filteredPagamentos.length > 0}
        statusOptions={pagamentosStatusOptions}
        availableActions={bulkActions}
      />
    </MainLayout>
  );
};

export default Pagamentos;
