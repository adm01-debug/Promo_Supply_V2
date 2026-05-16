import { useState, useMemo, useEffect, useRef } from "react";
import { useAccountFilters } from "@/hooks/useAccountFilters";
import { useClearFiltersFlow } from "@/hooks/useClearFiltersFlow";
import { IllustratedEmptyState } from "@/components/ui/illustrated-empty-state";
import { ModuleErrorBoundary } from "@/features/layout/components/ModuleErrorBoundary";
import { 
  Eye, 
  Search, 
  Filter, 
  Package, 
  Clock, 
  Building2, 
  Calendar, 
  Truck, 
  LayoutList, 
  LayoutGrid, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Timer,
  Info,
  ChevronRight,
  TrendingUp,
  X
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PedidoTimeline } from "@/components/compras/PedidoTimeline";
import { KanbanBoard } from "@/components/compras/KanbanBoard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/feedbackToast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import {
  type AcompanhamentoPedido, calcularSLA, getStatusLabel, getTipoLabel,
  getStatusBadgeColor, mapPedidoStatus, gerarEtapasPipeline,
} from "./AcompanhamentoHelpers";
import { ElitePageWrapper } from "@/components/organisms/ElitePageWrapper";
import { EliteButton } from "@/components/atoms/EliteButton";
import { EliteCardGrid } from "@/components/organisms/EliteCardGrid";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const Acompanhamento = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [pedidoDetalhes, setPedidoDetalhes] = useState<AcompanhamentoPedido | null>(null);
  const [viewMode, setViewMode] = useState<'lista' | 'kanban'>('lista');
  const [filtroSLA, setFiltroSLA] = useState<'todos' | 'atrasados' | 'criticos' | 'atencao'>('todos');

  const accountDefaults = useMemo(() => ({
    searchTerm: "",
    filtroSLA: "todos" as 'todos' | 'atrasados' | 'criticos' | 'atencao',
  }), []);
  const acct = useAccountFilters("acompanhamento", accountDefaults);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (acct.loading || hydratedRef.current) return;
    hydratedRef.current = true;
    setSearchTerm(acct.filters.searchTerm);
    setFiltroSLA(acct.filters.filtroSLA);
  }, [acct.loading, acct.filters]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    acct.patchFilters({ searchTerm, filtroSLA });
  }, [searchTerm, filtroSLA, acct]);

  useRealtimeSubscription({ tables: ['pedidos', 'solicitacoes'] });

  const { data: pedidosDB = [], isLoading: isLoadingPedidos } = useQuery({
    queryKey: ['acompanhamento-pedidos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pedidos').select('id, numero, status, valor_total, data_previsao, data_emissao, created_at, fornecedor_id, solicitacao_id').not('status', 'in', '(cancelado)');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: solicitacoesDB = [] } = useQuery({
    queryKey: ['acompanhamento-solicitacoes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('solicitacoes').select('id, descricao, quantidade, data_necessidade, status, created_at');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: fornecedoresDB = [] } = useQuery({
    queryKey: ['acompanhamento-fornecedores'],
    queryFn: async () => {
      const { data, error } = await supabase.from('fornecedores').select('id, razao_social, nome_fantasia');
      if (error) throw error;
      return data || [];
    },
  });

  const pedidosState = useMemo<AcompanhamentoPedido[]>(() => {
    return pedidosDB.map(p => {
      const sol = solicitacoesDB.find(s => s.id === p.solicitacao_id);
      const forn = fornecedoresDB.find(f => f.id === p.fornecedor_id);
      return {
        id: p.numero || p.id.slice(0, 8), produto: sol?.descricao || `Pedido ${p.numero}`,
        quantidade: sol?.quantidade || 0, quantidadeReal: sol?.quantidade || 0,
        status: mapPedidoStatus(p.status), empresa: 'Promo Supply', vendedor: '',
        prazoEntrega: p.data_previsao || sol?.data_necessidade || new Date().toISOString(),
        fornecedorSelecionado: forn?.nome_fantasia || forn?.razao_social || null,
        valorTotal: Number(p.valor_total) || null, valorUnitario: null,
        createdAt: p.created_at, tipo: 'produto',
      };
    });
  }, [pedidosDB, solicitacoesDB, fornecedoresDB]);

  const pedidosComSLA = pedidosState.map(p => ({ ...p, sla: calcularSLA(p.prazoEntrega, p.status) }));
  const atrasados = pedidosComSLA.filter(p => p.sla.status === 'atrasado');
  const criticos = pedidosComSLA.filter(p => p.sla.status === 'critico');
  const emAtencao = pedidosComSLA.filter(p => p.sla.status === 'atencao');
  const noPrazo = pedidosComSLA.filter(p => p.sla.status === 'no_prazo' || p.sla.status === 'entregue');

  let pedidosFiltrados = pedidosComSLA.filter(pedido =>
    pedido.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    pedido.produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pedido.fornecedorSelecionado?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (filtroSLA !== 'todos') {
    pedidosFiltrados = pedidosFiltrados.filter(p => {
      if (filtroSLA === 'atrasados') return p.sla.status === 'atrasado';
      if (filtroSLA === 'criticos') return p.sla.status === 'critico';
      if (filtroSLA === 'atencao') return p.sla.status === 'atencao';
      return true;
    });
  }

  const handleStatusChange = async (pedidoId: string, novoStatus: string) => {
    toast.success(`Pedido #${pedidoId} atualizado para ${getStatusLabel(novoStatus)}`);
  };

  if (isLoadingPedidos) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-48 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <ModuleErrorBoundary module="solicitacoes">
      <ElitePageWrapper>
        <div className="space-y-8 pb-10">
          {/* Elite Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-600 shadow-inner">
                <Truck className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-foreground tracking-tight uppercase leading-none">Acompanhamento</h1>
                <div className="flex items-center gap-2 mt-2">
                   <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest">{pedidosState.length} Fluxos Ativos</Badge>
                   <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-50">• Supply Pipeline</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-muted/30 p-1 rounded-xl flex">
                <Button 
                  variant={viewMode === 'lista' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setViewMode('lista')}
                  className="rounded-lg px-4 font-bold text-[10px] uppercase tracking-widest h-9"
                >
                  <LayoutList className="w-3 h-3 mr-2" /> LISTA
                </Button>
                <Button 
                  variant={viewMode === 'kanban' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setViewMode('kanban')}
                  className="rounded-lg px-4 font-bold text-[10px] uppercase tracking-widest h-9"
                >
                  <LayoutGrid className="w-3 h-3 mr-2" /> KANBAN
                </Button>
              </div>
              <EliteButton variant="default" onClick={() => {}} className="h-11 px-6">
                 NOVA ATUALIZAÇÃO
              </EliteButton>
            </div>
          </div>

          {/* Elite KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'ATRASADOS', count: atrasados.length, color: 'text-destructive', bg: 'bg-destructive/10', key: 'atrasados' },
              { label: 'CRÍTICOS', count: criticos.length, color: 'text-orange-600', bg: 'bg-orange-500/10', key: 'criticos' },
              { label: 'ATENÇÃO', count: emAtencao.length, color: 'text-amber-600', bg: 'bg-amber-500/10', key: 'atencao' },
              { label: 'TRÂNSITO', count: pedidosState.filter(p => ['PAGO', 'EM_TRANSITO'].includes(p.status)).length, color: 'text-purple-600', bg: 'bg-purple-500/10', key: 'transito' },
              { label: 'NO PRAZO', count: noPrazo.length, color: 'text-emerald-600', bg: 'bg-emerald-500/10', key: 'prazo' },
            ].map((stat) => (
              <motion.div
                key={stat.key}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => stat.key !== 'transito' && stat.key !== 'prazo' && setFiltroSLA(filtroSLA === stat.key ? 'todos' : stat.key as any)}
                className={cn(
                  "p-5 rounded-[2rem] border border-border/40 backdrop-blur-xl cursor-pointer transition-all shadow-lg shadow-black/5",
                  filtroSLA === stat.key ? "bg-background border-primary shadow-primary/10" : "bg-card/40 hover:bg-card/60"
                )}
              >
                <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center mb-3", stat.bg)}>
                   {stat.key === 'atrasados' ? <AlertCircle className={cn("w-5 h-5", stat.color)} /> : 
                    stat.key === 'criticos' ? <AlertTriangle className={cn("w-5 h-5", stat.color)} /> :
                    stat.key === 'atencao' ? <Timer className={cn("w-5 h-5", stat.color)} /> :
                    stat.key === 'transito' ? <Truck className={cn("w-5 h-5", stat.color)} /> :
                    <CheckCircle2 className={cn("w-5 h-5", stat.color)} />}
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">{stat.label}</p>
                <p className={cn("text-2xl font-black mt-1", stat.color)}>{stat.count}</p>
              </motion.div>
            ))}
          </div>

          <AnimatePresence>
            {(atrasados.length > 0 || criticos.length > 0) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Card className="p-6 border-destructive/30 bg-destructive/5 rounded-[2rem] relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-10">
                    <AlertTriangle className="w-24 h-24 text-destructive" />
                  </div>
                  <div className="flex gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive shrink-0">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-black text-destructive uppercase tracking-tight mb-4">Urgência Detectada: Pipeline sob risco</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[...atrasados, ...criticos].slice(0, 4).map((pedido) => (
                          <div 
                            key={pedido.id} 
                            onClick={() => setPedidoDetalhes(pedido)}
                            className="flex items-center justify-between p-3 rounded-xl bg-background/60 hover:bg-background transition-all cursor-pointer group border border-transparent hover:border-destructive/20"
                          >
                            <div className="flex items-center gap-3">
                              <Badge className={cn("border-none font-black text-[10px] py-1", pedido.sla.bgColor, pedido.sla.color)}>#{pedido.id}</Badge>
                              <span className="text-xs font-bold text-foreground truncate max-w-[150px]">{pedido.produto}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-destructive group-hover:translate-x-1 transition-all" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Elite Search & Filters */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card/40 p-6 rounded-[2rem] border border-border/40 backdrop-blur-xl shadow-xl shadow-primary/5"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-3 relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Pesquisar pedidos por ID, produto ou fornecedor..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="pl-12 bg-background/40 border-border/50 h-12 rounded-xl focus:bg-background transition-all" 
                />
                {searchTerm && (
                   <button onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                     <X className="w-4 h-4" />
                   </button>
                )}
              </div>
              
              <EliteButton variant="outline" className="h-12 rounded-xl border-dashed">
                 <Filter className="w-4 h-4 mr-2" /> FILTROS AVANÇADOS
              </EliteButton>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {viewMode === 'kanban' ? (
              <motion.div
                key="kanban"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full h-full"
              >
                <KanbanBoard pedidos={pedidosFiltrados as any} onViewDetails={setPedidoDetalhes as any} onStatusChange={handleStatusChange} />
              </motion.div>
            ) : (
              <motion.div
                key="lista"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {pedidosFiltrados.length === 0 ? (
                  <IllustratedEmptyState type="orders" title="Sem Fluxos Correspondentes" description="Refine seus filtros para encontrar pedidos em trânsito." />
                ) : (
                  <EliteCardGrid columns={1} className="gap-4">
                    {pedidosFiltrados.map((pedido) => (
                      <Card 
                        key={pedido.id} 
                        className={cn(
                          "group p-6 hover:bg-card/60 transition-all rounded-[2rem] border-border/40 backdrop-blur-sm shadow-xl hover:shadow-2xl overflow-hidden relative",
                          pedido.sla.status === 'atrasado' || pedido.sla.status === 'critico' ? "border-destructive/20 bg-destructive/[0.02]" : ""
                        )}
                      >
                        <div className="flex flex-col lg:flex-row gap-8 relative z-10">
                          <div className="lg:w-1/3 space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-black text-primary text-xl group-hover:underline underline-offset-4">#{pedido.id}</span>
                                  <Badge variant="outline" className={cn("rounded-full px-3 py-0.5 border-none font-black text-[9px] uppercase", getStatusBadgeColor(pedido.status))}>
                                    {getStatusLabel(pedido.status)}
                                  </Badge>
                                </div>
                                <h3 className="text-lg font-bold text-foreground leading-tight">{pedido.produto}</h3>
                              </div>
                              <EliteButton variant="ghost" size="icon" onClick={() => setPedidoDetalhes(pedido)} className="h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Eye className="w-5 h-5" />
                              </EliteButton>
                            </div>

                            <div className="space-y-2 text-xs">
                              <div className="flex items-center gap-2 text-muted-foreground"><Building2 className="w-3.5 h-3.5" /><span className="font-medium">{pedido.empresa}</span></div>
                              <div className="flex items-center gap-2 text-muted-foreground"><Truck className="w-3.5 h-3.5" /><span className="font-medium">Parceiro: {pedido.fornecedorSelecionado || 'N/D'}</span></div>
                              <div className={cn("flex items-center gap-2 font-bold", pedido.sla.color)}>
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Chegada: {new Date(pedido.prazoEntrega).toLocaleDateString('pt-BR')}</span>
                              </div>
                            </div>
                            
                            {pedido.valorTotal && (
                              <div className="pt-4 border-t border-border/10 flex items-center justify-between">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Equity Value</p>
                                <p className="text-xl font-black text-primary">R$ {pedido.valorTotal.toLocaleString('pt-BR')}</p>
                              </div>
                            )}
                          </div>

                          <div className="lg:flex-1 lg:border-l lg:border-border/10 lg:pl-8 flex flex-col justify-between">
                            <div>
                               <div className="flex items-center justify-between mb-6">
                                 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Flow Monitoring</p>
                                 <div className="flex gap-2">
                                   <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                   <span className="text-[9px] font-bold text-success uppercase">Live Feed</span>
                                 </div>
                               </div>
                               <PedidoTimeline etapas={gerarEtapasPipeline(pedido.status)} orientacao="horizontal" />
                            </div>

                            {pedido.sla.status !== 'entregue' && (
                              <div className="mt-8">
                                <div className="flex items-center justify-between mb-3 text-[10px] font-black uppercase tracking-widest">
                                  <span className="text-muted-foreground">SLA HEALTH INDEX</span>
                                  <span className={cn(pedido.sla.color)}>{pedido.sla.label}</span>
                                </div>
                                <div className="relative h-2 w-full bg-muted/30 rounded-full overflow-hidden">
                                   <motion.div 
                                     initial={{ width: 0 }}
                                     animate={{ width: `${Math.max(5, Math.min(100, (pedido.sla.diasRestantes / 10) * 100))}%` }}
                                     className={cn("h-full rounded-full transition-colors", pedido.sla.bgColor.replace('bg-', 'bg-').split(' ')[0])}
                                   />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </EliteCardGrid>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ElitePageWrapper>

      <Dialog open={!!pedidoDetalhes} onOpenChange={() => setPedidoDetalhes(null)}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] border-none bg-card/95 backdrop-blur-2xl p-0 overflow-hidden shadow-2xl shadow-primary/20">
          <div className="bg-primary h-2 w-full" />
          <div className="p-8">
            {pedidoDetalhes && (
              <div className="space-y-8">
                <div className="flex items-start justify-between">
                   <div className="flex items-center gap-4">
                     <div className="w-16 h-16 bg-primary/10 rounded-[1.5rem] flex items-center justify-center text-primary">
                        <Package className="w-8 h-8" />
                     </div>
                     <div>
                       <h2 className="text-2xl font-black text-foreground tracking-tight uppercase leading-none">PEDIDO #{pedidoDetalhes.id}</h2>
                       <p className="text-[11px] font-black text-primary uppercase tracking-[0.2em] mt-2">Dossiê de Acompanhamento</p>
                     </div>
                   </div>
                   <EliteButton variant="ghost" size="icon" onClick={() => setPedidoDetalhes(null)} className="h-12 w-12 rounded-2xl">
                     <X className="w-6 h-6" />
                   </EliteButton>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="p-5 rounded-3xl bg-muted/30 border border-border/50">
                     <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Produto / Serviço</p>
                     <p className="text-sm font-bold">{pedidoDetalhes.produto}</p>
                   </div>
                   <div className="p-5 rounded-3xl bg-muted/30 border border-border/50">
                     <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Status Operacional</p>
                     <Badge className={cn("border-none font-black text-[10px] uppercase", getStatusBadgeColor(pedidoDetalhes.status))}>
                       {getStatusLabel(pedidoDetalhes.status)}
                     </Badge>
                   </div>
                </div>

                <div className="space-y-4">
                   <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Pipeline Detalhado</h3>
                   <Card className="p-8 rounded-[2rem] bg-background/40 border-border/50">
                      <PedidoTimeline etapas={gerarEtapasPipeline(pedidoDetalhes.status)} orientacao="vertical" />
                   </Card>
                </div>
                
                <div className="flex gap-4">
                   <EliteButton className="flex-1 h-14 rounded-2xl text-xs font-black uppercase tracking-widest">VISUALIZAR NF-E</EliteButton>
                   <EliteButton variant="outline" className="flex-1 h-14 rounded-2xl text-xs font-black uppercase tracking-widest">HISTÓRICO DE LOGS</EliteButton>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </ModuleErrorBoundary>
  );
};

export default Acompanhamento;
