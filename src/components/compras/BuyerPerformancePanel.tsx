import { forwardRef } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PiggyBank, TrendingDown, Award, ArrowUp } from "lucide-react";
import { buyerPerformanceMock } from "@/data/mockData";

export const BuyerPerformancePanel = forwardRef<HTMLDivElement>((_props, ref) => {
  const data = buyerPerformanceMock;

  return (
    <Card ref={ref} className="p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Award className="w-5 h-5 text-amber-500" />
        Performance do Comprador
      </h2>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-emerald-500/10 rounded-lg p-3">
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <PiggyBank className="w-4 h-4" />
            <span className="text-xs font-medium">Economia Gerada</span>
          </div>
          <p className="text-xl font-bold text-emerald-600">
            R$ {data.economiaGerada.toLocaleString('pt-BR')}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.economiaPercentual}% do volume
          </p>
        </div>

        <div className="bg-blue-500/10 rounded-lg p-3">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <TrendingDown className="w-4 h-4" />
            <span className="text-xs font-medium">Desconto Médio</span>
          </div>
          <p className="text-xl font-bold text-blue-600">
            {data.descontoMedio}%
          </p>
          <p className="text-xs text-muted-foreground">
            em {data.cotacoesNegociadas} cotações
          </p>
        </div>
      </div>

      {/* Melhor Preço Rate */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Taxa Melhor Preço</span>
          <span className="text-sm font-bold text-primary">{data.melhorPrecoRate}%</span>
        </div>
        <Progress value={data.melhorPrecoRate} className="h-2" />
        <p className="text-xs text-muted-foreground mt-1">
          Frequência de escolha do melhor preço disponível
        </p>
      </div>

      {/* Top Economias */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Top Economias do Mês</h3>
        <div className="space-y-2">
          {data.topEconomias.slice(0, 4).map((item, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground w-4">
                  #{index + 1}
                </span>
                <span className="text-sm text-foreground truncate max-w-[140px]">
                  {item.produto}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-600 flex items-center gap-0.5">
                  <ArrowUp className="w-3 h-3" />
                  {item.percentual}%
                </span>
                <span className="text-sm font-semibold text-emerald-600">
                  R$ {item.economia.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
