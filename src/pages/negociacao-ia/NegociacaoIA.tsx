import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Sparkles, TrendingDown, TrendingUp, AlertTriangle, CheckCircle, 
  Loader2, Brain, Target, DollarSign, History, Clock,
  ArrowRight, ShieldCheck, Zap, Info, MessageSquare, Mail, Calculator
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth";
import { toast } from "@/lib/feedbackToast";
import { format } from "date-fns/format";
import { ptBR } from "date-fns/locale/pt-BR";
import { StrategicQuoteTable } from "@/components/compras/StrategicQuoteTable";
import { cn } from "@/lib/utils";

interface NegotiationAnalysis {
  resumo: string;
  melhor_cotacao?: string;
  economia_estimada?: number;
  oportunidade_score?: number;
  contexto_mercado?: string;
  sugestoes: {
    fornecedor: string;
    estrategia: string;
    valor_contraproposta?: number;
    valor_ponto_recuo?: number;
    argumentos: string[];
    risco?: "baixo" | "medio" | "alto";
    confianca_negociacao?: number;
    tipo_negociacao?: string;
  }[];
  analise_detalhada: string;
}

const NegociacaoIA = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<string>("");
  const [analysis, setAnalysis] = useState<NegotiationAnalysis | null>(null);

  const { data: solicitacoes } = useQuery({
    queryKey: ["solicitacoes-for-negotiation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solicitacoes")
        .select("id, numero, titulo, valor_estimado, status, quantidade")
        .in("status", ["em_cotacao", "em_andamento", "aprovada"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: cotacoes } = useQuery({
    queryKey: ["cotacoes-for-negotiation", selectedSolicitacao],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotacoes")
        .select("*, fornecedor:fornecedores(razao_social, nome_fantasia)")
        .eq("solicitacao_id", selectedSolicitacao);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSolicitacao,
  });

  // Fetch past analyses
  const { data: pastAnalyses = [] } = useQuery({
    queryKey: ["negotiation-analyses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("negotiation_analyses")
        .select("*, solicitacao:solicitacoes(numero, titulo)")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const sol = solicitacoes?.find(s => s.id === selectedSolicitacao);
      const { data, error } = await supabase.functions.invoke("ai-negotiation", {
        body: { cotacoes, solicitacao: sol },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const result = data as NegotiationAnalysis;

      // Persist to negotiation_analyses table
      await supabase.from("negotiation_analyses").insert({
        solicitacao_id: selectedSolicitacao,
        analise_texto: result.analise_detalhada || result.resumo,
        sugestoes: result.sugestoes as any,
        economia_estimada: result.economia_estimada || 0,
        modelo_ia: "gemini-2.5-flash",
        created_by: user?.id,
      });

      return result;
    },
    onSuccess: (data) => {
      setAnalysis(data);
      queryClient.invalidateQueries({ queryKey: ["negotiation-analyses"] });
      toast.success("Análise de negociação concluída e salva!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao analisar negociação");
    },
  });


  return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 p-4 md:p-6"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Negociação Inteligente</h1>
              <p className="text-sm text-muted-foreground">Otimização de custos baseada em IA e análise de mercado</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border/50 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Análises: {pastAnalyses.length}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border/50 text-xs font-medium">
              <DollarSign className="h-3.5 w-3.5 text-success" />
              <span>Economia Total: R$ 245.2k</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="overflow-hidden border-none shadow-xl bg-card/30 backdrop-blur-sm border-t border-white/10">
              <div className="h-1.5 w-full bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Target className="h-5 w-5 text-primary" />
                  Parametros da Análise
                </CardTitle>
                <CardDescription>Selecione a demanda para iniciar a otimização agentica</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                      Solicitação de Compra
                    </label>
                    <Select value={selectedSolicitacao} onValueChange={setSelectedSolicitacao}>
                      <SelectTrigger className="h-12 bg-background/50 border-border/50">
                        <SelectValue placeholder="Selecione uma solicitação..." />
                      </SelectTrigger>
                      <SelectContent>
                        {solicitacoes?.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.numero} - {s.titulo} {s.valor_estimado ? `(R$ ${Number(s.valor_estimado).toLocaleString("pt-BR")})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <AnimatePresence>
                  {cotacoes && cotacoes.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold flex items-center gap-2">
                          <Zap className="h-4 w-4 text-amber-500" />
                          {cotacoes.length} Propostas Identificadas
                        </p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        {cotacoes.map((c, idx) => (
                          <motion.div
                            key={c.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            className="group relative p-4 rounded-xl bg-background/40 border border-border/50 hover:border-primary/30 transition-all duration-300"
                          >
                            <p className="font-semibold text-xs text-muted-foreground truncate mb-1">
                              {(c as any).fornecedor?.nome_fantasia || (c as any).fornecedor?.razao_social || "Fornecedor"}
                            </p>
                            <p className="text-lg font-bold text-foreground">
                              R$ {Number(c.valor_total).toLocaleString("pt-BR")}
                            </p>
                            <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {c.prazo_entrega} dias
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      <div className="mt-8 pt-6 border-t border-white/5">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-6 ml-1">Comparativo Estratégico de Propostas</p>
                        <StrategicQuoteTable 
                          cotacoes={cotacoes.map(c => ({
                            id: c.id,
                            fornecedor: (c as any).fornecedor?.nome_fantasia || (c as any).fornecedor?.razao_social || "Fornecedor",
                            total: Number(c.valor_total),
                            lead_time: Number(c.prazo_entrega),
                            rating: (c as any).fornecedor?.avaliacao || 4.2
                          }))} 
                          quantidade={solicitacoes?.find(s => s.id === selectedSolicitacao)?.quantidade || 1} 
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="pt-4">
                  <Button
                    onClick={() => analyzeMutation.mutate()}
                    disabled={!selectedSolicitacao || !cotacoes?.length || analyzeMutation.isPending}
                    className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20 group relative overflow-hidden"
                  >
                    {analyzeMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processando Insights de Elite...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 group-hover:scale-125 transition-transform" />
                        Gerar Estratégia de Negociação
                      </span>
                    )}
                    {analyzeMutation.isPending && (
                      <motion.div 
                        className="absolute inset-0 bg-primary/20"
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <AnimatePresence>
              {analysis && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <Card className="border-none shadow-2xl bg-gradient-to-br from-primary/10 via-background to-background relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Brain className="h-32 w-32" />
                    </div>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                        Parecer da Inteligência Artificial
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 relative">
                      <div className="p-4 rounded-xl bg-background/60 border border-primary/10 leading-relaxed text-foreground/90 italic">
                        "{analysis.resumo}"
                      </div>
                      
                      <div className="grid gap-4 md:grid-cols-3">
                        {analysis.melhor_cotacao && (
                          <div className="flex items-center gap-3 p-4 rounded-xl bg-success/5 border border-success/20">
                            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                              <ShieldCheck className="h-6 w-6 text-success" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-success/70">Recomendação Elite</p>
                              <p className="font-bold text-foreground truncate max-w-[150px]">{analysis.melhor_cotacao}</p>
                            </div>
                          </div>
                        )}
                        {analysis.economia_estimada != null && (
                          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <DollarSign className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Potencial de Savings</p>
                              <p className="font-bold text-primary text-xl">
                                R$ {Number(analysis.economia_estimada).toLocaleString("pt-BR")}
                              </p>
                            </div>
                          </div>
                        )}
                        {analysis.oportunidade_score != null && (
                          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                              <Zap className="h-6 w-6 text-amber-500" />
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500/70">Score Oportunidade</p>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground">{analysis.oportunidade_score}%</span>
                                <div className="h-1.5 flex-1 bg-amber-500/10 rounded-full overflow-hidden">
                                  <div className="h-full bg-amber-500" style={{ width: `${analysis.oportunidade_score}%` }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {analysis.contexto_mercado && (
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border/50 text-xs">
                          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="font-bold">Contexto de Mercado:</p>
                            <p className="text-muted-foreground leading-relaxed">{analysis.contexto_mercado}</p>
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                          <h3 className="text-sm font-bold flex items-center gap-2">
                            <Target className="h-4 w-4 text-primary" />
                            Estratégias por Fornecedor
                          </h3>
                          <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 text-primary">
                            Plano de Ação Sugerido
                          </Badge>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          {analysis.sugestoes.map((s, i) => (
                            <motion.div
                              key={i}
                              whileHover={{ y: -4, scale: 1.01 }}
                              className="group p-6 rounded-3xl bg-background/40 border border-white/5 hover:border-primary/30 transition-all shadow-2xl relative overflow-hidden"
                            >
                              {/* Background Pattern */}
                              <div className="absolute -top-10 -right-10 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                                <Brain className="h-32 w-32" />
                              </div>

                              <div className="flex items-start justify-between mb-4 relative z-10">
                                <div className="space-y-1">
                                  <h4 className="font-black text-sm tracking-tight text-white uppercase">{s.fornecedor}</h4>
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                      <div className="h-1 w-12 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-primary" style={{ width: `${s.confianca_negociacao || 85}%` }} />
                                      </div>
                                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-tighter">{(s.confianca_negociacao || 85)}% confiança</span>
                                    </div>
                                    <span className="text-zinc-700">•</span>
                                    <span className="text-[9px] font-black text-primary uppercase tracking-widest">{s.tipo_negociacao || 'Tático'}</span>
                                  </div>
                                </div>
                                {s.risco && (
                                  <Badge 
                                    className={cn(
                                      "text-[10px] px-3 py-1 font-black uppercase tracking-tighter border-none",
                                      s.risco === "baixo" ? "bg-emerald-500/10 text-emerald-400" : s.risco === "medio" ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"
                                    )}
                                  >
                                    RISCO {s.risco}
                                  </Badge>
                                )}
                              </div>

                              <p className="text-[11px] text-muted-foreground leading-relaxed mb-6 font-medium italic group-hover:text-foreground/90 transition-colors">
                                "{s.estrategia}"
                              </p>
                              
                              <div className="grid grid-cols-2 gap-3 mb-6">
                                {s.valor_contraproposta && (
                                  <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 group-hover:bg-emerald-500/10 transition-colors">
                                    <p className="text-[9px] font-black uppercase text-emerald-400 tracking-widest mb-1 flex items-center gap-1">
                                      <Target className="h-3 w-3" /> Meta Ideal
                                    </p>
                                    <p className="text-sm font-black text-white">
                                      R$ {Number(s.valor_contraproposta).toLocaleString("pt-BR")}
                                    </p>
                                  </div>
                                )}
                                {s.valor_ponto_recuo && (
                                  <div className="p-3 rounded-2xl bg-rose-500/5 border border-rose-500/10 group-hover:bg-rose-500/10 transition-colors">
                                    <p className="text-[9px] font-black uppercase text-rose-400 tracking-widest mb-1 flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" /> Recuo Máx.
                                    </p>
                                    <p className="text-sm font-black text-white">
                                      R$ {Number(s.valor_ponto_recuo).toLocaleString("pt-BR")}
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-3 mb-6">
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                  <Zap className="h-3.5 w-3.5 text-primary" /> Key Arguments
                                </p>
                                <div className="space-y-2">
                                  {s.argumentos.map((a, j) => (
                                    <div key={j} className="text-[10px] font-bold flex items-start gap-3 text-zinc-300 bg-white/[0.03] p-3 rounded-xl border border-white/5 hover:bg-white/[0.05] transition-all">
                                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                                      {a}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="flex gap-3 relative z-10">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="flex-1 text-[10px] font-black uppercase tracking-widest h-10 rounded-xl border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white"
                                  onClick={() => toast.info(`Preparando script de WhatsApp para ${s.fornecedor}...`)}
                                >
                                  <MessageSquare className="h-3.5 w-3.5 mr-2 text-emerald-400" /> WhatsApp
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="flex-1 text-[10px] font-black uppercase tracking-widest h-10 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                                  onClick={() => toast.info(`Gerando e-mail tático para ${s.fornecedor}...`)}
                                >
                                  <Mail className="h-3.5 w-3.5 mr-2" /> E-mail
                                </Button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {analysis.analise_detalhada && (
                        <Card className="bg-white/[0.01] border border-white/5 rounded-3xl overflow-hidden shadow-none">
                          <CardHeader className="py-4 px-6 border-b border-white/5 bg-white/[0.01]">
                            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                              <Calculator className="h-4 w-4" /> Racional Técnico & TCO
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-6">
                            <div className="prose prose-invert prose-sm max-w-none text-[11px] leading-relaxed text-zinc-400 font-medium whitespace-pre-wrap">
                              {analysis.analise_detalhada}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-lg bg-card/50 overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-bold">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  Sentimento de Mercado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Dólar (USD)</p>
                      <p className="text-xs font-black">R$ 5,24 <span className="text-[10px] text-success font-bold">-0.2%</span></p>
                    </div>
                  </div>
                  <TrendingDown className="h-4 w-4 text-success" />
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Zap className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Energia / Frete</p>
                      <p className="text-xs font-black">Estável <span className="text-[10px] text-amber-500 font-bold">+1.5%</span></p>
                    </div>
                  </div>
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                </div>

                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-[10px] font-black uppercase text-primary/70 mb-2">Insight de Timing</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    "O mercado de suprimentos eletrônicos mostra sinais de estabilização. Momento ideal para contratos trimestrais."
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-5 w-5 text-primary" />
                  Logs de Inteligência
                </CardTitle>
                <CardDescription>Últimas 20 análises registradas</CardDescription>
              </CardHeader>
              <CardContent className="px-2">
                <div className="space-y-1 max-h-[800px] overflow-y-auto px-2 custom-scrollbar">
                  {pastAnalyses.length > 0 ? (
                    pastAnalyses.map((a: any, idx) => (
                      <motion.div 
                        key={a.id} 
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex flex-col p-3 rounded-xl border border-transparent hover:border-border hover:bg-background/50 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-primary uppercase bg-primary/5 px-1.5 py-0.5 rounded">
                            {a.solicitacao?.numero || 'SC-000'}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(a.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">
                          {a.solicitacao?.titulo || 'Análise de Mercado'}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          {(a.economia_estimada || 0) > 0 ? (
                            <div className="flex items-center gap-1 text-[11px] font-bold text-success">
                              <TrendingDown className="h-3 w-3" />
                              R$ {Number(a.economia_estimada).toLocaleString("pt-BR")}
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Estratégico</span>
                          )}
                          <div className="h-1.5 w-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="py-12 text-center">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                        <History className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">Nenhum registro encontrado</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-none">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-white shadow-xl flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-purple-600" />
                  </div>
                  <h4 className="font-bold text-sm tracking-tight">Otimização Avançada</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Nossa IA analisa padrões de preços históricos e comportamento de fornecedores para garantir a melhor margem.
                  </p>
                  <Button variant="ghost" size="sm" className="text-xs font-bold text-purple-600 hover:bg-purple-600/10">
                    Saber mais <ArrowRight className="h-3 w-3 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    
  );
};

export default NegociacaoIA;
