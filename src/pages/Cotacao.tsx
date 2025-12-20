import { useState } from "react";
import { Package, RefreshCw, Search, Plus, Trophy, Clock, Check, Loader2 } from "lucide-react";
import { useSearchParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BuscaAutomatica } from "@/components/compras/BuscaAutomatica";
import { RankingCotacoes } from "@/components/compras/RankingCotacoes";
import { CotacaoManualModal } from "@/components/compras/CotacaoManualModal";
import { ComparadorCotacoes } from "@/components/compras/ComparadorCotacoes";
import { MainLayout } from "@/components/compras/MainLayout";
import { solicitacoesMock, fornecedoresMock, getTipoLabel } from "@/data/mockData";

const Cotacao = () => {
  const [searchParams] = useSearchParams();
  const solicitacaoId = searchParams.get("id") || "2638-1";
  
  const solicitacao = solicitacoesMock.find(s => s.id === solicitacaoId) || solicitacoesMock[0];
  
  const [buscaStatus, setBuscaStatus] = useState<'idle' | 'searching' | 'done'>('idle');
  const [cotacoesEncontradas, setCotacoesEncontradas] = useState<any[]>([]);
  const [showManualModal, setShowManualModal] = useState(false);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<string | null>(null);

  const handleBuscarCotacoes = () => {
    setBuscaStatus('searching');
    
    setTimeout(() => {
      setCotacoesEncontradas([
        { 
          id: '1', 
          fornecedor: 'XBZ Brindes', 
          status: 'encontrado',
          valorUnitario: 22.50, 
          quantidadeDisponivel: 500, 
          prazoEntrega: 2, 
          frete: 0,
          freteInfo: 'Incluso SP',
          condicaoPagamento: 'À vista',
          total: 11475,
        },
        { 
          id: '2', 
          fornecedor: 'Stricker / Spot', 
          status: 'encontrado',
          valorUnitario: 24.00, 
          quantidadeDisponivel: 320, 
          prazoEntrega: 3, 
          frete: 150,
          freteInfo: '+R$ 150',
          condicaoPagamento: 'À vista',
          total: 12390,
          alerta: 'falta 180 un'
        },
        { 
          id: '3', 
          fornecedor: 'Asia Import', 
          status: 'encontrado',
          valorUnitario: 25.50, 
          quantidadeDisponivel: 1000, 
          prazoEntrega: 5, 
          frete: 200,
          freteInfo: '+R$ 200',
          condicaoPagamento: '30 dias',
          total: 13205,
        },
        { 
          id: '4', 
          fornecedor: 'Só Marcas', 
          status: 'nao_encontrado',
        },
      ]);
      setBuscaStatus('done');
    }, 2500);
  };

  const handleSelecionarFornecedor = (fornecedorId: string) => {
    setFornecedorSelecionado(fornecedorId);
  };

  const handleAdicionarCotacaoManual = (cotacao: any) => {
    setCotacoesEncontradas(prev => [...prev, {
      ...cotacao,
      id: `manual-${Date.now()}`,
      status: 'encontrado',
      total: (cotacao.valorUnitario * solicitacao.quantidadeReal) + cotacao.frete,
    }]);
    setShowManualModal(false);
  };

  const prazoRestante = () => {
    const prazo = new Date(solicitacao.prazoEntrega);
    const hoje = new Date();
    const diff = Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="font-mono">#{solicitacao.id}</Badge>
            <span className="text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">{solicitacao.empresa}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Cotação de Fornecedores</h1>
        </div>

        {/* Info do Produto */}
        <Card className="p-5 border-primary/20 bg-primary/5">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-foreground">{solicitacao.produto}</h2>
                  <p className="text-sm text-muted-foreground">SKU: {solicitacao.id.toUpperCase()}</p>
                </div>
                <Badge variant="secondary">{getTipoLabel(solicitacao.tipo)}</Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <div>
                  <p className="text-xs text-muted-foreground">Quantidade</p>
                  <p className="font-semibold text-foreground">
                    {solicitacao.quantidade} un <span className="text-xs text-muted-foreground">(+2% = {solicitacao.quantidadeReal} un)</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Prazo máximo</p>
                  <p className="font-semibold text-foreground">
                    {new Date(solicitacao.prazoEntrega).toLocaleDateString('pt-BR')}
                    <span className="text-xs text-muted-foreground ml-1">({prazoRestante()} dias)</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vendedor</p>
                  <p className="font-semibold text-foreground">{solicitacao.vendedor}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="font-semibold text-foreground truncate">{solicitacao.empresa}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Busca Automática */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              Busca Automática (APIs)
            </h3>
            <Button 
              onClick={handleBuscarCotacoes} 
              disabled={buscaStatus === 'searching'}
              variant={buscaStatus === 'done' ? 'outline' : 'default'}
            >
              {buscaStatus === 'searching' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {buscaStatus === 'done' ? 'Atualizar' : 'Buscar Cotações'}
                </>
              )}
            </Button>
          </div>

          <BuscaAutomatica 
            status={buscaStatus} 
            resultados={cotacoesEncontradas} 
          />
        </Card>

        {/* Ranking de Cotações */}
        {buscaStatus === 'done' && cotacoesEncontradas.filter(c => c.status === 'encontrado').length > 0 && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Ranking de Cotações
              </h3>
              
              {/* Comparador de Cotações */}
              <ComparadorCotacoes 
                cotacoes={cotacoesEncontradas.filter(c => c.status === 'encontrado')}
                quantidade={solicitacao.quantidadeReal}
                onSelecionar={handleSelecionarFornecedor}
              />
            </div>

            <RankingCotacoes 
              cotacoes={cotacoesEncontradas.filter(c => c.status === 'encontrado')}
              quantidade={solicitacao.quantidadeReal}
              onSelecionar={handleSelecionarFornecedor}
              selecionado={fornecedorSelecionado}
            />
          </Card>
        )}

        {/* Cotação Manual */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Cotação Manual (Fornecedores Secundários)
            </h3>
            <Button variant="outline" onClick={() => setShowManualModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Cotação
            </Button>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Enviar solicitação para fornecedores não integrados ou adicionar cotações recebidas manualmente.
            </p>
            
            <div className="flex flex-wrap gap-2">
              {fornecedoresMock.filter(f => !f.apiIntegrada).map(f => (
                <Badge 
                  key={f.id} 
                  variant="outline" 
                  className="cursor-pointer hover:bg-accent"
                >
                  {f.nomeFantasia} (WhatsApp)
                </Badge>
              ))}
            </div>
          </div>
        </Card>

        {/* Ações */}
        {fornecedorSelecionado && (
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setFornecedorSelecionado(null)}>
              Cancelar Seleção
            </Button>
            <Button asChild className="bg-green-600 hover:bg-green-700">
              <Link to={`/gerar-ordem?id=${solicitacaoId}`}>
                <Check className="w-4 h-4 mr-2" />
                Gerar Pedido
              </Link>
            </Button>
          </div>
        )}
      </div>

      <CotacaoManualModal
        open={showManualModal}
        onOpenChange={setShowManualModal}
        onSave={handleAdicionarCotacaoManual}
        fornecedores={fornecedoresMock}
      />
    </MainLayout>
  );
};

export default Cotacao;
