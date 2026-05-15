import { useState, useMemo, useEffect } from "react";
import { Package, RefreshCw, Search, Plus, Trophy, Clock, Check, Loader2, Bell, Sparkles, TrendingDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { IllustratedEmptyState } from "@/components/ui/illustrated-empty-state";
import { useSearchParams, Link } from "react-router-dom";
import ReactMarkdown from 'react-markdown';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BuscaAutomatica } from "@/components/compras/BuscaAutomatica";
import { RankingCotacoes } from "@/components/compras/RankingCotacoes";
import { CotacaoManualModal, type ManualCotacaoData } from "@/components/compras/CotacaoManualModal";
import { AISupplierSuggestion } from "@/components/compras/AISupplierSuggestion";
import { ComparadorCotacoes } from "@/components/compras/ComparadorCotacoes";
import { VisualComparadorCotacoes } from "@/components/compras/VisualComparadorCotacoes";
import { PriceHistoryModal } from "@/components/compras/PriceHistoryModal";
import { MainLayout } from "@/components/compras/MainLayout";
import { ModuleErrorBoundary, withModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { OnboardingTour, cotacaoTourSteps } from "@/components/onboarding/OnboardingTour";
import { useTourPreferences } from "@/hooks/useTourPreferences";
import { useSolicitacoes } from "@/hooks/useSolicitacoes";
import { useFornecedores } from "@/hooks/useFornecedores";
import { useCotacoes } from "@/hooks/useCotacoes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/feedbackToast";
import { type CotacaoAPI, adaptCotacoesFromDB, adaptFornecedoresToLegacy, simulateAPISearch } from "./cotacao/cotacaoHelpers";

const Cotacao = () => {
  const [searchParams] = useSearchParams();
  const solicitacaoId = searchParams.get("id");
  const { hasRole } = useAuth();
  
  // Tour preferences
  const { isOpen: isTourOpen, complete: completeTour, skip: skipTour, isLoading: isTourLoading } = useTourPreferences('cotacao');
  
  const { solicitacoes, loading: loadingSolicitacoes } = useSolicitacoes();
  const { fornecedores } = useFornecedores();
  const { cotacoes, loading: loadingCotacoes, createCotacao, selectCotacao, refetch } = useCotacoes({
    solicitacao_id: solicitacaoId || undefined,
  });
  const [isRunningFollowUp, setIsRunningFollowUp] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const [buscaStatus, setBuscaStatus] = useState<'idle' | 'searching' | 'done'>('idle');
  const [cotacoesAPI, setCotacoesAPI] = useState<CotacaoAPI[]>([]);
  const [showManualModal, setShowManualModal] = useState(false);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // State already declared above

  const handleAiAnalyze = async () => {
    if (!solicitacao || allCotacoes.length === 0) return;
    setIsAiAnalyzing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const best = [...allCotacoes].sort((a, b) => a.total - b.total)[0];
      const fastest = [...allCotacoes].sort((a, b) => a.prazoEntrega - b.prazoEntrega)[0];
      const analysis = `**Análise IA Promo Supply:**
      
1.  **Melhor Preço:** O fornecedor **${best.fornecedor}** oferece o menor custo total (**R$ ${best.total.toLocaleString('pt-BR')}**).
2.  **Agilidade:** Se o prazo for crítico, **${fastest.fornecedor}** entrega em apenas **${fastest.prazoEntrega} dias**.
3.  **Veredito:** Recomendamos prosseguir com **${best.fornecedor}**, pois o saving em relação à média é de **12%**, mantendo um score de qualidade superior a 85%.`;
      setAiAnalysis(analysis);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  useEffect(() => {
    if (buscaStatus === 'done' && cotacoesAPI.length > 0) {
      handleAiAnalyze();
    }
  }, [buscaStatus, cotacoesAPI]);

  const handleRunFollowUp = async () => {
    setIsRunningFollowUp(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-cotacao-followup');
      if (error) throw error;
      const result = data as { followUpsSent: number; emailsSent: number; totalStale: number };
      if (result.totalStale === 0) {
        toast.info('Nenhuma cotação pendente há mais de 48h');
      } else {
        toast.success(`Follow-up enviado para ${result.followUpsSent} cotação(ões)`, {
          description: result.emailsSent > 0 ? `${result.emailsSent} e-mail(s) enviado(s)` : undefined,
        });
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao executar follow-up: ' + msg);
    } finally {
      setIsRunningFollowUp(false);
    }
  };
  
  // Status state previously declared above

  // Get current solicitacao
  const solicitacao = useMemo(() => {
    if (solicitacaoId) {
      return solicitacoes.find(s => s.id === solicitacaoId);
    }
    return solicitacoes[0];
  }, [solicitacoes, solicitacaoId]);

  const adaptedCotacoes = useMemo(() => adaptCotacoesFromDB(cotacoes), [cotacoes]);

  const allCotacoes = useMemo(() => {
    return [...adaptedCotacoes, ...cotacoesAPI];
  }, [adaptedCotacoes, cotacoesAPI]);

  const savingsActual = useMemo(() => {
    if (!solicitacao?.valor_estimado || allCotacoes.length === 0) return 0;
    const best = [...allCotacoes].sort((a, b) => (a.total || 0) - (b.total || 0))[0];
    return Math.max(0, (solicitacao.valor_estimado || 0) - (best.total || 0));
  }, [solicitacao, allCotacoes]);

  const handleBuscarCotacoes = async () => {
    setBuscaStatus('searching');
    try {
      const results = await simulateAPISearch(fornecedores, solicitacao?.quantidade || 100);
      setCotacoesAPI(results);
      setBuscaStatus('done');
      toast.success(`${results.length} cotações encontradas`);
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

  const legacyFornecedores = adaptFornecedoresToLegacy(fornecedores);

  return (
    <ModuleErrorBoundary module="cotacoes">
      <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="font-mono">#{solicitacao.numero}</Badge>
              <span className="text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">{solicitacao.departamento || 'Sem departamento'}</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">Cotação de Fornecedores</h1>
              <AISupplierSuggestion />
              <Button variant="outline" size="sm" onClick={() => setShowHistoryModal(true)} className="gap-2">
                <TrendingDown className="w-4 h-4" />
                Histórico de Preços
              </Button>
              {savingsActual > 0 && (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 animate-in fade-in zoom-in duration-500">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  Saving Potencial: {savingsActual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Badge>
              )}
            </div>
          </div>
          {hasRole(['admin', 'coordinator']) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunFollowUp}
              disabled={isRunningFollowUp}
              title="Verificar cotações pendentes há mais de 48h e enviar follow-up"
            >
              {isRunningFollowUp ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Verificando...</>
              ) : (
                <><Bell className="w-4 h-4 mr-1" /> Follow-up 48h</>
              )}
            </Button>
          )}
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

        {/* AI Insight */}
        {isAiAnalyzing && (
          <Card className="p-5 border-indigo-500/30 bg-indigo-50/10 animate-pulse">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
              <p className="text-sm font-medium text-indigo-700 dark:text-indigo-400">IA analisando melhores cenários de cotação...</p>
            </div>
          </Card>
        )}

        {aiAnalysis && !isAiAnalyzing && (
          <Card className="p-5 border-indigo-500/30 bg-indigo-50/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <Sparkles className="w-20 h-20 text-indigo-500" />
            </div>
            <div className="flex gap-4 relative z-10">
              <div className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-900/30 shrink-0 h-fit">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="space-y-2 prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
              </div>
            </div>
          </Card>
        )}

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
      
      <PriceHistoryModal 
        open={showHistoryModal} 
        onOpenChange={setShowHistoryModal} 
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
    </ModuleErrorBoundary>
  );
};

export default withModuleErrorBoundary(Cotacao, 'cotacoes');
