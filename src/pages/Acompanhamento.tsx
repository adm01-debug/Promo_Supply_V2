import { useState } from "react";
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
  MapPin
} from "lucide-react";
import { MainLayout } from "@/components/compras/MainLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PedidoTimeline, EtapaPipeline } from "@/components/compras/PedidoTimeline";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { solicitacoesMock, getStatusLabel, getTipoLabel } from "@/data/mockData";

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

// Pedidos em acompanhamento (filtra apenas os que já passaram da cotação)
const pedidosAcompanhamento = solicitacoesMock.filter(s => 
  ['FORNECEDOR_SELECIONADO', 'PEDIDO_GERADO', 'AGUARDANDO_PAGAMENTO', 'PAGO', 'EM_TRANSITO', 'ENTREGUE'].includes(s.status)
);

const Acompanhamento = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [pedidoDetalhes, setPedidoDetalhes] = useState<typeof solicitacoesMock[0] | null>(null);

  const pedidosFiltrados = pedidosAcompanhamento.filter(pedido =>
    pedido.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pedido.produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pedido.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pedido.fornecedorSelecionado?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        </div>

        {/* KPIs resumidos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {pedidosAcompanhamento.filter(p => p.status === 'AGUARDANDO_PAGAMENTO').length}
                </p>
                <p className="text-xs text-muted-foreground">Aguard. Pagamento</p>
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
                  {pedidosAcompanhamento.filter(p => ['PAGO', 'EM_TRANSITO'].includes(p.status)).length}
                </p>
                <p className="text-xs text-muted-foreground">Em Trânsito</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {pedidosAcompanhamento.filter(p => p.status === 'FORNECEDOR_SELECIONADO' || p.status === 'PEDIDO_GERADO').length}
                </p>
                <p className="text-xs text-muted-foreground">Em Processamento</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {pedidosAcompanhamento.filter(p => p.status === 'ENTREGUE').length}
                </p>
                <p className="text-xs text-muted-foreground">Entregues</p>
              </div>
            </div>
          </Card>
        </div>

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
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filtros
            </Button>
          </div>
        </Card>

        {/* Lista de Pedidos com Timeline */}
        <div className="space-y-4">
          {pedidosFiltrados.length === 0 ? (
            <Card className="p-12 text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum pedido encontrado</h3>
              <p className="text-sm text-muted-foreground">Tente ajustar os filtros de busca</p>
            </Card>
          ) : (
            pedidosFiltrados.map((pedido) => (
              <Card key={pedido.id} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Info do Pedido */}
                  <div className="lg:w-1/3 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-foreground">#{pedido.id}</span>
                          <Badge className={getStatusBadgeColor(pedido.status)}>
                            {getStatusLabel(pedido.status)}
                          </Badge>
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
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>Entrega: {new Date(pedido.prazoEntrega).toLocaleDateString('pt-BR')}</span>
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

                  {/* Timeline */}
                  <div className="lg:flex-1 lg:border-l lg:pl-6">
                    <p className="text-sm font-medium text-foreground mb-4">Progresso do Pedido</p>
                    <PedidoTimeline 
                      etapas={gerarEtapasPipeline(pedido.status)} 
                      orientacao="horizontal" 
                    />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
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

          {pedidoDetalhes && (
            <div className="space-y-6">
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
                  <p className="font-medium">{new Date(pedidoDetalhes.prazoEntrega).toLocaleDateString('pt-BR')}</p>
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

              {/* Timeline Vertical */}
              <div>
                <p className="text-sm font-medium text-foreground mb-4">Histórico do Pipeline</p>
                <PedidoTimeline 
                  etapas={gerarEtapasPipeline(pedidoDetalhes.status)} 
                  orientacao="vertical" 
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Acompanhamento;
