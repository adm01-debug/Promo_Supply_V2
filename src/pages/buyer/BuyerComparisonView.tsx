import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, PiggyBank, Percent, Target, Award,
  ShoppingCart, CheckCircle2, Zap, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import type { BuyerData } from "@/hooks/useBuyerPerformanceData";
import React from "react";

const COLORS = ['hsl(var(--primary))', 'hsl(142, 76%, 36%)', 'hsl(221, 83%, 53%)', 'hsl(262, 83%, 58%)'];

const ComparisonMetricCard = ({ 
  label, icon: Icon, value1, value2, format = "number", color 
}: { 
  label: string; icon: React.ElementType; value1: number; value2: number;
  format?: "number" | "currency" | "percent"; color: string;
}) => {
  const formatValue = (val: number) => {
    if (format === "currency") return `R$ ${val.toLocaleString('pt-BR')}`;
    if (format === "percent") return `${val}%`;
    return val.toString();
  };
  const diff = value1 - value2;
  const percentDiff = value2 !== 0 ? ((diff / value2) * 100).toFixed(1) : "0";
  const isPositive = diff > 0;

  return (
    <Card className="p-4">
      <div className={`flex items-center gap-2 ${color} mb-3`}>
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center border-r border-border">
          <p className={`text-xl font-bold ${color}`}>{formatValue(value1)}</p>
        </div>
        <div className="text-center">
          <p className={`text-xl font-bold ${color}`}>{formatValue(value2)}</p>
        </div>
      </div>
      <div className="mt-2 text-center">
        <Badge variant={isPositive ? "default" : "secondary"} className="text-xs">
          {isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
          {isPositive ? "+" : ""}{percentDiff}% diferença
        </Badge>
      </div>
    </Card>
  );
};

interface BuyerComparisonViewProps {
  buyer: BuyerData;
  compareBuyer: BuyerData;
  CustomTooltip: React.ComponentType<any>;
}

export const BuyerComparisonView = ({ buyer, compareBuyer, CustomTooltip }: BuyerComparisonViewProps) => {
  const comparisonRadarData = buyer.radar.map((item, index) => ({
    subject: item.subject,
    [buyer.nome]: item.value,
    [compareBuyer.nome]: compareBuyer.radar[index]?.value || 0,
    fullMark: 100,
  }));

  const comparisonHistorico = buyer.historico.map((item, index) => ({
    mes: item.mes,
    [`${buyer.nome} Economia`]: item.economia,
    [`${compareBuyer.nome} Economia`]: compareBuyer.historico[index]?.economia || 0,
  }));

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[buyer, compareBuyer].map((b, idx) => (
          <Card key={b.id} className={`p-6 ${idx === 0 ? 'border-primary/30' : 'border-blue-500/30'}`}>
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl ${idx === 0 ? 'bg-primary/10 text-primary' : 'bg-info/10 text-info'}`}>
                {b.avatar}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold text-foreground">{b.nome}</h2>
                  <Badge variant="secondary" className="text-xs">{b.cargo}</Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <ShoppingCart className="w-3 h-3" />
                    {b.performance.fornecedoresAtivos} fornecedores
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-success" />
                    {b.performance.taxaSucesso}% sucesso
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ComparisonMetricCard label="Economia do Mês" icon={PiggyBank} value1={buyer.performance.economiaMes} value2={compareBuyer.performance.economiaMes} format="currency" color="text-success" />
        <ComparisonMetricCard label="Desconto Médio" icon={Percent} value1={buyer.performance.descontoMedio} value2={compareBuyer.performance.descontoMedio} format="percent" color="text-info" />
        <ComparisonMetricCard label="Cotações" icon={Target} value1={buyer.performance.cotacoesRealizadas} value2={compareBuyer.performance.cotacoesRealizadas} format="number" color="text-purple-600" />
        <ComparisonMetricCard label="Taxa Melhor Preço" icon={Award} value1={buyer.performance.melhorPrecoRate} value2={compareBuyer.performance.melhorPrecoRate} format="percent" color="text-warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Comparativo de Economia Mensal
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={comparisonHistorico}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="mes" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey={`${buyer.nome} Economia`} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey={`${compareBuyer.nome} Economia`} fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-warning" />
            Radar Comparativo
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={comparisonRadarData}>
              <PolarGrid className="stroke-border" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
              <Radar name={buyer.nome} dataKey={buyer.nome} stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.3} strokeWidth={2} />
              <Radar name={compareBuyer.nome} dataKey={compareBuyer.nome} stroke={COLORS[2]} fill={COLORS[2]} fillOpacity={0.3} strokeWidth={2} />
              <Legend />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </>
  );
};
