import { useState, useMemo } from "react";
import { Package, RefreshCw, Search, Plus, Trophy, Clock, Check, Loader2 } from "lucide-react";
import { IllustratedEmptyState } from "@/components/ui/illustrated-empty-state";
import { useSearchParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BuscaAutomatica } from "@/components/compras/BuscaAutomatica";
import { RankingCotacoes } from "@/components/compras/RankingCotacoes";
import { CotacaoManualModal, type ManualCotacaoData } from "@/components/compras/CotacaoManualModal";
import { ComparadorCotacoes } from "@/components/compras/ComparadorCotacoes";
import { VisualComparadorCotacoes } from "@/components/compras/VisualComparadorCotacoes";
import { MainLayout } from "@/components/compras/MainLayout";
import { OnboardingTour, cotacaoTourSteps } from "@/components/onboarding/OnboardingTour";
import { useTourPreferences } from "@/hooks/useTourPreferences";
import { useSolicitacoes } from "@/hooks/useSolicitacoes";
import { useFornecedores } from "@/hooks/useFornecedores";
import { useCotacoes } from "@/hooks/useCotacoes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/feedbackToast";

const Cotacao = () => {
  const [searchParams] = useSearchParams();
  const solicitacaoId = searchParams.get("id");
  
  // Tour preferences
  const { isOpen: isTourOpen, complete: completeTour, skip: skipTour, isLoading: isTourLoading } = useTourPreferences('cotacao');
  
  const { solicitacoes, loading: loadingSolicitacoes } = useSolicitacoes();
  const { fornecedores } = useFornecedores();
  const { cotacoes, loading: loadingCotacoes, createCotacao, selectCotacao, refetch } = useCotacoes({
    solicitacao_id: solicitacaoId || undefined,
  });
  
  const [buscaStatus, setBuscaStatus] = useState<'idle' | 'searching' | 'done'>('idle');
  interface CotacaoAPI {
    id: string;
    fornecedor: string;
    fornecedor_id?: string;
    status: 'encontrado' | 'nao_encontrado' | 'buscando';
    valorUnitario: number;
    quantidadeDisponivel: number;
    prazoEntrega: number;
    frete: number;
    freteInfo: string;
    condicaoPagamento: string;
    total: number;
  }
  
  const [cotacoesAPI, setCotacoesAPI] = useState<CotacaoAPI[]>([]);
  const [showManualModal, setShowManualModal] = useState(false);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<string | null>(null);

  // Get current solicitacao
  const solicitacao = useMemo(() => {
    if (solicitacaoId) {
      return solicitacoes.find(s => s.id === solicitacaoId);
    }
    return solicitacoes[0];
  }, [solicitacoes, solicitacaoId]);

  // Adapt DB cotacoes to legacy format
  const adaptedCotacoes = useMemo(() => {
    return cotacoes.map(c => ({
      id: c.id,
      fornecedor: c.fornecedor?.nome_fantasia || c.fornecedor?.razao_social || 'Fornecedor',
      status: 'encontrado',
      valorUnitario: c.valor_unitario,
      quantidadeDisponivel: c.quantidade,
      prazoEntrega: c.prazo_entrega,
      frete: c.valor_frete,
      freteInfo: c.valor_frete > 0 ? `+R$ ${c.valor_frete}` : 'Incluso',
      condicaoPagamento: c.condicao_pagamento || 'À vista',
      total: c.valor_total,
      selecionada: c.selecionada,
    }));
  }, [cotacoes]);

  // Combine API results with DB cotacoes
  const allCotacoes = useMemo(() => {
    return [...adaptedCotacoes, ...cotacoesAPI];
  }, [adaptedCotacoes, cotacoesAPI]);

  const handleBuscarCotacoes = async () => {
    setBuscaStatus('searching');
    
    try {
      // Simulate API search (would connect to real supplier APIs)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get suppliers with API integration
      const apiSuppliers = fornecedores.filter(f => f.integrado_api);
      
      const results: CotacaoAPI[] = apiSuppliers.map(supplier => {
        const isEncontrado = Math.random() > 0.3;
        const status: 'encontrado' | 'nao_encontrado' = isEncontrado ? 'encontrado' : 'nao_encontrado';
        const valorUnitario = 20 + Math.random() * 15;
        const frete = Math.random() > 0.5 ? Math.floor(50 + Math.random() * 200) : 0;
        return {
          id: `api-${supplier.id}`,
          fornecedor: supplier.nome_fantasia || supplier.razao_social,
          fornecedor_id: supplier.id,
          status,
          valorUnitario,
          quantidadeDisponivel: Math.floor(100 + Math.random() * 500),
          prazoEntrega: Math.floor(2 + Math.random() * 5),
          frete,
          freteInfo: frete > 0 ? `+R$ ${frete}` : 'Incluso',
          condicaoPagamento: ['À vista', '30 dias', '30/60 dias'][Math.floor(Math.random() * 3)],
          total: isEncontrado ? (valorUnitario * (solicitacao?.quantidade || 100)) + frete : 0,
        };
      });

      // Add manual suppliers that aren't in the results
      const manualSuppliers = fornecedores.filter(f => !f.integrado_api).slice(0, 3);
      manualSuppliers.forEach(s => {
        const manualCotacao: CotacaoAPI = {
          id: `manual-${s.id}`,
          fornecedor: s.nome_fantasia || s.razao_social,
          fornecedor_id: s.id,
          status: 'nao_encontrado',
          valorUnitario: 0,
          quantidadeDisponivel: 0,
          prazoEntrega: 0,
          frete: 0,
          freteInfo: '',
          condicaoPagamento: '',
          total: 0,
        };
        results.push(manualCotacao);
      });

      setCotacoesAPI(results.filter(r => r.status === 'encontrado'));
      setBuscaStatus('done');
      toast.success(`${results.filter(r => r.status === 'encontrado').length} cotações encontradas`);
    } catch (error) {
      console.error('Error searching:', error);
      toast.error('Erro ao buscar cotações');
      setBuscaStatus('idle');
    }
  };

  const handleSelecionarFornecedor = async (cotacaoId: string) => {
    // Check if it's a DB cotacao
    const dbCotacao = cotacoes.find(c => c.id === cotacaoId);
    if (dbCotacao) {
      await selectCotacao(cotacaoId);
    }
    setFornecedorSelecionado(cotacaoId);
  };

  const handleAdicionarCotacaoManual = async (cotacaoData: ManualCotacaoData) => {
    if (!solicitacao) {
      toast.error('Selecione uma solicitação primeiro');
      return;
    }

    await createCotacao({
      solicitacao_id: solicitacao.id,
      fornecedor_id: cotacaoData.fornecedor_id,
      valor_unitario: cotacaoData.valorUnitario,
      quantidade: solicitacao.quantidade,
      valor_frete: cotacaoData.frete || 0,
      prazo_entrega: cotacaoData.prazoEntrega || 7,
      condicao_pagamento: cotacaoData.condicaoPagamento,
      observacoes: cotacaoData.observacoes,
    });
    
    setShowManualModal(false);
  };

  const prazoRestante = () => {
    if (!solicitacao?.data_necessidade) return 0;
    const prazo = new Date(solicitacao.data_necessidade);
    const hoje = new Date();
    const diff = Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Loading state
  if (loadingSolicitacoes) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </MainLayout>
    );
  }

  // No solicitacao found
  if (!solicitacao) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-foreground">Cotação de Fornecedores</h1>
          <IllustratedEmptyState
            type="orders"
            title="Nenhuma solicitação selecionada"
            description="Selecione uma solicitação da lista para iniciar o processo de cotação com fornecedores."
            action={{ label: "Ver Solicitações", onClick: () => window.location.href = '/solicitacoes' }}
          />
        </div>
      </MainLayout>
    );
  }

  // Adapt legacy fornecedores for modal
  const legacyFornecedores = fornecedores.map(f => ({
    id: f.id,
    nomeFantasia: f.nome_fantasia || f.razao_social,
    razaoSocial: f.razao_social,
    cnpj: f.cnpj || '',
    tipo: f.tipo === 'internacional' ? 'IMPORTADORA' as const : 
          f.tipo === 'local' ? 'DISTRIBUIDORA' as const : 'FABRICANTE' as const,
    ramos: f.segmento ? [f.segmento] : [],
    vendeProduto: 'AMBOS' as const,
    email: f.email || '',
    telefone: f.telefone || '',
    whatsapp: f.telefone || '',
    apiIntegrada: f.integrado_api,
    rating: Math.round(f.avaliacao),
    totalMes: 0,
    ultimaCompra: '-',
  }));

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="font-mono">#{solicitacao.numero}</Badge>
            <span className="text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">{solicitacao.departamento || 'Sem departamento'}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Cotação de Fornecedores</h1>
        </div>

        {/* Info do Produto */}
        <Card className="p-5 border-primary/20 bg-primary/5" data-tour="cotacao-produto">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-foreground">{solicitacao.titulo}</h2>
                  <p className="text-sm text-muted-foreground">Número: {solicitacao.numero}</p>
                </div>
                <Badge variant="secondary">{solicitacao.tipo}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4 pt-2">
                <div>
                  <p className="text-xs text-muted-foreground">Quantidade</p>
                  <p className="font-semibold text-foreground">
                    {solicitacao.quantidade} {solicitacao.unidade}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Prazo máximo</p>
                  <p className="font-semibold text-foreground">
                    {solicitacao.data_necessidade 
                      ? new Date(solicitacao.data_necessidade).toLocaleDateString('pt-BR')
                      : 'Não definido'
                    }
                    {prazoRestante() > 0 && (
                      <span className="text-xs text-muted-foreground ml-1">({prazoRestante()} dias)</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Prioridade</p>
                  <p className="font-semibold text-foreground capitalize">{solicitacao.prioridade}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor Estimado</p>
                  <p className="font-semibold text-foreground">
                    {solicitacao.valor_estimado 
                      ? solicitacao.valor_estimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      : 'Não definido'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Cotações do Banco */}
        {adaptedCotacoes.length > 0 && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Trophy className="w-5 h-5 text-warning" />
                Cotações Cadastradas ({adaptedCotacoes.length})
              </h3>
            </div>

            <RankingCotacoes 
              cotacoes={adaptedCotacoes}
              quantidade={solicitacao.quantidade}
              onSelecionar={handleSelecionarFornecedor}
              selecionado={fornecedorSelecionado}
            />
          </Card>
        )}

        {/* Busca Automática */}
        <Card className="p-5" data-tour="cotacao-busca">
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
            resultados={cotacoesAPI} 
          />
        </Card>

        {/* Ranking de Cotações API */}
        {buscaStatus === 'done' && cotacoesAPI.length > 0 && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Trophy className="w-5 h-5 text-warning" />
                Cotações via API ({cotacoesAPI.length})
              </h3>
              
              <div className="flex gap-2">
                <ComparadorCotacoes 
                  cotacoes={cotacoesAPI}
                  quantidade={solicitacao.quantidade}
                  onSelecionar={handleSelecionarFornecedor}
                />
                <VisualComparadorCotacoes 
                  cotacoes={cotacoesAPI}
                  quantidade={solicitacao.quantidade}
                  onSelecionar={handleSelecionarFornecedor}
                />
              </div>
            </div>

            <RankingCotacoes 
              cotacoes={cotacoesAPI}
              quantidade={solicitacao.quantidade}
              onSelecionar={handleSelecionarFornecedor}
              selecionado={fornecedorSelecionado}
            />
          </Card>
        )}

        {/* Cotação Manual */}
        <Card className="p-5" data-tour="cotacao-manual">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-info" />
              Cotação Manual
            </h3>
            <Button variant="outline" onClick={() => setShowManualModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Cotação
            </Button>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Adicione cotações recebidas por WhatsApp, email ou telefone.
            </p>
            
            <div className="flex flex-wrap gap-2">
              {legacyFornecedores.filter(f => !f.apiIntegrada).slice(0, 5).map(f => (
                <Badge 
                  key={f.id} 
                  variant="outline" 
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => setShowManualModal(true)}
                >
                  {f.nomeFantasia}
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
            <Button asChild className="bg-success hover:bg-green-700">
              <Link to={`/gerar-ordem?solicitacao=${solicitacao.id}&cotacao=${fornecedorSelecionado}`}>
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
        fornecedores={legacyFornecedores}
      />
      
      {/* Onboarding Tour */}
      {!isTourLoading && (
        <OnboardingTour
          steps={cotacaoTourSteps}
          isOpen={isTourOpen}
          onComplete={completeTour}
          onSkip={skipTour}
        />
      )}
    </MainLayout>
  );
};

export default Cotacao;
