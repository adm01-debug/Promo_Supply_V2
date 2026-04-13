import { motion } from "framer-motion";
import {
  Target, Clock, DollarSign, Star, Scale,
  BarChart3, Package, Trophy, Check, AlertTriangle, Truck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Cell, PieChart as RechartsPieChart, Pie,
} from "recharts";
import { cn } from "@/lib/utils";

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
};

interface ChartProps {
  selectedCotacoes: Array<{
    id: string;
    fornecedor: string;
    total: number;
    valorUnitario: number;
    frete: number;
    prazoEntrega: number;
    quantidadeDisponivel: number;
    condicaoPagamento: string;
  }>;
  radarData: any[];
  barChartData: any[];
  prazoChartData: any[];
  pieData: any[];
  COLORS: string[];
  getScore: (id: string) => { score: number; priceScore: number; prazoScore: number; stockScore: number } | undefined;
  analysis: {
    bestPrice: string;
    bestDelivery: string;
    bestOverall: string;
  };
  quantidade: number;
}

export function RadarTab({ selectedCotacoes, radarData, COLORS }: Pick<ChartProps, 'selectedCotacoes' | 'radarData' | 'COLORS'>) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="h-full">
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Análise Multidimensional
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[calc(100%-60px)]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
              {selectedCotacoes.map((cotacao, index) => (
                <Radar key={cotacao.id} name={cotacao.fornecedor} dataKey={cotacao.fornecedor.substring(0, 10)}
                  stroke={COLORS[index % COLORS.length]} fill={COLORS[index % COLORS.length]} fillOpacity={0.2} strokeWidth={2} />
              ))}
              <Legend />
              <RechartsTooltip contentStyle={tooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function BarsTab({ barChartData }: Pick<ChartProps, 'barChartData'>) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="h-full">
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-success" />
            Comparativo de Valores
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[calc(100%-60px)]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} tickFormatter={(v) => `R$ ${(v/1000).toFixed(1)}k`} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} />
              <RechartsTooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="total" name="Valor Total" radius={[0, 4, 4, 0]}>
                {barChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function PrazoTab({ prazoChartData }: Pick<ChartProps, 'prazoChartData'>) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="h-full">
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-500" />
            Comparativo de Prazos de Entrega
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[calc(100%-60px)]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={prazoChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} />
              <YAxis tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} tickFormatter={(v) => `${v} dias`} />
              <RechartsTooltip formatter={(value: number) => `${value} dias`} contentStyle={tooltipStyle} />
              <Bar dataKey="prazo" name="Prazo (dias)" radius={[4, 4, 0, 0]}>
                {prazoChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function ScoresTab({ selectedCotacoes, pieData, getScore }: Pick<ChartProps, 'selectedCotacoes' | 'pieData' | 'getScore'>) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="h-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="w-5 h-5 text-warning" />
              Pontuação Geral
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-60px)]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value"
                  label={({ name, value }) => `${name.substring(0, 8)}... (${value}pts)`}
                  labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}>
                  {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                </Pie>
                <RechartsTooltip formatter={(value: number) => `${value} pontos`} contentStyle={tooltipStyle} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Ranking de Pontuação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...selectedCotacoes]
                .sort((a, b) => (getScore(b.id)?.score || 0) - (getScore(a.id)?.score || 0))
                .map((cotacao, index) => {
                  const score = getScore(cotacao.id);
                  return (
                    <motion.div key={cotacao.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                            index === 0 ? "bg-warning text-foreground" :
                            index === 1 ? "bg-gray-300 text-foreground" :
                            index === 2 ? "bg-orange-400 text-orange-950" :
                            "bg-muted text-muted-foreground"
                          )}>{index + 1}</span>
                          <span className="font-medium">{cotacao.fornecedor}</span>
                        </div>
                        <span className="font-bold text-lg">{score?.score}pts</span>
                      </div>
                      <Progress value={score?.score} className="h-2" />
                    </motion.div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

export function TableTab({ selectedCotacoes, COLORS, getScore, analysis, quantidade }: Pick<ChartProps, 'selectedCotacoes' | 'COLORS' | 'getScore' | 'analysis' | 'quantidade'>) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Tabela Comparativa Detalhada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Critério</th>
                  {selectedCotacoes.map((c, i) => (
                    <th key={c.id} className="p-3 text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full" style={{ backgroundColor: `${COLORS[i % COLORS.length]}20` }}>
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="font-semibold text-sm">{c.fornecedor}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-3 flex items-center gap-2"><Star className="w-4 h-4 text-warning" />Pontuação</td>
                  {selectedCotacoes.map(c => (
                    <td key={c.id} className="p-3 text-center">
                      <Badge variant={getScore(c.id)?.score! >= 70 ? "default" : "secondary"}>{getScore(c.id)?.score}/100</Badge>
                    </td>
                  ))}
                </tr>
                <tr className="border-b bg-muted/30">
                  <td className="p-3 flex items-center gap-2"><DollarSign className="w-4 h-4 text-success" />Valor Total</td>
                  {selectedCotacoes.map(c => (
                    <td key={c.id} className={cn("p-3 text-center font-semibold", c.id === analysis.bestPrice && "text-success")}>
                      R$ {c.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      {c.id === analysis.bestPrice && <Trophy className="w-4 h-4 inline ml-1 text-warning" />}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 flex items-center gap-2"><Package className="w-4 h-4 text-info" />Valor Unitário</td>
                  {selectedCotacoes.map(c => (<td key={c.id} className="p-3 text-center">R$ {c.valorUnitario.toFixed(2)}</td>))}
                </tr>
                <tr className="border-b bg-muted/30">
                  <td className="p-3 flex items-center gap-2"><Clock className="w-4 h-4 text-purple-500" />Prazo Entrega</td>
                  {selectedCotacoes.map(c => (
                    <td key={c.id} className={cn("p-3 text-center font-semibold", c.id === analysis.bestDelivery && "text-success")}>
                      {c.prazoEntrega} dias
                      {c.id === analysis.bestDelivery && <Trophy className="w-4 h-4 inline ml-1 text-warning" />}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 flex items-center gap-2"><Truck className="w-4 h-4 text-warning" />Frete</td>
                  {selectedCotacoes.map(c => (
                    <td key={c.id} className={cn("p-3 text-center", c.frete === 0 && "text-success")}>
                      {c.frete === 0 ? 'Grátis' : `R$ ${c.frete.toFixed(2)}`}
                    </td>
                  ))}
                </tr>
                <tr className="border-b bg-muted/30">
                  <td className="p-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-cyan-500" />Estoque</td>
                  {selectedCotacoes.map(c => (
                    <td key={c.id} className={cn("p-3 text-center", c.quantidadeDisponivel >= quantidade ? "text-success" : "text-warning")}>
                      {c.quantidadeDisponivel.toLocaleString('pt-BR')} un
                      {c.quantidadeDisponivel >= quantidade ? <Check className="w-4 h-4 inline ml-1" /> : <AlertTriangle className="w-4 h-4 inline ml-1" />}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 flex items-center gap-2"><DollarSign className="w-4 h-4 text-indigo-500" />Pagamento</td>
                  {selectedCotacoes.map(c => (
                    <td key={c.id} className="p-3 text-center"><Badge variant="secondary">{c.condicaoPagamento}</Badge></td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
