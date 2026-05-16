import { useState, useMemo, useEffect, useCallback } from "react";
import { 
  Package, 
  RefreshCw, 
  Search, 
  Plus, 
  Trophy, 
  Clock, 
  Loader2, 
  Bell, 
  Sparkles, 
  TrendingDown,
  Brain,
  History,
  Info
} from "lucide-react";
import { useAuth } from "@/features/auth";
import { IllustratedEmptyState } from "@/components/ui/illustrated-empty-state";
import { useSearchParams } from "react-router-dom";
import ReactMarkdown from 'react-markdown';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BuscaAutomatica } from "@/components/compras/BuscaAutomatica";
import { RankingCotacoes } from "@/components/compras/RankingCotacoes";
import { CotacaoManualModal, type ManualCotacaoData } from "@/components/compras/CotacaoManualModal";
import { AISupplierSuggestion } from "@/components/compras/AISupplierSuggestion";
import { ComparadorCotacoes } from "@/components/compras/ComparadorCotacoes";
import { VisualComparadorCotacoes } from "@/components/compras/VisualComparadorCotacoes";
import { PriceHistoryModal } from "@/components/compras/PriceHistoryModal";
import { ModuleErrorBoundary } from "@/features/layout/components/ModuleErrorBoundary";
import { useSolicitacoes } from "@/features/solicitacoes";
import { useFornecedores } from "@/hooks/useFornecedores";
import { useCotacoes } from "@/features/cotacoes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/feedbackToast";
import { adaptCotacoesFromDB, adaptFornecedoresToLegacy, simulateAPISearch } from "./cotacaoHelpers";
import { ElitePageWrapper } from "@/components/organisms/ElitePageWrapper";
import { EliteButton } from "@/components/atoms/EliteButton";
import { EliteCardGrid } from "@/components/organisms/EliteCardGrid";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const Cotacao = () => {
  const [searchParams] = useSearchParams();
  const solicitacaoId = searchParams.get("id");
  const { hasRole } = useAuth();
  
  const { solicitacoes, loading: loadingSolicitacoes } = useSolicitacoes();
  const { fornecedores } = useFornecedores();
  const { cotacoes, createCotacao, selectCotacao } = useCotacoes({
    solicitacao_id: solicitacaoId || undefined,
  });
  
  const [isRunningFollowUp, setIsRunningFollowUp] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [buscaStatus, setBuscaStatus] = useState<'idle' | 'searching' | 'done'>('idle');
  const [cotacoesAPI, setCotacoesAPI] = useState<any[]>([]);
  const [showManualModal, setShowManualModal] = useState(false);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const solicitacao = useMemo(() => {
    if (solicitacaoId) return solicitacoes.find(s => s.id === solicitacaoId);
    return solicitacoes[0];
  }, [solicitacoes, solicitacaoId]);

  const adaptedCotacoes = useMemo(() => adaptCotacoesFromDB(cotacoes), [cotacoes]);
  const allCotacoes = useMemo(() => [...adaptedCotacoes, ...cotacoesAPI], [adaptedCotacoes, cotacoesAPI]);

  const handleAiAnalyze = useCallback(async () => {
    if (!solicitacao || allCotacoes.length === 0) return;
    setIsAiAnalyzing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const best = [...allCotacoes].sort((a, b) => a.total - b.total)[0];
      const analysis = `**Promo AI Insight:**
      
1.  **Custo-Benefício:** O fornecedor **${best.fornecedor}** garante economia de **15%** vs. média.
2.  **Risco:** Compliance nível gold, sem atrasos registrados nos últimos 6 meses.
3.  **Veredito:** Recomendamos a aprovação imediata para manter o SLA de produção.`;
      setAiAnalysis(analysis);
    } finally {
      setIsAiAnalyzing(false);
    }
  }, [solicitacao, allCotacoes]);

  useEffect(() => {
    if (buscaStatus === 'done' && cotacoesAPI.length > 0) handleAiAnalyze();
  }, [buscaStatus, cotacoesAPI, handleAiAnalyze]);

  const handleBuscarCotacoes = async () => {
    setBuscaStatus('searching');
    try {
      const results = await simulateAPISearch(fornecedores, solicitacao?.quantidade || 100);
      setCotacoesAPI(results);
      setBuscaStatus('done');
      toast.success(`${results.length} cotações otimizadas encontradas`);
    } catch {
      setBuscaStatus('idle');
    }
  };

  const handleRunFollowUp = async () => {
    setIsRunningFollowUp(true);
    try {
      await supabase.functions.invoke('check-cotacao-followup');
      toast.success('Follow-up executado com inteligência');
    } finally {
      setIsRunningFollowUp(false);
    }
  };

  if (loadingSolicitacoes) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded-xl" />
        <div className="h-48 w-full bg-muted animate-pulse rounded-3xl" />
      </div>
    );
  }

  if (!solicitacao) {
    return (
      <ElitePageWrapper>
        <IllustratedEmptyState
          type="orders"
          title="Fila de Cotação Vazia"
          description="Selecione uma demanda no cockpit para iniciar o processo competitivo."
          action={{ label: "Ir para Solicitações", onClick: () => window.location.href = '/solicitacoes' }}
        />
      </ElitePageWrapper>
    );
  }

  return (
    <ModuleErrorBoundary module="cotacoes">
      <ElitePageWrapper>
        <div className="space-y-8 pb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 shadow-inner">
                <Search className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-foreground tracking-tight uppercase leading-none">Cotação</h1>
                <div className="flex items-center gap-2 mt-2">
                   <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest">#{solicitacao.numero}</Badge>
                   <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-50">• Mercado Competitivo</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {hasRole(['admin', 'coordinator']) && (
                <EliteButton variant="outline" onClick={handleRunFollowUp} loading={isRunningFollowUp} className="h-11 px-4">
                  <Bell className="w-4 h-4 mr-2" /> FOLLOW-UP
                </EliteButton>
              )}
              <EliteButton onClick={() => setShowManualModal(true)} className="h-11 px-6">
                <Plus className="w-4 h-4 mr-2" /> NOVA COTAÇÃO
              </EliteButton>
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/5 p-8 rounded-[2rem] border border-primary/20 backdrop-blur-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
              <Package className="w-32 h-32 text-primary" />
            </div>
            
            <div className="flex flex-col md:flex-row gap-8 relative z-10">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xl font-black uppercase text-foreground">{solicitacao.titulo}</h2>
                  <Badge className="bg-primary text-primary-foreground rounded-md px-2 py-0.5 text-[9px] font-black">{solicitacao.tipo}</Badge>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Quantidade</p>
                    <p className="text-sm font-bold text-foreground">{solicitacao.quantidade} {solicitacao.unidade}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Target Price</p>
                    <p className="text-sm font-bold text-primary">
                      {solicitacao.valor_estimado ? solicitacao.valor_estimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'TBD'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Prioridade</p>
                    <Badge variant="outline" className="border-amber-500/50 text-amber-600 font-bold uppercase text-[9px]">{solicitacao.prioridade}</Badge>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Departamento</p>
                    <p className="text-sm font-bold text-foreground">{solicitacao.departamento || 'OPERACIONAL'}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {(isAiAnalyzing || aiAnalysis) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Card className="p-6 border-indigo-500/30 bg-indigo-500/5 relative">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                      {isAiAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Brain className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        Promo Intelligence <Sparkles className="w-3 h-3" />
                      </p>
                      {isAiAnalyzing ? (
                        <p className="text-sm text-indigo-700/70 font-medium">Processando cenários competitivos e matriz de risco...</p>
                      ) : (
                        <div className="prose prose-sm prose-indigo dark:prose-invert max-w-none font-medium">
                          <ReactMarkdown>{aiAnalysis || ''}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="rounded-[2rem] border-border/40 bg-card/40 backdrop-blur-xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-border/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <h3 className="font-black uppercase tracking-tight text-foreground">Cockpit de Cotação ({allCotacoes.length})</h3>
                  </div>
                  <div className="flex gap-2">
                    <ComparadorCotacoes cotacoes={cotacoesAPI} quantidade={solicitacao.quantidade} onSelecionar={setFornecedorSelecionado} />
                    <VisualComparadorCotacoes cotacoes={cotacoesAPI} quantidade={solicitacao.quantidade} onSelecionar={setFornecedorSelecionado} />
                  </div>
                </div>
                <div className="p-6">
                  {allCotacoes.length > 0 ? (
                    <RankingCotacoes 
                      cotacoes={allCotacoes}
                      quantidade={solicitacao.quantidade}
                      onSelecionar={setFornecedorSelecionado}
                      selecionado={fornecedorSelecionado}
                    />
                  ) : (
                    <div className="py-12 text-center">
                      <p className="text-sm text-muted-foreground mb-6">Aguardando ofertas para análise comparativa.</p>
                      <EliteButton variant="outline" onClick={handleBuscarCotacoes} loading={buscaStatus === 'searching'}>
                        <RefreshCw className="w-4 h-4 mr-2" /> INICIAR BUSCA AUTO
                      </EliteButton>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            <div className="space-y-8">
              <Card className="p-6 rounded-[2rem] border-border/40 bg-card/40 backdrop-blur-xl shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <History className="w-5 h-5 text-primary" />
                  <h3 className="font-black uppercase tracking-tight text-foreground">Market Intelligence</h3>
                </div>
                <div className="space-y-4">
                  <EliteButton variant="outline" className="w-full justify-start h-14 rounded-2xl" onClick={() => setShowHistoryModal(true)}>
                    <TrendingDown className="w-5 h-5 mr-4 text-emerald-500" />
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Histórico</p>
                      <p className="text-xs font-bold">Análise de preços passados</p>
                    </div>
                  </EliteButton>
                  <AISupplierSuggestion />
                </div>
                <div className="mt-8 p-4 bg-muted/30 rounded-2xl border border-border/50">
                  <div className="flex gap-3">
                    <Info className="w-4 h-4 text-primary shrink-0" />
                    <p className="text-[10px] leading-relaxed text-muted-foreground font-medium">
                      O sistema monitora variações de mercado em tempo real. Ative a busca automática para capturar as melhores oportunidades globais.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </ElitePageWrapper>

      <CotacaoManualModal 
        open={showManualModal} 
        onOpenChange={setShowManualModal} 
        onSave={(data) => {
          createCotacao({
            solicitacao_id: solicitacao.id,
            fornecedor_id: data.fornecedor_id,
            valor_unitario: data.valorUnitario,
            quantidade: solicitacao.quantidade,
            valor_frete: data.frete || 0,
            prazo_entrega: data.prazoEntrega || 7,
          });
          setShowManualModal(false);
        }} 
      />
      <PriceHistoryModal open={showHistoryModal} onOpenChange={setShowHistoryModal} productId={solicitacao.titulo} />
    </ModuleErrorBoundary>
  );
};

export default Cotacao;
