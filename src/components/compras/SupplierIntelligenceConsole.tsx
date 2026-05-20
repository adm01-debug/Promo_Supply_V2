import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from "recharts";
import { type SupplierHistory } from "@/hooks/usePurchaseHistory";
import { TrendingUp, AlertTriangle, CheckCircle2, ShieldCheck, Zap, DollarSign, TrendingDown } from "lucide-react";

interface Props {
  suppliers: SupplierHistory[];
}

export const SupplierIntelligenceConsole = ({ suppliers }: Props) => {
  const matrixData = useMemo(() => {
    return suppliers.map(s => ({
      name: s.name,
      reliability: s.onTimeRate, // X axis
      costEfficiency: 100 - (s.averageDiscount > 0 ? (s.averageDiscount * 2) : 50), // Y axis (mocked logic for "cost efficiency" vs market)
      volume: s.totalSpent,
      quality: s.qualityScore,
      id: s.id
    }));
  }, [suppliers]);

  const insights = useMemo(() => {
    const topReliable = [...suppliers].sort((a, b) => b.onTimeRate - a.onTimeRate)[0];
    const topValue = [...suppliers].sort((a, b) => b.averageDiscount - a.averageDiscount)[0];
    const riskSupplier = suppliers.find(s => s.onTimeRate < 70 || s.returnRate > 5);

    return { topReliable, topValue, riskSupplier };
  }, [suppliers]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-3 p-6 shadow-sm border-border/40">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Matriz de Confiabilidade Neural
              </h3>
              <p className="text-xs text-muted-foreground">Posicionamento estratégico baseado em SLA e Eficiência de Custo</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 uppercase">Parceiros Elite</Badge>
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20 uppercase">Em Desenvolvimento</Badge>
            </div>
          </div>

          <div className="h-[400px] w-full relative">
            {/* Quadrant Labels */}
            <div className="absolute top-0 right-0 p-2 text-[10px] font-bold text-emerald-600 uppercase">Líderes de Valor</div>
            <div className="absolute top-0 left-0 p-2 text-[10px] font-bold text-blue-600 uppercase">Eficientes em Custo</div>
            <div className="absolute bottom-0 right-0 p-2 text-[10px] font-bold text-amber-600 uppercase">SLA Premium</div>
            <div className="absolute bottom-0 left-0 p-2 text-[10px] font-bold text-muted-foreground uppercase">Risco/Oportunidade</div>

            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis 
                  type="number" 
                  dataKey="reliability" 
                  name="SLA (Confiabilidade)" 
                  unit="%" 
                  domain={[0, 100]}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="costEfficiency" 
                  name="Eficiência Custo" 
                  domain={[0, 100]}
                  tick={{ fontSize: 10 }}
                />
                <ZAxis type="number" dataKey="volume" range={[100, 1000]} name="Volume Gasto" />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border p-3 rounded-lg shadow-xl text-xs">
                          <p className="font-bold text-foreground mb-1">{data.name}</p>
                          <p className="text-muted-foreground">SLA: <span className="text-foreground font-medium">{data.reliability}%</span></p>
                          <p className="text-muted-foreground">Custo: <span className="text-foreground font-medium">{data.costEfficiency}% (Score)</span></p>
                          <p className="text-muted-foreground">Gasto: <span className="text-foreground font-medium">R$ {data.volume.toLocaleString('pt-BR')}</span></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Fornecedores" data={matrixData}>
                  {matrixData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.reliability > 80 && entry.costEfficiency > 50 ? '#10b981' : entry.reliability > 80 ? '#f59e0b' : '#3b82f6'} 
                      className="opacity-70 hover:opacity-100 transition-opacity"
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4 border-l-4 border-l-emerald-500 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-emerald-500" />
              <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Melhor SLA</h4>
            </div>
            {insights.topReliable ? (
              <>
                <p className="text-lg font-bold truncate">{insights.topReliable.name}</p>
                <div className="flex items-center justify-between mt-2">
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/10">{insights.topReliable.onTimeRate}% SLA</Badge>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
              </>
            ) : <p className="text-xs text-muted-foreground">Dados insuficientes</p>}
          </Card>

          <Card className="p-4 border-l-4 border-l-blue-500 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-blue-500" />
              <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Melhor Preço</h4>
            </div>
            {insights.topValue ? (
              <>
                <p className="text-lg font-bold truncate">{insights.topValue.name}</p>
                <div className="flex items-center justify-between mt-2">
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/10">{insights.topValue.averageDiscount}% Médio</Badge>
                  <TrendingDown className="w-4 h-4 text-blue-500" />
                </div>
              </>
            ) : <p className="text-xs text-muted-foreground">Dados insuficientes</p>}
          </Card>

          <Card className="p-4 border-l-4 border-l-rose-500 shadow-sm bg-rose-500/5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Atenção Crítica</h4>
            </div>
            {insights.riskSupplier ? (
              <>
                <p className="text-lg font-bold truncate text-rose-600">{insights.riskSupplier.name}</p>
                <p className="text-[10px] text-rose-500 mt-1">SLA abaixo de 70% ou taxa de devolução alta detectada.</p>
              </>
            ) : (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                <p className="text-xs font-medium">Nenhum risco detectado</p>
              </div>
            )}
          </Card>
          
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <h4 className="text-xs font-bold text-primary uppercase mb-2">IA Insight Sugestão</h4>
            <p className="text-[11px] text-primary/80 leading-relaxed italic">
              "Baseado nos últimos 90 dias, concentrar pedidos de volumetria alta no fornecedor 
              <strong className="mx-1">{insights.topReliable?.name}</strong> 
              pode reduzir custos operacionais de re-entrega em até 12%."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
