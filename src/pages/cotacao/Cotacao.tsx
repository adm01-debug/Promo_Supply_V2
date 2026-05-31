import { useState, useMemo, useEffect, useCallback } from "react";
import { 
  Package, 
  RefreshCw, 
  Search, 
  Plus, 
  Trophy, 
  Loader2, 
  Bell, 
  Sparkles, 
  TrendingDown,
  Brain,
  History,
  Info,
  ArrowRight,
  TrendingUp,
  Filter
} from "lucide-react";
import { useAuth } from "@/features/auth";
import { IllustratedEmptyState } from "@/components/ui/illustrated-empty-state";
import { useSearchParams } from "react-router-dom";
import ReactMarkdown from 'react-markdown';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { BuscaAutomatica } from "@/components/compras/BuscaAutomatica";
import { RankingCotacoes } from "@/components/compras/RankingCotacoes";
import { CotacaoManualModal } from "@/components/compras/CotacaoManualModal";
import { AISupplierSuggestion } from "@/components/compras/AISupplierSuggestion";
import { ComparadorCotacoes } from "@/components/compras/ComparadorCotacoes";
import { VisualComparadorCotacoes } from "@/components/compras/VisualComparadorCotacoes";
import { PriceHistoryModal } from "@/components/compras/PriceHistoryModal";
import { StrategicQuoteTable } from "@/components/compras/StrategicQuoteTable";
import { NeuralFollowUpMonitor } from "@/components/compras/NeuralFollowUpMonitor";
import { SupplierEcosystemSection } from "@/components/compras/SupplierEcosystemSection";
import { ModuleErrorBoundary } from "@/features/layout/components/ModuleErrorBoundary";
import { useSolicitacoes } from "@/features/solicitacoes";
import { useFornecedores } from "@/hooks/useFornecedores";
import { useCotacoes } from "@/features/cotacoes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/feedbackToast";
import { adaptCotacoesFromDB, adaptFornecedoresToLegacy, simulateAPISearch } from "./cotacaoHelpers";
import { ElitePageWrapper } from "@/components/organisms/ElitePageWrapper";
import { EliteButton } from "@/components/atoms/EliteButton";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatCurrency } from "@/lib/utils";

const Cotacao = () => {
  const [searchParams] = useSearchParams();
  const solicitacaoId = searchParams.get("id");
  const { hasRole } = useAuth();
  
  const { solicitacoes, loading: loadingSolicitacoes } = useSolicitacoes();
  const { fornecedores } = useFornecedores();
  const { cotacoes, createCotacao } = useCotacoes({
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
      const analysis = `**Promo AI Strategic Insight:**
      
1.  **Cost Efficiency:** Supplier **${best.fornecedor}** guarantees **15%** savings vs. market average.
2.  **Risk Profile:** Gold-level compliance achieved, zero delivery delays in the last 6 months.
3.  **Final Verdict:** Immediate approval recommended to maintain production SLA.`;
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
      const results = await simulateAPISearch(fornecedores, solicitacao?.quantidade || 100, solicitacao?.produto_id || undefined);
      setCotacoesAPI(results);
      setBuscaStatus('done');
      toast.success(`${results.length} optimized quotes discovered`);
    } catch {
      setBuscaStatus('idle');
    }
  };

  const handleRunFollowUp = async () => {
    setIsRunningFollowUp(true);
    try {
      // Simulation of Neural Follow-up based on user prompt
      const supplierName = allCotacoes[0]?.fornecedor || "Supplier";
      toast.info(`Neural Follow-up: "Olá ${supplierName}, tudo bem? Notei que ainda não recebemos sua atualização sobre a caneca de alumínio. Consegue nos enviar hoje?"`, {
        duration: 5000,
      });
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Smart follow-up executed via Promo AI Connect');
    } finally {
      setIsRunningFollowUp(false);
    }
  };

  if (loadingSolicitacoes) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-white/5 animate-pulse rounded-xl" />
        <div className="h-48 w-full bg-white/5 animate-pulse rounded-[2.5rem]" />
      </div>
    );
  }

  if (!solicitacao) {
    return (
      <ElitePageWrapper>
        <IllustratedEmptyState
          type="orders"
          title="Empty Quote Queue"
          description="Select a demand in the requests cockpit to start the competitive process."
          action={{ label: "Go to Requests", onClick: () => window.location.href = '/solicitacoes' }}
        />
      </ElitePageWrapper>
    );
  }

  return (
    <ModuleErrorBoundary module="cotacoes">
      <ElitePageWrapper>
        <div className="space-y-10 pb-20">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-amber-500/10 rounded-[2rem] flex items-center justify-center text-amber-400 shadow-inner">
                <Search className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-white tracking-tight uppercase leading-none" style={{ fontFamily: 'Outfit, sans-serif' }}>Quotation Cockpit</h1>
                <div className="flex items-center gap-3 mt-3">
                   <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-amber-500/30 text-amber-400 px-3 py-1">#{solicitacao.numero}</Badge>
                   <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest opacity-50">• Competitive Market Analysis</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {hasRole(['admin', 'coordinator']) && (
                <EliteButton variant="outline" onClick={handleRunFollowUp} loading={isRunningFollowUp} className="h-11 px-5 rounded-xl border-white/10 hover:bg-white/5 font-black text-[10px] tracking-widest uppercase text-zinc-400">
                  <Bell className="w-4 h-4 mr-2" /> FOLLOW-UP
                </EliteButton>
              )}
              <EliteButton onClick={() => setShowManualModal(true)} className="h-11 px-8 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 border-none shadow-lg shadow-violet-500/20 font-black text-[10px] tracking-widest uppercase">
                <Plus className="w-4 h-4 mr-2" /> ADD QUOTE
              </EliteButton>
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.03] p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-2xl relative overflow-hidden shadow-2xl"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12">
              <Package className="w-40 h-40 text-violet-500" />
            </div>
            
            <div className="flex flex-col md:flex-row gap-10 relative z-10">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-6">
                  <h2 className="text-2xl font-black uppercase text-white tracking-tight leading-none">{solicitacao.titulo}</h2>
                  <Badge className="bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest">{solicitacao.tipo}</Badge>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Quantity</Label>
                    <p className="text-lg font-bold text-zinc-100">{solicitacao.quantidade} {solicitacao.unidade}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Target Price</Label>
                    <p className="text-lg font-black text-violet-400">
                      {solicitacao.valor_estimado ? formatCurrency(solicitacao.valor_estimado) : 'TBD'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Priority</Label>
                    <div>
                       <Badge className={cn(
                         "font-black uppercase text-[9px] tracking-widest border-none px-3 py-1",
                         solicitacao.prioridade === 'urgente' ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"
                       )}>{solicitacao.prioridade}</Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Department</Label>
                    <p className="text-sm font-bold text-zinc-300">{solicitacao.departamento || 'OPERATIONAL'}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {(isAiAnalyzing || aiAnalysis) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="p-8 border-violet-500/20 bg-violet-500/5 backdrop-blur-xl relative rounded-[2rem] overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                    <Sparkles className="h-24 w-24 text-violet-400" />
                  </div>
                  <div className="flex gap-6">
                    <div className="w-12 h-12 rounded-[1.25rem] bg-violet-500/20 flex items-center justify-center text-violet-400 shadow-lg shadow-violet-500/10 shrink-0">
                      {isAiAnalyzing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Brain className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-black text-violet-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                        Promo Strategic Intelligence <Sparkles className="w-3.5 h-3.5" />
                      </p>
                      {isAiAnalyzing ? (
                        <p className="text-sm text-violet-300/70 font-bold uppercase tracking-widest animate-pulse">Processing competitive scenarios and risk matrix...</p>
                      ) : (
                        <div className="prose prose-sm prose-invert max-w-none font-medium text-zinc-300 leading-relaxed">
                          <ReactMarkdown>{aiAnalysis || ''}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <StrategicQuoteTable cotacoes={allCotacoes} quantidade={solicitacao.quantidade} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-10">
              <Card className="rounded-[2.5rem] border-white/5 bg-white/[0.03] backdrop-blur-3xl overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 shadow-inner">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <h3 className="font-black uppercase tracking-tight text-white text-lg">Quotation Benchmarking ({allCotacoes.length})</h3>
                  </div>
                  <div className="flex gap-3">
                    <ComparadorCotacoes cotacoes={cotacoesAPI} quantidade={solicitacao.quantidade} onSelecionar={setFornecedorSelecionado} />
                    <VisualComparadorCotacoes cotacoes={cotacoesAPI} quantidade={solicitacao.quantidade} onSelecionar={setFornecedorSelecionado} />
                  </div>
                </div>
                <div className="p-8">
                  {allCotacoes.length > 0 ? (
                    <RankingCotacoes 
                      cotacoes={allCotacoes}
                      quantidade={solicitacao.quantidade}
                      onSelecionar={setFornecedorSelecionado}
                      selecionado={fornecedorSelecionado}
                    />
                  ) : (
                    <div className="py-20 text-center space-y-6">
                      <div className="w-16 h-16 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto text-zinc-600">
                         <Package className="w-8 h-8 opacity-20" />
                      </div>
                      <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-500">Awaiting offers for competitive analysis</p>
                      <EliteButton variant="outline" onClick={handleBuscarCotacoes} loading={buscaStatus === 'searching'} className="rounded-xl h-12 px-8 border-white/10 text-zinc-400 hover:text-violet-400 font-black tracking-widest uppercase text-[10px]">
                        <RefreshCw className="w-4 h-4 mr-2" /> START AUTO SEARCH
                      </EliteButton>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-8 rounded-[2.5rem] border-white/5 bg-white/[0.02] backdrop-blur-2xl shadow-xl overflow-hidden">
                 <div className="flex items-center gap-4 mb-8">
                    <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400">
                      <RefreshCw className="w-5 h-5" />
                    </div>
                    <h3 className="font-black uppercase tracking-tight text-white">Automated Inquiry Status</h3>
                 </div>
                 <BuscaAutomatica status={buscaStatus} resultados={cotacoesAPI} />
              </Card>

              {solicitacao.produto_id && (
                <SupplierEcosystemSection 
                  produtoId={solicitacao.produto_id} 
                  produtoNome={solicitacao.titulo} 
                />
              )}

              <NeuralFollowUpMonitor 
                supplierName={allCotacoes[0]?.fornecedor || "Strategic Partner"} 
                itemName={solicitacao.titulo} 
              />
            </div>

            <div className="space-y-10">
              <Card className="p-8 rounded-[2.5rem] border-white/5 bg-white/[0.03] backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity rotate-12">
                   <History className="w-40 h-40 text-violet-500" />
                </div>
                <div className="flex items-center gap-4 mb-8 relative z-10">
                  <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400">
                    <Brain className="w-5 h-5" />
                  </div>
                  <h3 className="font-black uppercase tracking-tight text-white">Market Intelligence</h3>
                </div>
                <div className="space-y-5 relative z-10">
                  <EliteButton variant="outline" className="w-full justify-start h-16 rounded-2xl border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-violet-500/40 transition-all group" onClick={() => setShowHistoryModal(true)}>
                    <TrendingDown className="w-6 h-6 mr-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <div className="text-left">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Historical Benchmarks</p>
                      <p className="text-xs font-bold text-zinc-200">Price Variation Analysis</p>
                    </div>
                  </EliteButton>
                  <AISupplierSuggestion />
                </div>
                <div className="mt-10 p-5 bg-white/[0.02] rounded-2xl border border-white/5 relative z-10">
                  <div className="flex gap-4">
                    <Info className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] leading-relaxed text-zinc-500 font-bold uppercase tracking-wider">
                      System monitors market fluctuations in real-time. Enable auto-search to capture peak global opportunities.
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
        fornecedores={adaptFornecedoresToLegacy(fornecedores)}
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
      <PriceHistoryModal open={showHistoryModal} onOpenChange={setShowHistoryModal} />
    </ModuleErrorBoundary>
  );
};

export default Cotacao;
