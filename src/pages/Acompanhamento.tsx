import { useState, useMemo } from "react";
import { IllustratedEmptyState } from "@/components/ui/illustrated-empty-state";
import { Eye, Search, Filter, Package, Clock, Building2, User, Calendar, Truck, LayoutList, LayoutGrid, AlertTriangle, AlertCircle, CheckCircle2, Timer } from "lucide-react";
import { MainLayout } from "@/components/compras/MainLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PedidoTimeline } from "@/components/compras/PedidoTimeline";
import { EnhancedPedidoTimeline } from "@/components/compras/EnhancedPedidoTimeline";
import { KanbanBoard } from "@/components/compras/KanbanBoard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/feedbackToast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import {
  type AcompanhamentoPedido, calcularSLA, getStatusLabel, getTipoLabel,
  getStatusBadgeColor, mapPedidoStatus, gerarEtapasPipeline, gerarEtapasEnhanced,
} from "./acompanhamento/AcompanhamentoHelpers";

const Acompanhamento = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [pedidoDetalhes, setPedidoDetalhes] = useState<AcompanhamentoPedido | null>(null);
  const [viewMode, setViewMode] = useState<'lista' | 'kanban'>('lista');
  const [filtroSLA, setFiltroSLA] = useState<'todos' | 'atrasados' | 'criticos' | 'atencao'>('todos');

  useRealtimeSubscription({ tables: ['pedidos', 'solicitacoes'] });

  const { data: pedidosDB = [], isLoading } = useQuery({
    queryKey: ['acompanhamento-pedidos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pedidos').select('id, numero, status, valor_total, data_previsao, data_emissao, created_at, fornecedor_id, solicitacao_id').not('status', 'in', '(cancelado)');
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  const { data: solicitacoesDB = [] } = useQuery({
    queryKey: ['acompanhamento-solicitacoes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('solicitacoes').select('id, descricao, quantidade, data_necessidade, status, created_at');
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  const { data: fornecedoresDB = [] } = useQuery({
    queryKey: ['acompanhamento-fornecedores'],
    queryFn: async () => {
      const { data, error } = await supabase.from('fornecedores').select('id, razao_social, nome_fantasia');
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
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
    pedido.id.toLowerCase().includes(searchTerm.toLowerCase()) || pedido.produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pedido.empresa.toLowerCase().includes(searchTerm.toLowerCase()) || pedido.fornecedorSelecionado?.toLowerCase().includes(searchTerm.toLowerCase())
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
    toast.success(`Pedido #${pedidoId} movido para ${getStatusLabel(novoStatus)}`);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Truck className="w-6 h-6 text-primary" />Acompanhamento</h1>
            <p className="text-sm text-muted-foreground">Acompanhe o progresso dos pedidos através do pipeline</p>
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button variant={viewMode === 'lista' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('lista')} className="gap-2"><LayoutList className="w-4 h-4" />Lista</Button>
            <Button variant={viewMode === 'kanban' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('kanban')} className="gap-2"><LayoutGrid className="w-4 h-4" />Kanban</Button>
          </div>
        </div>

        {/* KPIs de SLA */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className={`p-4 cursor-pointer transition-all ${filtroSLA === 'atrasados' ? 'ring-2 ring-destructive' : 'hover:shadow-md'}`} onClick={() => setFiltroSLA(filtroSLA === 'atrasados' ? 'todos' : 'atrasados')}>
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center"><AlertCircle className="w-5 h-5 text-destructive" /></div><div><p className="text-2xl font-bold text-destructive">{atrasados.length}</p><p className="text-xs text-muted-foreground">Atrasados</p></div></div>
          </Card>
          <Card className={`p-4 cursor-pointer transition-all ${filtroSLA === 'criticos' ? 'ring-2 ring-orange-500' : 'hover:shadow-md'}`} onClick={() => setFiltroSLA(filtroSLA === 'criticos' ? 'todos' : 'criticos')}>
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-warning" /></div><div><p className="text-2xl font-bold text-warning">{criticos.length}</p><p className="text-xs text-muted-foreground">Críticos</p></div></div>
          </Card>
          <Card className={`p-4 cursor-pointer transition-all ${filtroSLA === 'atencao' ? 'ring-2 ring-yellow-500' : 'hover:shadow-md'}`} onClick={() => setFiltroSLA(filtroSLA === 'atencao' ? 'todos' : 'atencao')}>
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center"><Timer className="w-5 h-5 text-warning" /></div><div><p className="text-2xl font-bold text-warning">{emAtencao.length}</p><p className="text-xs text-muted-foreground">Atenção</p></div></div>
          </Card>
          <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center"><Truck className="w-5 h-5 text-purple-500" /></div><div><p className="text-2xl font-bold text-foreground">{pedidosComSLA.filter(p => ['PAGO', 'EM_TRANSITO'].includes(p.status)).length}</p><p className="text-xs text-muted-foreground">Em Trânsito</p></div></div></Card>
          <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-success" /></div><div><p className="text-2xl font-bold text-success">{noPrazo.length}</p><p className="text-xs text-muted-foreground">No Prazo</p></div></div></Card>
        </div>

        {/* Alerta de pedidos críticos */}
        {(atrasados.length > 0 || criticos.length > 0) && (
          <Card className="p-4 border-destructive/50 bg-destructive/5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
              <div className="flex-1">
                <h3 className="font-semibold text-destructive mb-2">Atenção: Pedidos com SLA crítico!</h3>
                <div className="space-y-2">
                  {[...atrasados, ...criticos].slice(0, 5).map((pedido) => (
                    <div key={pedido.id} className="flex items-center justify-between p-2 rounded-lg bg-background/80 cursor-pointer hover:bg-background transition-colors" onClick={() => setPedidoDetalhes(pedido)}>
                      <div className="flex items-center gap-3">
                        <Badge className={`${pedido.sla.bgColor} ${pedido.sla.color} border-0`}>#{pedido.id}</Badge>
                        <span className="text-sm font-medium text-foreground">{pedido.produto}</span>
                        <span className="text-xs text-muted-foreground">• {pedido.fornecedorSelecionado}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`${pedido.sla.color} border-current`}><pedido.sla.icon className="w-3 h-3 mr-1" />{pedido.sla.label}</Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
                {(atrasados.length + criticos.length) > 5 && <p className="text-xs text-muted-foreground mt-2">+{(atrasados.length + criticos.length) - 5} outros pedidos críticos</p>}
              </div>
            </div>
          </Card>
        )}

        {/* Filtros */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar por ID, produto, empresa ou fornecedor..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
            {filtroSLA !== 'todos' && <Button variant="outline" className="gap-2" onClick={() => setFiltroSLA('todos')}>Limpar filtro SLA</Button>}
            <Button variant="outline" className="gap-2"><Filter className="w-4 h-4" />Filtros</Button>
          </div>
        </Card>

        {/* View Content */}
        {viewMode === 'kanban' ? (
          <KanbanBoard pedidos={pedidosFiltrados as any} onViewDetails={setPedidoDetalhes as any} onStatusChange={handleStatusChange} />
        ) : (
          <div className="space-y-4">
            {pedidosFiltrados.length === 0 ? (
              <IllustratedEmptyState type="orders" title="Nenhum pedido em acompanhamento" description="Nenhum pedido corresponde aos filtros atuais." action={{ label: "Limpar filtros", onClick: () => { setSearchTerm(''); setFiltroSLA('todos'); }, variant: "outline" }} />
            ) : pedidosFiltrados.map((pedido) => {
              const SLAIcon = pedido.sla.icon;
              const isUrgent = pedido.sla.status === 'atrasado' || pedido.sla.status === 'critico';
              return (
                <Card key={pedido.id} className={`p-6 hover:shadow-md transition-all ${isUrgent ? 'border-destructive/50 bg-destructive/5' : ''}`}>
                  {isUrgent && (
                    <div className={`-mx-6 -mt-6 mb-4 px-6 py-2 ${pedido.sla.bgColor} border-b border-destructive/20 flex items-center justify-between`}>
                      <div className="flex items-center gap-2"><SLAIcon className={`w-4 h-4 ${pedido.sla.color}`} /><span className={`text-sm font-medium ${pedido.sla.color}`}>{pedido.sla.label}</span></div>
                      <span className="text-xs text-muted-foreground">Prazo: {new Date(pedido.prazoEntrega).toLocaleDateString('pt-BR')}</span>
                    </div>
                  )}
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="lg:w-1/3 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-lg font-bold text-foreground">#{pedido.id}</span>
                            <Badge className={getStatusBadgeColor(pedido.status)}>{getStatusLabel(pedido.status)}</Badge>
                            {!isUrgent && pedido.sla.status !== 'entregue' && <Badge variant="outline" className={`${pedido.sla.color} border-current gap-1`}><SLAIcon className="w-3 h-3" />{pedido.sla.diasRestantes}d</Badge>}
                          </div>
                          <p className="text-sm font-medium text-foreground mt-1">{pedido.produto}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setPedidoDetalhes(pedido)}><Eye className="w-4 h-4" /></Button>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground"><Building2 className="w-4 h-4" /><span className="truncate">{pedido.empresa}</span></div>
                        <div className="flex items-center gap-2 text-muted-foreground"><User className="w-4 h-4" /><span>Fornecedor: {pedido.fornecedorSelecionado || '-'}</span></div>
                        <div className={`flex items-center gap-2 ${isUrgent ? pedido.sla.color : 'text-muted-foreground'}`}><Calendar className="w-4 h-4" /><span>Entrega: {new Date(pedido.prazoEntrega).toLocaleDateString('pt-BR')}</span></div>
                        <div className="flex items-center gap-2"><Package className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">{pedido.quantidade} un</span><Badge variant="outline" className="text-xs">{getTipoLabel(pedido.tipo)}</Badge></div>
                      </div>
                      {pedido.valorTotal && (
                        <div className="pt-2 border-t border-border">
                          <p className="text-xs text-muted-foreground">Valor Total</p>
                          <p className="text-lg font-bold text-primary">R$ {pedido.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                      )}
                    </div>
                    <div className="lg:flex-1 lg:border-l lg:pl-6 space-y-4">
                      <div><p className="text-sm font-medium text-foreground mb-4">Progresso do Pedido</p><PedidoTimeline etapas={gerarEtapasPipeline(pedido.status)} orientacao="horizontal" /></div>
                      {pedido.sla.status !== 'entregue' && (
                        <div className="pt-4 border-t border-border">
                          <div className="flex items-center justify-between mb-2"><span className="text-xs font-medium text-muted-foreground">SLA</span><span className={`text-xs font-medium ${pedido.sla.color}`}>{pedido.sla.label}</span></div>
                          <Progress value={Math.max(0, Math.min(100, (pedido.sla.diasRestantes / 7) * 100))} className={`h-2 ${pedido.sla.status === 'atrasado' ? '[&>div]:bg-destructive' : pedido.sla.status === 'critico' || pedido.sla.status === 'atencao' ? '[&>div]:bg-warning' : '[&>div]:bg-success'}`} />
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      <Dialog open={!!pedidoDetalhes} onOpenChange={() => setPedidoDetalhes(null)}>
        <DialogContent aria-describedby="dialog-desc" className="max-w-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-primary" />Detalhes do Pedido #{pedidoDetalhes?.id}</DialogTitle></DialogHeader>
          {pedidoDetalhes && (() => {
            const slaInfo = calcularSLA(pedidoDetalhes.prazoEntrega, pedidoDetalhes.status);
            const SLAIcon = slaInfo.icon;
            return (
              <div className="space-y-6">
                {slaInfo.status !== 'entregue' && (
                  <div className={`p-4 rounded-lg ${slaInfo.bgColor} border ${slaInfo.status === 'atrasado' || slaInfo.status === 'critico' ? 'border-destructive/30' : 'border-transparent'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3"><SLAIcon className={`w-6 h-6 ${slaInfo.color}`} /><div><p className={`font-semibold ${slaInfo.color}`}>{slaInfo.label}</p><p className="text-xs text-muted-foreground">Prazo: {new Date(pedidoDetalhes.prazoEntrega).toLocaleDateString('pt-BR')}</p></div></div>
                      <Badge className={`${slaInfo.bgColor} ${slaInfo.color} border-0`}>{slaInfo.status === 'atrasado' ? 'ATRASADO' : slaInfo.status === 'critico' ? 'CRÍTICO' : slaInfo.status === 'atencao' ? 'ATENÇÃO' : 'NO PRAZO'}</Badge>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-muted-foreground">Produto</p><p className="font-medium">{pedidoDetalhes.produto}</p></div>
                  <div><p className="text-xs text-muted-foreground">Quantidade</p><p className="font-medium">{pedidoDetalhes.quantidade} un</p></div>
                  <div><p className="text-xs text-muted-foreground">Empresa</p><p className="font-medium">{pedidoDetalhes.empresa}</p></div>
                  <div><p className="text-xs text-muted-foreground">Fornecedor</p><p className="font-medium">{pedidoDetalhes.fornecedorSelecionado || '-'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Tipo</p><p className="font-medium">{getTipoLabel(pedidoDetalhes.tipo)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Prazo de Entrega</p><p className={`font-medium ${slaInfo.status === 'atrasado' || slaInfo.status === 'critico' ? slaInfo.color : ''}`}>{new Date(pedidoDetalhes.prazoEntrega).toLocaleDateString('pt-BR')}</p></div>
                </div>
                {pedidoDetalhes.valorTotal && (
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex justify-between items-center">
                      <div><p className="text-xs text-muted-foreground">Valor Unitário</p><p className="font-medium">R$ {pedidoDetalhes.valorUnitario?.toFixed(2)}</p></div>
                      <div className="text-right"><p className="text-xs text-muted-foreground">Valor Total</p><p className="text-xl font-bold text-primary">R$ {pedidoDetalhes.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
                    </div>
                  </div>
                )}
                <div><p className="text-sm font-medium text-foreground mb-4">Histórico Completo do Pipeline</p><EnhancedPedidoTimeline etapas={gerarEtapasEnhanced(pedidoDetalhes)} pedidoNumero={pedidoDetalhes.id} /></div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Acompanhamento;
