import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Clock,
  Package,
  Award,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Filter,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface SupplierScore {
  id: string;
  name: string;
  category: string;
  overallScore: number;
  previousScore: number;
  metrics: {
    slaCompliance: number;
    deliveryTime: number;
    quality: number;
    pricing: number;
    communication: number;
    flexibility: number;
  };
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  ordersCompleted: number;
  avgDeliveryDays: number;
  defectRate: number;
  lastOrderDate: string;
  trend: 'up' | 'down' | 'stable';
  certifications: string[];
}

function useSupplierScorecardData(periodDays: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['supplier-scorecard', periodDays],
    queryFn: async (): Promise<SupplierScore[]> => {
      const cutoff = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

      // Fetch suppliers, pedidos, qualification scores in parallel
      const [fornRes, pedRes, qualRes, devRes] = await Promise.all([
        supabase.from('fornecedores').select('id, razao_social, segmento, avaliacao, prazo_medio_entrega, status'),
        supabase.from('pedidos').select('id, fornecedor_id, status, valor_total, data_entrega, data_previsao, created_at').gte('created_at', cutoff),
        supabase.from('supplier_qualification_scores').select('fornecedor_id, overall_score, compliance_score, document_score, expiry_score, qualification_status'),
        supabase.from('devolucoes').select('id, fornecedor_id, status').gte('created_at', cutoff),
      ]);

      const fornecedores = fornRes.data || [];
      const pedidos = pedRes.data || [];
      const qualScores = qualRes.data || [];
      const devolucoes = devRes.data || [];

      return fornecedores
        .filter(f => f.status === 'ativo')
        .map(f => {
          const fPedidos = pedidos.filter(p => p.fornecedor_id === f.id);
          const fQual = qualScores.find(q => q.fornecedor_id === f.id);
          const fDevs = devolucoes.filter(d => d.fornecedor_id === f.id);

          const ordersCompleted = fPedidos.filter(p => p.status === 'entregue').length;
          const totalOrders = fPedidos.length;

          // Delivery metrics
          const deliveredOrders = fPedidos.filter(p => p.data_entrega && p.data_previsao);
          const onTime = deliveredOrders.filter(p => {
            const real = new Date(p.data_entrega!);
            const prev = new Date(p.data_previsao!);
            return real <= prev;
          }).length;

          const slaCompliance = deliveredOrders.length > 0 ? Math.round((onTime / deliveredOrders.length) * 100) : 80;

          // Avg delivery days
          const avgDays = deliveredOrders.length > 0
            ? deliveredOrders.reduce((sum, p) => {
                const diff = (new Date(p.data_entrega!).getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24);
                return sum + Math.max(0, diff);
              }, 0) / deliveredOrders.length
            : f.prazo_medio_entrega || 10;

          // Quality from qualification scores (overall_score is 0-100)
          const quality = fQual ? Math.round(fQual.overall_score) : Math.round((f.avaliacao || 3) * 20);

          // Defect rate from devolucoes
          const defectRate = totalOrders > 0
            ? Math.round((fDevs.length / totalOrders) * 100 * 10) / 10
            : 0;

          // Communication & flexibility derived from qualification sub-scores
          const communication = fQual ? Math.round(fQual.compliance_score) : 70;
          const flexibility = fQual ? Math.round(fQual.document_score) : 70;

          // Delivery time score (inverse of avg days)
          const deliveryTime = Math.max(0, Math.min(100, Math.round(100 - (avgDays - 3) * 3)));

          // Pricing score estimate from expiry_score or avaliacao
          const pricing = fQual ? Math.round(fQual.expiry_score) : 75;

          // Overall score
          const overallScore = Math.round(
            slaCompliance * 0.25 +
            deliveryTime * 0.20 +
            quality * 0.25 +
            pricing * 0.15 +
            communication * 0.08 +
            flexibility * 0.07
          );

          // Previous score estimate (baseline from avaliacao)
          const previousScore = Math.round((f.avaliacao || 3) * 20);

          // Risk level
          let riskLevel: SupplierScore['riskLevel'] = 'low';
          if (overallScore < 50) riskLevel = 'critical';
          else if (overallScore < 65) riskLevel = 'high';
          else if (overallScore < 80) riskLevel = 'medium';

          // Risk factors
          const riskFactors: string[] = [];
          if (slaCompliance < 70) riskFactors.push('SLA abaixo do esperado');
          if (avgDays > 15) riskFactors.push('Lead time elevado');
          if (defectRate > 3) riskFactors.push('Taxa de defeito alta');
          if (totalOrders === 0) riskFactors.push('Sem pedidos recentes');
          if (fQual?.qualification_status === 'blocked') riskFactors.push('Fornecedor bloqueado');

          // Trend
          const trend: SupplierScore['trend'] = overallScore > previousScore + 2
            ? 'up'
            : overallScore < previousScore - 2
              ? 'down'
              : 'stable';

          // Last order date
          const lastOrder = [...fPedidos].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

          return {
            id: f.id,
            name: f.razao_social,
            category: f.segmento || 'Geral',
            overallScore,
            previousScore,
            metrics: { slaCompliance, deliveryTime, quality, pricing, communication, flexibility },
            riskLevel,
            riskFactors,
            ordersCompleted,
            avgDeliveryDays: Math.round(avgDays * 10) / 10,
            defectRate,
            lastOrderDate: lastOrder?.created_at || '',
            trend,
            certifications: [],
          };
        })
        .filter(s => s.ordersCompleted > 0 || s.overallScore > 0)
        .sort((a, b) => b.overallScore - a.overallScore);
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

const getScoreColor = (score: number) => {
  if (score >= 85) return "text-success";
  if (score >= 70) return "text-warning";
  if (score >= 50) return "text-warning";
  return "text-destructive";
};

const getScoreBg = (score: number) => {
  if (score >= 85) return "bg-success";
  if (score >= 70) return "bg-warning";
  if (score >= 50) return "bg-warning";
  return "bg-destructive";
};

const getRiskBadge = (risk: SupplierScore['riskLevel']) => {
  const config = {
    low: { label: "Baixo", className: "bg-success/10 text-success border-emerald-500/20" },
    medium: { label: "Médio", className: "bg-warning/10 text-warning border-amber-500/20" },
    high: { label: "Alto", className: "bg-warning/10 text-warning border-orange-500/20" },
    critical: { label: "Crítico", className: "bg-destructive/10 text-destructive border-red-500/20" },
  };
  return config[risk];
};

const TrendIcon = ({ trend }: { trend: SupplierScore['trend'] }) => {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-success" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-destructive" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
};

export const SupplierScorecard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierScore | null>(null);

  const { data: suppliers = [], isLoading } = useSupplierScorecardData(parseInt(selectedPeriod));

  const filteredSuppliers = useMemo(() =>
    suppliers.filter(s => selectedCategory === "all" || s.category === selectedCategory),
    [suppliers, selectedCategory]
  );

  const categories = useMemo(() => [...new Set(suppliers.map(s => s.category))], [suppliers]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Categorias</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Award className="w-4 h-4" />
            <span className="text-sm">Score Médio</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {filteredSuppliers.length > 0
              ? Math.round(filteredSuppliers.reduce((acc, s) => acc + s.overallScore, 0) / filteredSuppliers.length)
              : '—'}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <CheckCircle className="w-4 h-4 text-success" />
            <span className="text-sm">Baixo Risco</span>
          </div>
          <p className="text-2xl font-bold text-success">
            {filteredSuppliers.filter(s => s.riskLevel === 'low').length}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <span className="text-sm">Risco Médio/Alto</span>
          </div>
          <p className="text-2xl font-bold text-warning">
            {filteredSuppliers.filter(s => s.riskLevel === 'medium' || s.riskLevel === 'high').length}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <XCircle className="w-4 h-4 text-destructive" />
            <span className="text-sm">Críticos</span>
          </div>
          <p className="text-2xl font-bold text-destructive">
            {filteredSuppliers.filter(s => s.riskLevel === 'critical').length}
          </p>
        </Card>
      </div>

      {/* Scorecard Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Scorecard de Fornecedores
          <Badge variant="outline" className="ml-2 text-xs">{filteredSuppliers.length} fornecedores</Badge>
        </h3>

        {filteredSuppliers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum fornecedor com dados no período</p>
            <p className="text-sm mt-1">Tente ampliar o período de análise</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSuppliers.map((supplier, index) => {
              const riskBadge = getRiskBadge(supplier.riskLevel);
              const scoreDiff = supplier.overallScore - supplier.previousScore;

              return (
                <div
                  key={supplier.id}
                  className={cn(
                    "p-4 rounded-lg border transition-all cursor-pointer hover:border-primary/50",
                    selectedSupplier?.id === supplier.id && "border-primary bg-primary/5"
                  )}
                  onClick={() => setSelectedSupplier(
                    selectedSupplier?.id === supplier.id ? null : supplier
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      index === 0 && "bg-warning/20 text-warning",
                      index === 1 && "bg-slate-400/20 text-muted-foreground",
                      index === 2 && "bg-warning/20 text-warning",
                      index > 2 && "bg-muted text-muted-foreground"
                    )}>
                      {index + 1}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-foreground">{supplier.name}</h4>
                        <Badge variant="outline" className="text-[10px]">
                          {supplier.category}
                        </Badge>
                        <Badge variant="outline" className={cn("text-[10px]", riskBadge.className)}>
                          Risco {riskBadge.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {supplier.ordersCompleted} pedidos
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {supplier.avgDeliveryDays.toFixed(1)} dias
                        </span>
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {supplier.defectRate}% defeitos
                        </span>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={cn("text-2xl font-bold", getScoreColor(supplier.overallScore))}>
                          {supplier.overallScore}
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <TrendIcon trend={supplier.trend} />
                          <span className={cn(
                            scoreDiff > 0 && "text-success",
                            scoreDiff < 0 && "text-destructive",
                            scoreDiff === 0 && "text-muted-foreground"
                          )}>
                            {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff}
                          </span>
                        </div>
                      </div>
                      <div className="w-20">
                        <Progress
                          value={supplier.overallScore}
                          className={cn("h-2", `[&>div]:${getScoreBg(supplier.overallScore)}`)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedSupplier?.id === supplier.id && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {Object.entries(supplier.metrics).map(([key, value]) => {
                          const labels: Record<string, string> = {
                            slaCompliance: "SLA",
                            deliveryTime: "Entrega",
                            quality: "Qualidade",
                            pricing: "Preço",
                            communication: "Comunicação",
                            flexibility: "Flexibilidade",
                          };
                          return (
                            <div key={key} className="text-center">
                              <p className="text-xs text-muted-foreground mb-1">{labels[key]}</p>
                              <p className={cn("text-lg font-semibold", getScoreColor(value))}>
                                {value}
                              </p>
                              <Progress value={value} className="h-1 mt-1" />
                            </div>
                          );
                        })}
                      </div>

                      {supplier.riskFactors.length > 0 && (
                        <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-red-500/20">
                          <p className="text-xs font-medium text-destructive mb-2 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Fatores de Risco
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {supplier.riskFactors.map((factor, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] border-red-500/30 text-destructive">
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {supplier.certifications.length > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          <Star className="w-4 h-4 text-warning" />
                          <span className="text-xs text-muted-foreground">Certificações:</span>
                          {supplier.certifications.map((cert, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">
                              {cert}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
