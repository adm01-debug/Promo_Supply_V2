import { useState, useMemo } from "react";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Shield,
  Zap,
  DollarSign,
  Clock,
  Package,
  Users,
  MapPin
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/paginatedFetch";
import { Skeleton } from "@/components/ui/skeleton";

interface RiskData {
  supplierId: string;
  supplierName: string;
  category: string;
  risks: {
    financial: number;      // 0-100
    operational: number;    // 0-100
    quality: number;        // 0-100
    delivery: number;       // 0-100
    concentration: number;  // 0-100
    geopolitical: number;   // 0-100
  };
  overallRisk: number;
  trend: 'improving' | 'worsening' | 'stable';
  volume: number; // % do total de compras
}

// Risk data is now fetched from Supabase real data in the component logic

const riskCategories = [
  { key: 'financial', label: 'Financeiro', icon: DollarSign, description: 'Saúde financeira e estabilidade' },
  { key: 'operational', label: 'Operacional', icon: Zap, description: 'Capacidade e processos' },
  { key: 'quality', label: 'Qualidade', icon: Shield, description: 'Conformidade e defeitos' },
  { key: 'delivery', label: 'Entrega', icon: Clock, description: 'Pontualidade e SLA' },
  { key: 'concentration', label: 'Concentração', icon: Package, description: 'Dependência do fornecedor' },
  { key: 'geopolitical', label: 'Geopolítico', icon: MapPin, description: 'Riscos regionais/internacionais' }
];

const getRiskColor = (value: number) => {
  if (value <= 25) return { bg: 'bg-success', text: 'text-success', light: 'bg-success/20' };
  if (value <= 50) return { bg: 'bg-warning', text: 'text-warning', light: 'bg-warning/20' };
  if (value <= 75) return { bg: 'bg-warning', text: 'text-warning', light: 'bg-warning/20' };
  return { bg: 'bg-destructive', text: 'text-destructive', light: 'bg-destructive/20' };
};

const getRiskLabel = (value: number) => {
  if (value <= 25) return 'Baixo';
  if (value <= 50) return 'Médio';
  if (value <= 75) return 'Alto';
  return 'Crítico';
};

export const RiskHeatMap = () => {
  const [hoveredCell, setHoveredCell] = useState<{ supplier: string; category: string } | null>(null);

  const { data: fornecedores, isLoading: loadingForn } = useQuery({
    queryKey: ['risk-heatmap-fornecedores'],
    queryFn: () => fetchAllRows<{ id: string; razao_social: string; avaliacao: number | null; status: string; categorias: { nome: string } }>('fornecedores', 'id, razao_social, avaliacao, status, categorias(nome)'),
    staleTime: 60000,
  });

  const { data: pedidos, isLoading: loadingPed } = useQuery({
    queryKey: ['risk-heatmap-pedidos'],
    queryFn: () => fetchAllRows<{ fornecedor_id: string; status: string; data_previsao: string; data_entrega: string; valor_total: number }>('pedidos', 'fornecedor_id, status, data_previsao, data_entrega, valor_total'),
    staleTime: 60000,
  });

  const riskData = useMemo(() => {
    if (!fornecedores || !pedidos) return [];

    const totalSpend = pedidos.reduce((sum, p) => sum + (Number(p.valor_total) || 0), 1); // avoid div by zero

    return fornecedores.filter(f => f.status === 'ativo').map(f => {
      const supplierPeds = pedidos.filter(p => p.fornecedor_id === f.id);
      const supplierSpend = supplierPeds.reduce((sum, p) => sum + (Number(p.valor_total) || 0), 0);
      const spendPercent = Math.round((supplierSpend / totalSpend) * 100);

      const delivered = supplierPeds.filter(p => p.status === 'entregue');
      const onTime = delivered.filter(p => 
        p.data_entrega && p.data_previsao && p.data_entrega <= p.data_previsao
      ).length;
      
      const onTimeRate = delivered.length > 0 ? (onTime / delivered.length) * 100 : 90;
      
      // Calculate individual risks (0-100, where higher is worse)
      const deliveryRisk = Math.round(100 - onTimeRate);
      const qualityRisk = Math.round(100 - (Number(f.avaliacao || 4.5) * 20));
      const concentrationRisk = Math.min(100, spendPercent * 3); // 33% spend = 100% concentration risk
      const financialRisk = Math.round(Math.max(10, 40 - (Number(f.avaliacao || 4) * 5))); // Pseudo-financial risk
      const operationalRisk = Math.round(Math.max(15, deliveryRisk * 0.8 + qualityRisk * 0.2));
      const geopoliticalRisk = f.categorias?.nome === 'Eletrônicos' || f.categorias?.nome === 'Tecnologia' ? 60 : 15;

      const overallRisk = Math.round(
        financialRisk * 0.15 + 
        operationalRisk * 0.25 + 
        qualityRisk * 0.2 + 
        deliveryRisk * 0.2 + 
        concentrationRisk * 0.1 + 
        geopoliticalRisk * 0.1
      );

      return {
        supplierId: f.id,
        supplierName: f.razao_social,
        category: (f as any).categorias?.nome || 'Geral',
        risks: {
          financial: financialRisk,
          operational: operationalRisk,
          quality: qualityRisk,
          delivery: deliveryRisk,
          concentration: concentrationRisk,
          geopolitical: geopoliticalRisk
        },
        overallRisk,
        trend: overallRisk > 40 ? 'worsening' : overallRisk < 20 ? 'improving' : 'stable',
        volume: spendPercent
      } as RiskData;
    });
  }, [fornecedores, pedidos]);

  if (loadingForn || loadingPed) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
        <Card className="p-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </Card>
      </div>
    );
  }

  // Sort suppliers by overall risk (highest first)
  const sortedSuppliers = [...riskData].sort((a, b) => b.overallRisk - a.overallRisk);

  return (
    <div className="space-y-6">
      {/* Risk Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-emerald-500/30 bg-success/5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="text-sm text-muted-foreground">Risco Baixo</span>
          </div>
          <p className="text-2xl font-bold text-success">
            {riskData.filter(s => s.overallRisk <= 25).length}
          </p>
          <p className="text-xs text-muted-foreground">fornecedores</p>
        </Card>
        <Card className="p-4 border-amber-500/30 bg-warning/5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span className="text-sm text-muted-foreground">Risco Médio</span>
          </div>
          <p className="text-2xl font-bold text-warning">
            {riskData.filter(s => s.overallRisk > 25 && s.overallRisk <= 50).length}
          </p>
          <p className="text-xs text-muted-foreground">fornecedores</p>
        </Card>
        <Card className="p-4 border-orange-500/30 bg-warning/5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span className="text-sm text-muted-foreground">Risco Alto</span>
          </div>
          <p className="text-2xl font-bold text-warning">
            {riskData.filter(s => s.overallRisk > 50 && s.overallRisk <= 75).length}
          </p>
          <p className="text-xs text-muted-foreground">fornecedores</p>
        </Card>
        <Card className="p-4 border-red-500/30 bg-destructive/5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-sm text-muted-foreground">Risco Crítico</span>
          </div>
          <p className="text-2xl font-bold text-destructive">
            {riskData.filter(s => s.overallRisk > 75).length}
          </p>
          <p className="text-xs text-muted-foreground">fornecedores</p>
        </Card>
      </div>

      {/* Heat Map */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-primary" />
          Mapa de Calor de Riscos
        </h3>

        <div className="overflow-x-auto">
          <TooltipProvider>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-2 text-sm font-medium text-muted-foreground w-40">
                    Fornecedor
                  </th>
                  {riskCategories.map(cat => (
                    <th key={cat.key} className="p-2 text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="flex flex-col items-center gap-1 cursor-help w-full bg-transparent border-0">
                            <cat.icon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{cat.label}</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{cat.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </th>
                  ))}
                  <th className="p-2 text-center text-sm font-medium text-muted-foreground">
                    Geral
                  </th>
                  <th className="p-2 text-center text-sm font-medium text-muted-foreground">
                    Volume
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedSuppliers.map(supplier => {
                  const overallColor = getRiskColor(supplier.overallRisk);
                  
                  return (
                    <tr key={supplier.supplierId} className="border-t border-border">
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground truncate max-w-[120px]">
                            {supplier.supplierName}
                          </span>
                          {supplier.trend === 'improving' && (
                            <TrendingDown className="w-3 h-3 text-success" />
                          )}
                          {supplier.trend === 'worsening' && (
                            <TrendingUp className="w-3 h-3 text-destructive" />
                          )}
                        </div>
                        <Badge variant="outline" className="text-[9px] mt-1">
                          {supplier.category}
                        </Badge>
                      </td>
                      
                      {riskCategories.map(cat => {
                        const value = supplier.risks[cat.key as keyof typeof supplier.risks];
                        const color = getRiskColor(value);
                        const isHovered = hoveredCell?.supplier === supplier.supplierId && 
                                         hoveredCell?.category === cat.key;
                        
                        return (
                          <td key={cat.key} className="p-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className={cn(
                                    "w-12 h-12 mx-auto rounded-lg flex items-center justify-center transition-all cursor-pointer border-0 bg-transparent",
                                    color.light,
                                    isHovered && "ring-2 ring-primary scale-110"
                                  )}
                                  onMouseEnter={() => setHoveredCell({ 
                                    supplier: supplier.supplierId, 
                                    category: cat.key 
                                  })}
                                  onMouseLeave={() => setHoveredCell(null)}
                                >
                                  <span className={cn("text-sm font-bold", color.text)}>
                                    {value}
                                  </span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1">
                                  <p className="font-medium">{supplier.supplierName}</p>
                                  <p className="text-sm">{cat.label}: {getRiskLabel(value)}</p>
                                  <p className="text-xs text-muted-foreground">{cat.description}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </td>
                        );
                      })}
                      
                      {/* Overall Risk */}
                      <td className="p-2">
                        <div className={cn(
                          "w-14 h-12 mx-auto rounded-lg flex flex-col items-center justify-center",
                          overallColor.light
                        )}>
                          <span className={cn("text-lg font-bold", overallColor.text)}>
                            {supplier.overallRisk}
                          </span>
                          <span className={cn("text-[9px]", overallColor.text)}>
                            {getRiskLabel(supplier.overallRisk)}
                          </span>
                        </div>
                      </td>
                      
                      {/* Volume */}
                      <td className="p-2 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-medium text-foreground">{supplier.volume}%</span>
                          <div className="w-12 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${supplier.volume}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TooltipProvider>
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Legenda de Risco:</p>
          <div className="flex items-center gap-6">
            {[
              { range: '0-25', label: 'Baixo', color: 'bg-success' },
              { range: '26-50', label: 'Médio', color: 'bg-warning' },
              { range: '51-75', label: 'Alto', color: 'bg-warning' },
              { range: '76-100', label: 'Crítico', color: 'bg-destructive' }
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded", item.color)} />
                <span className="text-xs text-muted-foreground">
                  {item.label} ({item.range})
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Risk Alerts */}
      <Card className="p-6 border-red-500/30 bg-destructive/5">
        <h3 className="text-lg font-semibold text-destructive mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Alertas de Risco Prioritários
        </h3>
        <div className="space-y-3">
          {sortedSuppliers
            .filter(s => s.overallRisk > 50)
            .map(supplier => (
              <div key={supplier.supplierId} className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  getRiskColor(supplier.overallRisk).light
                )}>
                  <AlertTriangle className={cn("w-4 h-4", getRiskColor(supplier.overallRisk).text)} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{supplier.supplierName}</p>
                  <p className="text-sm text-muted-foreground">
                    {Object.entries(supplier.risks)
                      .filter(([_, v]) => v > 50)
                      .map(([k]) => riskCategories.find(c => c.key === k)?.label)
                      .join(', ')} acima do limite
                  </p>
                </div>
                <Badge className={cn(
                  "text-[10px]",
                  getRiskColor(supplier.overallRisk).light,
                  getRiskColor(supplier.overallRisk).text
                )}>
                  Risco {supplier.overallRisk}
                </Badge>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
};
