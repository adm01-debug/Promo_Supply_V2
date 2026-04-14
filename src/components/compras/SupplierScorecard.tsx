import { useState, useMemo } from "react";
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
import { cn } from "@/lib/utils";
import {
  type SupplierScore,
  useSupplierScorecardData,
  getScoreColor,
  getScoreBg,
  getRiskBadge,
} from "./scorecard/supplierScorecardData";

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
