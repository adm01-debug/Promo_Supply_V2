import { useState } from "react";
import { MainLayout } from "@/components/compras/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, TrendingDown, AlertTriangle, CheckCircle, Loader2, Brain, Target, DollarSign, History, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NegotiationAnalysis {
  resumo: string;
  melhor_cotacao?: string;
  economia_estimada?: number;
  sugestoes: {
    fornecedor: string;
    estrategia: string;
    valor_contraproposta?: number;
    argumentos: string[];
    risco?: string;
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
        .select("id, numero, titulo, valor_estimado, status")
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

  const riskColor = (risk?: string) => {
    if (risk === "baixo") return "text-success";
    if (risk === "medio") return "text-warning";
    return "text-destructive";
  };

  return (
    <MainLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Negociação com IA</h1>
            <p className="text-sm text-muted-foreground">Análise inteligente de cotações e estratégias de negociação</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Selecionar Solicitação
            </CardTitle>
            <CardDescription>Escolha uma solicitação com cotações para analisar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedSolicitacao} onValueChange={setSelectedSolicitacao}>
              <SelectTrigger>
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

            {cotacoes && cotacoes.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{cotacoes.length} cotação(ões) encontrada(s)</p>
                <div className="grid gap-2 md:grid-cols-3">
                  {cotacoes.map(c => (
                    <Card key={c.id} className="p-3">
                      <p className="font-medium text-sm">{(c as any).fornecedor?.razao_social || "Fornecedor"}</p>
                      <p className="text-lg font-bold text-primary">R$ {Number(c.valor_total).toLocaleString("pt-BR")}</p>
                      <p className="text-xs text-muted-foreground">Prazo: {c.prazo_entrega} dias</p>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={() => analyzeMutation.mutate()}
              disabled={!selectedSolicitacao || !cotacoes?.length || analyzeMutation.isPending}
              className="w-full"
            >
              {analyzeMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analisando com IA...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Analisar Negociação com IA</>
              )}
            </Button>
          </CardContent>
        </Card>

        {analysis && (
          <div className="space-y-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Resumo da Análise
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground">{analysis.resumo}</p>
                <div className="grid gap-4 md:grid-cols-2">
                  {analysis.melhor_cotacao && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <div>
                        <p className="text-xs text-muted-foreground">Melhor Cotação</p>
                        <p className="font-semibold">{analysis.melhor_cotacao}</p>
                      </div>
                    </div>
                  )}
                  {analysis.economia_estimada != null && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Economia Estimada</p>
                        <p className="font-semibold text-primary">
                          R$ {Number(analysis.economia_estimada).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              {analysis.sugestoes.map((s, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{s.fornecedor}</CardTitle>
                      {s.risco && (
                        <Badge variant={s.risco === "baixo" ? "default" : s.risco === "medio" ? "secondary" : "destructive"}>
                          Risco {s.risco}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm">{s.estrategia}</p>
                    {s.valor_contraproposta && (
                      <div className="flex items-center gap-2 p-2 rounded bg-muted">
                        <TrendingDown className="h-4 w-4 text-success" />
                        <span className="text-sm font-medium">
                          Contraproposta: R$ {Number(s.valor_contraproposta).toLocaleString("pt-BR")}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Argumentos:</p>
                      <ul className="space-y-1">
                        {s.argumentos.map((a, j) => (
                          <li key={j} className="text-xs flex items-start gap-1">
                            <AlertTriangle className={`h-3 w-3 mt-0.5 ${riskColor(s.risco)}`} />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {analysis.analise_detalhada && (
              <Card>
                <CardHeader>
                  <CardTitle>Análise Detalhada</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    {analysis.analise_detalhada}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* History of past analyses */}
        {pastAnalyses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Análises
              </CardTitle>
              <CardDescription>{pastAnalyses.length} análise(s) realizadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pastAnalyses.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <Brain className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {a.solicitacao?.numero || 'Sem solicitação'} — {a.solicitacao?.titulo || 'Análise avulsa'}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {a.analise_texto?.substring(0, 120) || 'Sem detalhes'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      {(a.economia_estimada || 0) > 0 && (
                        <Badge variant="outline" className="text-kpi-success border-kpi-success/30 gap-1">
                          <DollarSign className="h-3 w-3" />
                          R$ {Number(a.economia_estimada).toLocaleString("pt-BR")}
                        </Badge>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(a.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default NegociacaoIA;
