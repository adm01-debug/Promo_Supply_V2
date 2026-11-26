import { useState, useCallback } from "react";
import { Brain, Sparkles, ArrowRight, Package, Loader2, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/feedbackToast";
import { logger } from "@/lib/logger";
import { useFornecedores } from "@/hooks/useFornecedores";

interface Suggestion {
  supplierId?: string | null;
  supplierName?: string | null;
  score?: number | null;
  reasons?: string[] | null;
  estimatedPrice?: number | null;
  deliveryTime?: string | null;
  riskLevel?: string | null;
  negotiationTips?: string[] | null;
}

interface SuggestionsResponse {
  recommendations?: Suggestion[] | null;
  marketInsights?: string | null;
  alternativeSuggestions?: string[] | null;
  requestId?: string | null;
}

/**
 * Sourcing Intelligence — consulta a edge ai-supplier-suggestion com os
 * fornecedores reais do tenant. Antes era um card com dados fixos
 * ("AluTech Indústria", "Target: Aluminum Mug"). Se a IA falhar, a edge
 * devolve fallback determinístico honesto (score neutro, sem numero inventado).
 */
export const AISupplierSuggestion = () => {
  const { fornecedores, loading: loadingFornecedores } = useFornecedores();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SuggestionsResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runSuggestion = useCallback(async () => {
    if (loadingFornecedores) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const suppliers = fornecedores.map((f) => ({
        id: f.id,
        nome: f.nome_fantasia || f.razao_social,
        razaoSocial: f.razao_social,
        tipo: f.tipo,
        segmento: f.segmento,
        avaliacao: f.avaliacao,
        prazoMedioEntrega: f.prazo_medio_entrega,
        cidade: f.cidade,
        estado: f.estado,
      }));

      const { data, error } = await supabase.functions.invoke<SuggestionsResponse>(
        "ai-supplier-suggestion",
        {
          body: {
            productDescription: "Compra corporativa geral — melhor seleacao de fornecedores",
            category: fornecedores[0]?.segmento ?? undefined,
            quantity: null,
            budget: null,
            purchaseHistory: [],
            suppliers,
          },
        },
      );
      if (error) throw error;
      if (!data || !Array.isArray(data.recommendations)) {
        throw new Error("Resposta invalida da edge de sugestao");
      }
      setResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("ai-supplier-suggestion: falha ao consultar", { error: message });
      setErrorMsg(message);
      toast.error("Falha ao gerar sugestao de fornecedores: " + message);
    } finally {
      setIsLoading(false);
    }
  }, [fornecedores, loadingFornecedores]);

  const recs = result?.recommendations ?? [];
  const usedFallback = result && result.recommendations?.some((r) => r.score === 50 && r.deliveryTime === "A consultar");
  const hasSuppliers = fornecedores.length > 0;

  return (
    <Card className="p-6 rounded-2xl border-violet-500/20 bg-violet-500/5 backdrop-blur-xl relative overflow-hidden group w-full">
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
        <Brain className="h-16 w-16 text-violet-400" />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h4 className="text-[11px] font-black uppercase tracking-widest text-white">Sourcing Intelligence</h4>
          </div>
          {usedFallback ? (
            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px] font-black uppercase">Fallback</Badge>
          ) : result ? (
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] font-black uppercase">Analyzed</Badge>
          ) : (
            <Badge className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20 text-[9px] font-black uppercase">Not Run</Badge>
          )}
        </div>

        <div className="space-y-4">
          {loadingFornecedores || isLoading ? (
            <div className="flex items-center justify-center gap-3 p-4">
              <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
                {isLoading ? "Analisando fornecedores..." : "Carregando fornecedores..."}
              </p>
            </div>
          ) : errorMsg ? (
            <div className="p-3 rounded-xl bg-rose-500/[0.06] border border-rose-500/20">
              <p className="text-[11px] font-bold text-rose-300">Nao foi possivel gerar sugestao</p>
              <p className="text-[10px] text-zinc-500 mt-1">{errorMsg}</p>
            </div>
          ) : (
            <>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center gap-3 mb-2">
                  <Package className="w-4 h-4 text-zinc-400" />
                  <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">
                    {hasSuppliers ? `${fornecedores.length} fornecedores cadastrados` : "Sem fornecedores cadastrados"}
                  </p>
                </div>
                <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
                  {result?.marketInsights ??
                    (hasSuppliers
                      ? "Analise o cadastro real de fornecedores para a melhor selecao de compra."
                      : "Cadastre fornecedores para gerar sugestoes de sourcing.")}
                </p>
              </div>

              {recs.length > 0 && (
                <ScrollArea className="h-auto max-h-[180px] w-full rounded-lg">
                  <div className="space-y-2 p-1">
                    {recs.map((s, idx) => (
                      <div key={s.supplierId ?? idx} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-violet-500" />
                          <div>
                            <p className="text-xs font-bold text-zinc-200">{s.supplierName ?? "Fornecedor"}</p>
                            {s.riskLevel && (
                              <p className="text-[9px] text-zinc-500 font-black uppercase tracking-tighter">
                                risco {s.riskLevel}
                                {s.deliveryTime ? ` · ${s.deliveryTime}` : ""}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-violet-400">{s.score ?? 0}% Match</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              <Button
                variant="ghost"
                className="w-full h-10 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-violet-500/20 transition-all gap-2"
                onClick={runSuggestion}
                disabled={!hasSuppliers || loadingFornecedores || isLoading}
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {result ? "Rerun Supplier Analysis" : "Run Supplier Analysis"} <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};
