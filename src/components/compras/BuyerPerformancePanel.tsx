import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PiggyBank, TrendingDown, Award, ArrowUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth";

export const BuyerPerformancePanel = () => {
  const { organizationId } = useAuth();

  const { data: cotacoes, isLoading } = useQuery({
    queryKey: ['buyer-performance-cotacoes', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cotacoes')
        .select('id, valor_unitario, valor_total, selecionada, desconto_percentual, score_preco, solicitacao_id');
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
    enabled: !!organizationId,
  });

  const { data: solicitacoes } = useQuery({
    queryKey: ['buyer-performance-solicitacoes', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('solicitacoes')
        .select('id, valor_estimado, valor_aprovado, descricao');
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
    enabled: !!organizationId,
  });

  const stats = useMemo(() => {
    const cots = cotacoes || [];
    const sols = solicitacoes || [];

    const totalEstimado = sols.reduce((sum, s) => sum + (Number(s.valor_estimado) || 0), 0);
    const totalAprovado = sols.reduce((sum, s) => sum + (Number(s.valor_aprovado) || 0), 0);
    const economiaGerada = totalEstimado > totalAprovado ? totalEstimado - totalAprovado : 0;
    const economiaPercentual = totalEstimado > 0 
      ? Math.round((economiaGerada / totalEstimado) * 1000) / 10 
      : 0;

    const cotsComDesconto = cots.filter(c => c.desconto_percentual && Number(c.desconto_percentual) > 0);
    const descontoMedio = cotsComDesconto.length > 0
      ? cotsComDesconto.reduce((sum, c) => sum + (Number(c.desconto_percentual) || 0), 0) / cotsComDesconto.length
      : 0;

    const selecionadas = cots.filter(c => c.selecionada);
    const comMelhorPreco = selecionadas.filter(c => (c.score_preco || 0) >= 80).length;
    const melhorPrecoRate = selecionadas.length > 0 
      ? Math.round((comMelhorPreco / selecionadas.length) * 100) 
      : 0;

    // Top savings by solicitacao
    const topEconomias = sols
      .filter(s => s.valor_estimado && s.valor_aprovado && Number(s.valor_estimado) > Number(s.valor_aprovado))
      .map(s => ({
        produto: s.descricao || `Sol. ${s.id.slice(0, 8)}`,
        economia: Number(s.valor_estimado) - Number(s.valor_aprovado),
        percentual: Math.round(((Number(s.valor_estimado) - Number(s.valor_aprovado)) / Number(s.valor_estimado)) * 100),
      }))
      .sort((a, b) => b.economia - a.economia)
      .slice(0, 4);

    return {
      economiaGerada,
      economiaPercentual,
      descontoMedio: Math.round(descontoMedio * 10) / 10,
      melhorPrecoRate,
      cotacoesNegociadas: cots.length,
      topEconomias,
    };
  }, [cotacoes, solicitacoes]);

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-16 mb-4" />
        <Skeleton className="h-32" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Award className="w-5 h-5 text-warning" />
        Performance do Comprador
      </h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-success/10 rounded-lg p-3">
          <div className="flex items-center gap-2 text-success mb-1">
            <PiggyBank className="w-4 h-4" />
            <span className="text-xs font-medium">Economia Gerada</span>
          </div>
          <p className="text-xl font-bold text-success">
            R$ {stats.economiaGerada.toLocaleString('pt-BR')}
          </p>
          <p className="text-xs text-muted-foreground">
            {stats.economiaPercentual}% do volume
          </p>
        </div>

        <div className="bg-info/10 rounded-lg p-3">
          <div className="flex items-center gap-2 text-info mb-1">
            <TrendingDown className="w-4 h-4" />
            <span className="text-xs font-medium">Desconto Médio</span>
          </div>
          <p className="text-xl font-bold text-info">
            {stats.descontoMedio}%
          </p>
          <p className="text-xs text-muted-foreground">
            em {stats.cotacoesNegociadas} cotações
          </p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Taxa Melhor Preço</span>
          <span className="text-sm font-bold text-primary">{stats.melhorPrecoRate}%</span>
        </div>
        <Progress value={stats.melhorPrecoRate} className="h-2" />
        <p className="text-xs text-muted-foreground mt-1">
          Frequência de escolha do melhor preço disponível
        </p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Top Economias</h3>
        <div className="space-y-2">
          {stats.topEconomias.length > 0 ? (
            stats.topEconomias.map((item, index) => (
              <div key={`${item.produto}-${index}`} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground w-4">
                    #{index + 1}
                  </span>
                  <span className="text-sm text-foreground truncate max-w-[140px]">
                    {item.produto}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-success flex items-center gap-0.5">
                    <ArrowUp className="w-3 h-3" />
                    {item.percentual}%
                  </span>
                  <span className="text-sm font-semibold text-success">
                    R$ {item.economia.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma economia registrada ainda
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};
