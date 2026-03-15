import { useState, useMemo } from "react";
import { IllustratedEmptyState } from "@/components/ui/illustrated-empty-state";
import { 
  Eye, 
  Search, 
  Filter, 
  Package, 
  Clock,
  Building2,
  User,
  Calendar,
  Truck,
  MapPin,
  LayoutList,
  LayoutGrid,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Timer,
  TrendingDown
} from "lucide-react";
import { MainLayout } from "@/components/compras/MainLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PedidoTimeline, EtapaPipeline } from "@/components/compras/PedidoTimeline";
import { EnhancedPedidoTimeline, TimelineStep } from "@/components/compras/EnhancedPedidoTimeline";
import { KanbanBoard } from "@/components/compras/KanbanBoard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/feedbackToast";
import { differenceInDays, differenceInHours, isPast, isToday, isTomorrow, parseISO } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

// Tipos de SLA
type SLAStatus = 'atrasado' | 'critico' | 'atencao' | 'no_prazo' | 'entregue';

// Local type to replace mock Solicitacao
interface AcompanhamentoPedido {
  id: string;
  produto: string;
  quantidade: number;
  quantidadeReal: number;
  status: string;
  empresa: string;
  vendedor: string;
  prazoEntrega: string;
  fornecedorSelecionado: string | null;
  valorTotal: number | null;
  valorUnitario: number | null;
  createdAt: string;
  tipo: string;
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'pendente': 'Pendente',
    'aprovada': 'Aprovada',
    'em_cotacao': 'Em Cotação',
    'cotada': 'Cotada',
    'em_analise': 'Em Análise',
    'aprovada_compra': 'Aprovada p/ Compra',
    'em_pedido': 'Em Pedido',
    'entregue': 'Entregue',
    'cancelada': 'Cancelada',
    'concluida': 'Concluída',
    'AGUARDANDO_COTACAO': 'Aguardando Cotação',
    'EM_COTACAO': 'Em Cotação',
    'FORNECEDOR_SELECIONADO': 'Fornecedor Selecionado',
    'PEDIDO_GERADO': 'Pedido Gerado',
    'AGUARDANDO_PAGAMENTO': 'Aguardando Pagamento',
    'PAGO': 'Pago',
    'EM_TRANSITO': 'Em Trânsito',
    'ENTREGUE': 'Entregue',
  };
  return labels[status] || status;
};

const getTipoLabel = (tipo: string): string => {
  const labels: Record<string, string> = {
    'produto': 'Produto',
    'servico': 'Serviço',
    'material': 'Material',
    'pe_liso': 'P.E. Liso',
    'fabricacao_liso': 'Fab. Liso',
    'fabricacao_personalizado': 'Fab. Personalizado',
  };
  return labels[tipo] || tipo;
};

interface SLAInfo {
  status: SLAStatus;
  diasRestantes: number;
  horasRestantes?: number;
  label: string;
  color: string;
  bgColor: string;
  icon: typeof AlertTriangle;
}

// Calcula informações de SLA
const calcularSLA = (prazoEntrega: string, statusPedido: string): SLAInfo => {
  if (statusPedido === 'ENTREGUE') {
    return {
      status: 'entregue',
      diasRestantes: 0,
      label: 'Entregue',
      color: 'text-success',
      bgColor: 'bg-success/10',
      icon: CheckCircle2
    };
  }

  const prazo = parseISO(prazoEntrega);
  const hoje = new Date();
  const diasRestantes = differenceInDays(prazo, hoje);
  const horasRestantes = differenceInHours(prazo, hoje);

  if (isPast(prazo) && !isToday(prazo)) {
    return {
      status: 'atrasado',
      diasRestantes,
      label: `${Math.abs(diasRestantes)} dia${Math.abs(diasRestantes) !== 1 ? 's' : ''} atrasado`,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      icon: AlertCircle
    };
  }

  if (isToday(prazo)) {
    return {
      status: 'critico',
      diasRestantes: 0,
      horasRestantes,
      label: 'Vence HOJE',
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      icon: AlertTriangle
    };
  }

  if (isTomorrow(prazo)) {
    return {
      status: 'critico',
      diasRestantes: 1,
      label: 'Vence AMANHÃ',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      icon: AlertTriangle
    };
  }

  if (diasRestantes <= 3) {
    return {
      status: 'atencao',
      diasRestantes,
      label: `${diasRestantes} dias restantes`,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      icon: Timer
    };
  }

  return {
    status: 'no_prazo',
    diasRestantes,
    label: `${diasRestantes} dias restantes`,
    color: 'text-success',
    bgColor: 'bg-success/10',
    icon: CheckCircle2
  };
};

// Gera etapas do pipeline baseado no status atual
const gerarEtapasPipeline = (status: string): EtapaPipeline[] => {
  const todasEtapas = [
    { id: 'solicitacao', nome: 'Solicitação' },
    { id: 'cotacao', nome: 'Cotação' },
    { id: 'pedido', nome: 'Pedido' },
    { id: 'pagamento', nome: 'Pagamento' },
    { id: 'transito', nome: 'Em Trânsito' },
    { id: 'entregue', nome: 'Entregue' },
  ];

  const statusOrdem: Record<string, number> = {
    AGUARDANDO_COTACAO: 0,
    EM_COTACAO: 1,
    FORNECEDOR_SELECIONADO: 2,
    PEDIDO_GERADO: 2,
    AGUARDANDO_PAGAMENTO: 3,
    PAGO: 4,
    EM_TRANSITO: 4,
    ENTREGUE: 5,
  };

  const etapaAtual = statusOrdem[status] ?? 0;

  return todasEtapas.map((etapa, index) => ({
    ...etapa,
    status: index < etapaAtual ? 'concluido' : index === etapaAtual ? 'atual' : 'pendente',
    data: index < etapaAtual ? '15/12/2025' : index === etapaAtual ? 'Agora' : undefined,
  }));
};

// Gera etapas aprimoradas do pipeline com mais detalhes
const gerarEtapasEnhanced = (pedido: AcompanhamentoPedido): TimelineStep[] => {
  const statusOrdem: Record<string, number> = {
    AGUARDANDO_COTACAO: 0,
    EM_COTACAO: 1,
    FORNECEDOR_SELECIONADO: 2,
    PEDIDO_GERADO: 2,
    AGUARDANDO_PAGAMENTO: 3,
    PAGO: 4,
    EM_TRANSITO: 4,
    ENTREGUE: 5,
  };

  const etapaAtual = statusOrdem[pedido.status] ?? 0;
  const dataBase = new Date(pedido.createdAt);

  const todasEtapas: TimelineStep[] = [
    { 
      id: 'solicitacao', 
      nome: 'Solicitação Criada',
      status: 'pendente',
      dataReal: pedido.createdAt,
      data: new Date(pedido.createdAt).toLocaleDateString('pt-BR'),
      descricao: `Solicitação de ${pedido.quantidade} unidades de ${pedido.produto}`,
      responsavel: 'Sistema',
      duracao: '< 1 min',
    },
    { 
      id: 'cotacao', 
      nome: 'Cotação Enviada',
      status: 'pendente',
      dataReal: new Date(dataBase.getTime() + 86400000).toISOString(),
      data: new Date(dataBase.getTime() + 86400000).toLocaleDateString('pt-BR'),
      descricao: 'Cotações solicitadas a 3 fornecedores',
      responsavel: 'Equipe de Compras',
      duracao: '24 horas',
    },
    { 
      id: 'selecao', 
      nome: 'Fornecedor Selecionado',
      status: 'pendente',
      dataReal: new Date(dataBase.getTime() + 172800000).toISOString(),
      data: new Date(dataBase.getTime() + 172800000).toLocaleDateString('pt-BR'),
      descricao: pedido.fornecedorSelecionado ? `Selecionado: ${pedido.fornecedorSelecionado}` : 'Aguardando seleção',
      responsavel: 'Gestor de Compras',
      duracao: '2 dias',
    },
    { 
      id: 'pedido', 
      nome: 'Pedido Gerado',
      status: 'pendente',
      dataReal: new Date(dataBase.getTime() + 259200000).toISOString(),
      data: new Date(dataBase.getTime() + 259200000).toLocaleDateString('pt-BR'),
      descricao: 'Ordem de compra emitida',
      responsavel: 'Sistema',
      duracao: '< 1 hora',
      documentos: [{ nome: 'OC-' + pedido.id + '.pdf', url: '#' }],
    },
    { 
      id: 'pagamento', 
      nome: 'Pagamento Realizado',
      status: 'pendente',
      dataReal: new Date(dataBase.getTime() + 345600000).toISOString(),
      data: new Date(dataBase.getTime() + 345600000).toLocaleDateString('pt-BR'),
      descricao: pedido.valorTotal ? `Valor: R$ ${pedido.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Aguardando pagamento',
      responsavel: 'Financeiro',
      duracao: '1-3 dias',
      documentos: pedido.valorTotal ? [{ nome: 'NF-' + pedido.id + '.pdf', url: '#' }] : undefined,
    },
    { 
      id: 'transito', 
      nome: 'Em Trânsito',
      status: 'pendente',
      dataReal: new Date(dataBase.getTime() + 432000000).toISOString(),
      data: new Date(dataBase.getTime() + 432000000).toLocaleDateString('pt-BR'),
      descricao: 'Produto em transporte para entrega',
      responsavel: 'Transportadora',
      duracao: '2-5 dias',
      observacoes: 'Código de rastreamento disponível',
    },
    { 
      id: 'entregue', 
      nome: 'Entregue',
      status: 'pendente',
      data: new Date(pedido.prazoEntrega).toLocaleDateString('pt-BR'),
      descricao: 'Produto entregue e conferido',
      responsavel: 'Almoxarifado',
    },
  ];

  return todasEtapas.map((etapa, index) => ({
    ...etapa,
    status: index < etapaAtual ? 'concluido' : index === etapaAtual ? 'atual' : 'pendente',
  }));
};

// Pedidos em acompanhamento (filtra apenas os que já passaram da cotação)
const pedidosAcompanhamento = solicitacoesMock.filter(s => 
  ['FORNECEDOR_SELECIONADO', 'PEDIDO_GERADO', 'AGUARDANDO_PAGAMENTO', 'PAGO', 'EM_TRANSITO', 'ENTREGUE'].includes(s.status)
);

const Acompanhamento = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [pedidoDetalhes, setPedidoDetalhes] = useState<AcompanhamentoPedido | null>(null);
  const [viewMode, setViewMode] = useState<'lista' | 'kanban'>('lista');
  const [filtroSLA, setFiltroSLA] = useState<'todos' | 'atrasados' | 'criticos' | 'atencao'>('todos');

  // Realtime
  useRealtimeSubscription({ tables: ['pedidos', 'solicitacoes'] });

  // Fetch pedidos from Supabase
  const { data: pedidosDB = [], isLoading } = useQuery({
    queryKey: ['acompanhamento-pedidos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          id, numero, status, valor_total, data_previsao, data_emissao, created_at,
          fornecedor_id,
          solicitacao_id
        `)
        .not('status', 'in', '(cancelado)');
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  const { data: solicitacoesDB = [] } = useQuery({
    queryKey: ['acompanhamento-solicitacoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('solicitacoes')
        .select('id, descricao, quantidade, data_necessidade, status, created_at');
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  const { data: fornecedoresDB = [] } = useQuery({
    queryKey: ['acompanhamento-fornecedores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('id, razao_social, nome_fantasia');
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  // Map DB data to the component's expected shape
  const pedidosState = useMemo<AcompanhamentoPedido[]>(() => {
    return pedidosDB.map(p => {
      const sol = solicitacoesDB.find(s => s.id === p.solicitacao_id);
      const forn = fornecedoresDB.find(f => f.id === p.fornecedor_id);
      return {
        id: p.numero || p.id.slice(0, 8),
        produto: sol?.descricao || `Pedido ${p.numero}`,
        quantidade: sol?.quantidade || 0,
        quantidadeReal: sol?.quantidade || 0,
        status: mapPedidoStatus(p.status),
        empresa: 'Promo Supply',
        vendedor: '',
        prazoEntrega: p.data_previsao || sol?.data_necessidade || new Date().toISOString(),
        fornecedorSelecionado: forn?.nome_fantasia || forn?.razao_social || null,
        valorTotal: Number(p.valor_total) || null,
        valorUnitario: null,
        createdAt: p.created_at,
        tipo: 'produto',
      };
    });
  }, [pedidosDB, solicitacoesDB, fornecedoresDB]);

  // Calcula estatísticas de SLA
  const pedidosComSLA = pedidosState.map(p => ({
    ...p,
    sla: calcularSLA(p.prazoEntrega, p.status)
  }));

  const atrasados = pedidosComSLA.filter(p => p.sla.status === 'atrasado');
  const criticos = pedidosComSLA.filter(p => p.sla.status === 'critico');
  const emAtencao = pedidosComSLA.filter(p => p.sla.status === 'atencao');
  const noPrazo = pedidosComSLA.filter(p => p.sla.status === 'no_prazo' || p.sla.status === 'entregue');

  // Filtro de pedidos
  let pedidosFiltrados = pedidosComSLA.filter(pedido =>
    pedido.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pedido.produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pedido.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pedido.fornecedorSelecionado?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Aplica filtro de SLA
  if (filtroSLA !== 'todos') {
    pedidosFiltrados = pedidosFiltrados.filter(p => {
      if (filtroSLA === 'atrasados') return p.sla.status === 'atrasado';
      if (filtroSLA === 'criticos') return p.sla.status === 'critico';
      if (filtroSLA === 'atencao') return p.sla.status === 'atencao';
      return true;
    });
  }

  const handleStatusChange = (pedidoId: string, novoStatus: string) => {
    setPedidosState(prev => prev.map(p => 
      p.id === pedidoId ? { ...p, status: novoStatus as Solicitacao['status'] } : p
    ));
    toast.success(`Pedido #${pedidoId} movido para ${getStatusLabel(novoStatus as Solicitacao['status'])}`);
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      FORNECEDOR_SELECIONADO: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      PEDIDO_GERADO: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
      AGUARDANDO_PAGAMENTO: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      PAGO: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
      EM_TRANSITO: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      ENTREGUE: "bg-success/10 text-success border-success/20",
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Truck className="w-6 h-6 text-primary" />
              Acompanhamento
            </h1>
            <p className="text-sm text-muted-foreground">Acompanhe o progresso dos pedidos através do pipeline</p>
          </div>
          
          {/* Toggle View */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === 'lista' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('lista')}
              className="gap-2"
            >
              <LayoutList className="w-4 h-4" />
              Lista
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="gap-2"
            >
              <LayoutGrid className="w-4 h-4" />
              Kanban
            </Button>
          </div>
        </div>

        {/* KPIs de SLA */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card 
            className={`p-4 cursor-pointer transition-all ${filtroSLA === 'atrasados' ? 'ring-2 ring-destructive' : 'hover:shadow-md'}`}
            onClick={() => setFiltroSLA(filtroSLA === 'atrasados' ? 'todos' : 'atrasados')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{atrasados.length}</p>
                <p className="text-xs text-muted-foreground">Atrasados</p>
              </div>
            </div>
          </Card>
          <Card 
            className={`p-4 cursor-pointer transition-all ${filtroSLA === 'criticos' ? 'ring-2 ring-orange-500' : 'hover:shadow-md'}`}
            onClick={() => setFiltroSLA(filtroSLA === 'criticos' ? 'todos' : 'criticos')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-500">{criticos.length}</p>
                <p className="text-xs text-muted-foreground">Críticos</p>
              </div>
            </div>
          </Card>
          <Card 
            className={`p-4 cursor-pointer transition-all ${filtroSLA === 'atencao' ? 'ring-2 ring-yellow-500' : 'hover:shadow-md'}`}
            onClick={() => setFiltroSLA(filtroSLA === 'atencao' ? 'todos' : 'atencao')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Timer className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{emAtencao.length}</p>
                <p className="text-xs text-muted-foreground">Atenção</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Truck className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {pedidosComSLA.filter(p => ['PAGO', 'EM_TRANSITO'].includes(p.status)).length}
                </p>
                <p className="text-xs text-muted-foreground">Em Trânsito</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{noPrazo.length}</p>
                <p className="text-xs text-muted-foreground">No Prazo</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Alerta de pedidos críticos */}
        {(atrasados.length > 0 || criticos.length > 0) && (
          <Card className="p-4 border-destructive/50 bg-destructive/5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-destructive mb-2">Atenção: Pedidos com SLA crítico!</h3>
                <div className="space-y-2">
                  {[...atrasados, ...criticos].slice(0, 5).map((pedido) => (
                    <div 
                      key={pedido.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-background/80 cursor-pointer hover:bg-background transition-colors"
                      onClick={() => setPedidoDetalhes(pedido)}
                    >
                      <div className="flex items-center gap-3">
                        <Badge className={`${pedido.sla.bgColor} ${pedido.sla.color} border-0`}>
                          #{pedido.id}
                        </Badge>
                        <span className="text-sm font-medium text-foreground">{pedido.produto}</span>
                        <span className="text-xs text-muted-foreground">• {pedido.fornecedorSelecionado}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`${pedido.sla.color} border-current`}>
                          <pedido.sla.icon className="w-3 h-3 mr-1" />
                          {pedido.sla.label}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {(atrasados.length + criticos.length) > 5 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    +{(atrasados.length + criticos.length) - 5} outros pedidos críticos
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Filtros */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID, produto, empresa ou fornecedor..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {filtroSLA !== 'todos' && (
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => setFiltroSLA('todos')}
              >
                Limpar filtro SLA
              </Button>
            )}
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filtros
            </Button>
          </div>
        </Card>

        {/* View Content */}
        {viewMode === 'kanban' ? (
          <KanbanBoard 
            pedidos={pedidosFiltrados}
            onViewDetails={setPedidoDetalhes}
            onStatusChange={handleStatusChange}
          />
        ) : (
          <div className="space-y-4">
            {pedidosFiltrados.length === 0 ? (
              <IllustratedEmptyState
                type="orders"
                title="Nenhum pedido em acompanhamento"
                description="Nenhum pedido corresponde aos filtros atuais. Tente ajustar os critérios de busca."
                action={{ label: "Limpar filtros", onClick: () => { setSearchTerm(''); setFiltroSLA('todos'); }, variant: "outline" }}
              />
            ) : (
              pedidosFiltrados.map((pedido) => {
                const SLAIcon = pedido.sla.icon;
                const isUrgent = pedido.sla.status === 'atrasado' || pedido.sla.status === 'critico';
                
                return (
                  <Card 
                    key={pedido.id} 
                    className={`p-6 hover:shadow-md transition-all ${
                      isUrgent ? 'border-destructive/50 bg-destructive/5' : ''
                    }`}
                  >
                    {/* SLA Banner for urgent items */}
                    {isUrgent && (
                      <div className={`-mx-6 -mt-6 mb-4 px-6 py-2 ${pedido.sla.bgColor} border-b border-destructive/20 flex items-center justify-between`}>
                        <div className="flex items-center gap-2">
                          <SLAIcon className={`w-4 h-4 ${pedido.sla.color}`} />
                          <span className={`text-sm font-medium ${pedido.sla.color}`}>
                            {pedido.sla.label}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Prazo: {new Date(pedido.prazoEntrega).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Info do Pedido */}
                      <div className="lg:w-1/3 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-lg font-bold text-foreground">#{pedido.id}</span>
                              <Badge className={getStatusBadgeColor(pedido.status)}>
                                {getStatusLabel(pedido.status)}
                              </Badge>
                              {!isUrgent && pedido.sla.status !== 'entregue' && (
                                <Badge variant="outline" className={`${pedido.sla.color} border-current gap-1`}>
                                  <SLAIcon className="w-3 h-3" />
                                  {pedido.sla.diasRestantes}d
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium text-foreground mt-1">{pedido.produto}</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setPedidoDetalhes(pedido)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="w-4 h-4" />
                            <span className="truncate">{pedido.empresa}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="w-4 h-4" />
                            <span>Fornecedor: {pedido.fornecedorSelecionado || '-'}</span>
                          </div>
                          <div className={`flex items-center gap-2 ${isUrgent ? pedido.sla.color : 'text-muted-foreground'}`}>
                            <Calendar className="w-4 h-4" />
                            <span>Entrega: {new Date(pedido.prazoEntrega).toLocaleDateString('pt-BR')}</span>
                            {!isUrgent && pedido.sla.status === 'atencao' && (
                              <Badge variant="outline" className="text-yellow-500 border-yellow-500/50 text-xs">
                                <Timer className="w-3 h-3 mr-1" />
                                Atenção
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{pedido.quantidade} un</span>
                            <Badge variant="outline" className="text-xs">{getTipoLabel(pedido.tipo)}</Badge>
                          </div>
                        </div>

                        {pedido.valorTotal && (
                          <div className="pt-2 border-t border-border">
                            <p className="text-xs text-muted-foreground">Valor Total</p>
                            <p className="text-lg font-bold text-primary">
                              R$ {pedido.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Timeline + SLA Progress */}
                      <div className="lg:flex-1 lg:border-l lg:pl-6 space-y-4">
                        <div>
                          <p className="text-sm font-medium text-foreground mb-4">Progresso do Pedido</p>
                          <PedidoTimeline 
                            etapas={gerarEtapasPipeline(pedido.status)} 
                            orientacao="horizontal" 
                          />
                        </div>
                        
                        {/* SLA Progress Bar */}
                        {pedido.sla.status !== 'entregue' && (
                          <div className="pt-4 border-t border-border">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-muted-foreground">SLA</span>
                              <span className={`text-xs font-medium ${pedido.sla.color}`}>
                                {pedido.sla.label}
                              </span>
                            </div>
                            <Progress 
                              value={Math.max(0, Math.min(100, (pedido.sla.diasRestantes / 7) * 100))} 
                              className={`h-2 ${
                                pedido.sla.status === 'atrasado' ? '[&>div]:bg-destructive' :
                                pedido.sla.status === 'critico' ? '[&>div]:bg-orange-500' :
                                pedido.sla.status === 'atencao' ? '[&>div]:bg-yellow-500' :
                                '[&>div]:bg-success'
                              }`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      <Dialog open={!!pedidoDetalhes} onOpenChange={() => setPedidoDetalhes(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Detalhes do Pedido #{pedidoDetalhes?.id}
            </DialogTitle>
          </DialogHeader>

          {pedidoDetalhes && (() => {
            const slaInfo = calcularSLA(pedidoDetalhes.prazoEntrega, pedidoDetalhes.status);
            const SLAIcon = slaInfo.icon;
            
            return (
              <div className="space-y-6">
                {/* SLA Status */}
                {slaInfo.status !== 'entregue' && (
                  <div className={`p-4 rounded-lg ${slaInfo.bgColor} border ${
                    slaInfo.status === 'atrasado' || slaInfo.status === 'critico' 
                      ? 'border-destructive/30' 
                      : 'border-transparent'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <SLAIcon className={`w-6 h-6 ${slaInfo.color}`} />
                        <div>
                          <p className={`font-semibold ${slaInfo.color}`}>{slaInfo.label}</p>
                          <p className="text-xs text-muted-foreground">
                            Prazo: {new Date(pedidoDetalhes.prazoEntrega).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <Badge className={`${slaInfo.bgColor} ${slaInfo.color} border-0`}>
                        {slaInfo.status === 'atrasado' ? 'ATRASADO' :
                         slaInfo.status === 'critico' ? 'CRÍTICO' :
                         slaInfo.status === 'atencao' ? 'ATENÇÃO' : 'NO PRAZO'}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Info básica */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Produto</p>
                    <p className="font-medium">{pedidoDetalhes.produto}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Quantidade</p>
                    <p className="font-medium">{pedidoDetalhes.quantidade} un (+2% = {pedidoDetalhes.quantidadeReal})</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Empresa</p>
                    <p className="font-medium">{pedidoDetalhes.empresa}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fornecedor</p>
                    <p className="font-medium">{pedidoDetalhes.fornecedorSelecionado || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo</p>
                    <p className="font-medium">{getTipoLabel(pedidoDetalhes.tipo)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Prazo de Entrega</p>
                    <p className={`font-medium ${slaInfo.status === 'atrasado' || slaInfo.status === 'critico' ? slaInfo.color : ''}`}>
                      {new Date(pedidoDetalhes.prazoEntrega).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                {/* Valores */}
                {pedidoDetalhes.valorTotal && (
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Valor Unitário</p>
                        <p className="font-medium">R$ {pedidoDetalhes.valorUnitario?.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Valor Total</p>
                        <p className="text-xl font-bold text-primary">
                          R$ {pedidoDetalhes.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timeline Visual Aprimorada */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-4">Histórico Completo do Pipeline</p>
                  <EnhancedPedidoTimeline 
                    etapas={gerarEtapasEnhanced(pedidoDetalhes)} 
                    pedidoNumero={pedidoDetalhes.id}
                    fornecedor={pedidoDetalhes.fornecedorSelecionado}
                    valorTotal={pedidoDetalhes.valorTotal}
                    prazoFinal={pedidoDetalhes.prazoEntrega}
                    orientacao="vertical"
                    showDetails={false}
                  />
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Acompanhamento;
