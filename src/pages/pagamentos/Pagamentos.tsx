import { useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableSkeleton, KPICardSkeleton } from "@/components/ui/contextual-skeletons";
import { IllustratedEmptyState } from "@/components/ui/illustrated-empty-state";
import { ModuleErrorBoundary } from "@/features/layout/components/ModuleErrorBoundary";
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
  Building2, Calendar, RefreshCw, Eye, MoreHorizontal,
  CalendarClock, BarChart3, Filter, Download
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip, TooltipContent, TooltipTrigger, TooltipProvider,
} from "@/components/ui/tooltip";
import { usePagamentos, usePagamentosKPIs, type Pagamento } from "@/hooks/usePagamentos";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/lib/feedbackToast";
import { format } from "date-fns/format";
import { differenceInDays } from "date-fns/differenceInDays";
import { cn, formatCurrency } from "@/lib/utils";
import { ElitePageWrapper } from "@/components/organisms/ElitePageWrapper";
import { EliteButton } from "@/components/atoms/EliteButton";
import { motion, AnimatePresence } from "framer-motion";

const Pagamentos = () => {
  const [filters, setFilters] = useState<PagamentoFiltersState>(INITIAL_FILTERS);
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<Pagamento | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("pendentes");
  const [showDashboard, setShowDashboard] = useState(true);

  const isMobile = useIsMobile();
  const { pagamentos, loading, refetch, markAsPaid, approvePagamento, bulkUpdateStatus } = usePagamentos();
  const { kpis } = usePagamentosKPIs();

  const pagamentosPendentes = useMemo(() =>
    pagamentos.filter(p => ['pendente', 'aprovado', 'agendado', 'parcial', 'atrasado'].includes(p.status)),
    [pagamentos]
  );
  const pagamentosPagos = useMemo(() =>
    pagamentos.filter(p => p.status === 'pago'),
    [pagamentos]
  );
  const selectedForSchedule = useMemo(() =>
    pagamentos.filter(p => selectedIds.includes(p.id) && ['pendente', 'aprovado'].includes(p.status)),
    [pagamentos, selectedIds]
  );

  const currentList = activeTab === 'pendentes' ? pagamentosPendentes : pagamentosPagos;
  const filteredPagamentos = useMemo(() => applyAdvancedFilters(currentList, filters), [currentList, filters]);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(prev =>
      prev.length === filteredPagamentos.length ? [] : filteredPagamentos.map(p => p.id)
    );
  }, [filteredPagamentos]);

  const handleSelectOne = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const handlePagar = (pagamento: Pagamento) => {
    setPagamentoSelecionado(pagamento);
    setModalOpen(true);
  };

  const getVencimentoInfo = (venc: string, status: string) => {
    if (status === 'pago') return { label: "PAGO", color: "text-success", bg: "bg-success/10", icon: CheckCircle2 };
    const dias = differenceInDays(new Date(venc), new Date());
    if (dias < 0) return { label: `${Math.abs(dias)}d VENCIDO`, color: "text-destructive", bg: "bg-destructive/10", icon: AlertTriangle };
    if (dias === 0) return { label: "HOJE", color: "text-destructive", bg: "bg-destructive/10", icon: AlertTriangle };
    if (dias <= 3) return { label: `${dias}d RESTANTE${dias > 1 ? 's' : ''}`, color: "text-warning", bg: "bg-warning/10", icon: Clock };
    return { label: `${dias}d`, color: "text-muted-foreground", bg: "bg-muted", icon: Calendar };
  };

  const getStatusConfig = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      pendente: { label: 'PENDENTE', className: 'bg-warning/10 text-warning border-none' },
      aprovado: { label: 'APROVADO', className: 'bg-info/10 text-info border-none' },
      agendado: { label: 'AGENDADO', className: 'bg-purple-500/10 text-purple-600 border-none' },
      pago: { label: 'PAGO', className: 'bg-success/10 text-success border-none' },
      parcial: { label: 'PARCIAL', className: 'bg-cyan-500/10 text-cyan-600 border-none' },
    };
    return map[status] || map["pendente"];
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <KPICardSkeleton />
        <TableSkeleton rows={8} columns={6} />
      </div>
    );
  }

  return (
    <ModuleErrorBoundary module="pagamentos">
      <ElitePageWrapper>
        <div className="space-y-8 pb-10">
          {/* Elite Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
                <CreditCard className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-foreground tracking-tight uppercase leading-none">Pagamentos</h1>
                <div className="flex items-center gap-2 mt-2">
                   <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest">{filteredPagamentos.length} Transações</Badge>
                   <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-50">• Cash Flow Control</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <EliteButton variant="outline" onClick={() => setShowDashboard(!showDashboard)} className="h-11 px-4">
                <BarChart3 className="w-4 h-4 mr-2" /> {showDashboard ? 'OCULTAR STATS' : 'VER DASHBOARD'}
              </EliteButton>
              <PagamentoExportPanel pagamentos={filteredPagamentos} />
              <EliteButton variant="default" onClick={() => refetch()} className="h-11 px-6">
                <RefreshCw className="w-4 h-4 mr-2" /> ATUALIZAR
              </EliteButton>
            </div>
          </div>

          <PagamentoNotificationsWidget pagamentos={pagamentos} />
          <PagamentoAdvancedKPIs pagamentos={pagamentos} />

          <AnimatePresence mode="wait">
            {showDashboard && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <PagamentoFinancialDashboard pagamentos={pagamentos} />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card/40 p-6 rounded-[2rem] border border-border/40 backdrop-blur-xl shadow-xl shadow-primary/5"
          >
            <div className="flex flex-col gap-6">
              <PagamentoAdvancedFilters pagamentos={pagamentos} filters={filters} onFiltersChange={setFilters} />
            </div>
          </motion.div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList className="bg-muted/30 p-1 rounded-2xl h-12">
                <TabsTrigger value="pendentes" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-lg">
                  EM ABERTO ({pagamentosPendentes.length})
                </TabsTrigger>
                <TabsTrigger value="pago" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-lg">
                  CONCLUÍDOS ({pagamentosPagos.length})
                </TabsTrigger>
              </TabsList>
              
              {selectedIds.length > 0 && (
                <EliteButton variant="outline" size="sm" onClick={() => setScheduleModalOpen(true)} className="rounded-xl border-dashed border-primary/40 text-primary">
                  <CalendarClock className="w-4 h-4 mr-2" /> AGENDAR {selectedIds.length} SELECIONADOS
                </EliteButton>
              )}
            </div>

            <Card className="rounded-[2rem] border-border/40 bg-card/30 backdrop-blur-sm overflow-hidden shadow-2xl">
              <TooltipProvider>
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-border/10">
                      <TableHead className="w-12"><Checkbox checked={selectedIds.length === filteredPagamentos.length && filteredPagamentos.length > 0} onCheckedChange={handleSelectAll} /></TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest py-5 pl-4">Transação</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Fornecedor</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Vencimento</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Valor</TableHead>
                      <TableHead className="w-20 pr-4"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPagamentos.map((p) => {
                      const vencInfo = getVencimentoInfo(p.data_vencimento, p.status);
                      const statusCfg = getStatusConfig(p.status);
                      const isSelected = selectedIds.includes(p.id);
                      return (
                        <TableRow 
                          key={p.id} 
                          className={cn("group border-border/5 hover:bg-primary/5 transition-colors cursor-pointer", isSelected && "bg-primary/5")} 
                          onClick={() => handlePagar(p)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={isSelected} onCheckedChange={() => handleSelectOne(p.id)} /></TableCell>
                          <TableCell className="pl-4">
                            <span className="font-mono font-bold text-primary group-hover:underline underline-offset-4">{p.numero}</span>
                            <div className="mt-1">
                              <Badge variant="outline" className={cn("text-[9px] font-black tracking-widest rounded-md px-1.5 py-0.5", statusCfg.className)}>{statusCfg.label}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                             <div className="flex items-center gap-2">
                               <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-xs font-bold text-muted-foreground">
                                 {p.fornecedor?.razao_social?.slice(0, 2).toUpperCase()}
                               </div>
                               <div>
                                 <p className="text-sm font-semibold leading-tight">{p.fornecedor?.razao_social}</p>
                                 <p className="text-[10px] text-muted-foreground uppercase font-medium">NF: {p.numero_nf || 'N/D'}</p>
                               </div>
                             </div>
                          </TableCell>
                          <TableCell>
                             <div className={cn("flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tighter", vencInfo.color)}>
                               <vencInfo.icon className="h-3 w-3" />
                               {vencInfo.label}
                             </div>
                             <p className="text-[10px] text-muted-foreground font-medium mt-1">{format(new Date(p.data_vencimento), 'dd MMM yyyy')}</p>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-black text-foreground">
                              {formatCurrency(p.valor)}
                            </span>
                          </TableCell>
                          <TableCell className="pr-4">
                             <EliteButton variant="ghost" size="icon" className="h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity">
                               <MoreHorizontal className="w-4 h-4" />
                             </EliteButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredPagamentos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-20">
                          <IllustratedEmptyState type="payments" title="Sem transações" description="Ajuste os filtros para encontrar o que procura." />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TooltipProvider>
            </Card>
          </Tabs>
        </div>
      </ElitePageWrapper>

      <PagamentoDetailModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
        pagamento={pagamentoSelecionado} 
        onConfirmarPagamento={async (id, val) => {
          const ok = await markAsPaid(id, val);
          if (ok) setModalOpen(false);
          return ok;
        }}
      />
      <PagamentoScheduleModal 
        open={scheduleModalOpen} 
        onOpenChange={setScheduleModalOpen} 
        pagamentos={selectedForSchedule} 
        onSchedule={async (ids, date) => {
          const ok = await bulkUpdateStatus(ids, 'agendado');
          if (ok) {
            setSelectedIds([]);
            setScheduleModalOpen(false);
          }
          return ok;
        }}
      />
    </ModuleErrorBoundary>
  );
};

export default Pagamentos;
