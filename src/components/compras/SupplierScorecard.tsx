import { useState } from "react";
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
  Filter
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const mockSuppliers: SupplierScore[] = [
  {
    id: "1",
    name: "XBZ Brindes",
    category: "Brindes Promocionais",
    overallScore: 92,
    previousScore: 88,
    metrics: {
      slaCompliance: 95,
      deliveryTime: 90,
      quality: 94,
      pricing: 88,
      communication: 92,
      flexibility: 90
    },
    riskLevel: 'low',
    riskFactors: [],
    ordersCompleted: 156,
    avgDeliveryDays: 5.2,
    defectRate: 0.8,
    lastOrderDate: "2024-12-14",
    trend: 'up',
    certifications: ["ISO 9001", "FSC"]
  },
  {
    id: "2",
    name: "Asia Import",
    category: "Importados",
    overallScore: 78,
    previousScore: 82,
    metrics: {
      slaCompliance: 72,
      deliveryTime: 68,
      quality: 85,
      pricing: 92,
      communication: 75,
      flexibility: 70
    },
    riskLevel: 'medium',
    riskFactors: ["Lead time variável", "Comunicação lenta"],
    ordersCompleted: 89,
    avgDeliveryDays: 18.5,
    defectRate: 2.1,
    lastOrderDate: "2024-12-10",
    trend: 'down',
    certifications: ["ISO 9001"]
  },
  {
    id: "3",
    name: "Stricker/Spot Gifts",
    category: "Brindes Premium",
    overallScore: 88,
    previousScore: 87,
    metrics: {
      slaCompliance: 90,
      deliveryTime: 85,
      quality: 95,
      pricing: 78,
      communication: 90,
      flexibility: 88
    },
    riskLevel: 'low',
    riskFactors: [],
    ordersCompleted: 72,
    avgDeliveryDays: 7.8,
    defectRate: 0.5,
    lastOrderDate: "2024-12-12",
    trend: 'stable',
    certifications: ["ISO 9001", "ISO 14001", "BSCI"]
  },
  {
    id: "4",
    name: "Só Marcas",
    category: "Têxteis",
    overallScore: 65,
    previousScore: 70,
    metrics: {
      slaCompliance: 58,
      deliveryTime: 55,
      quality: 75,
      pricing: 85,
      communication: 60,
      flexibility: 55
    },
    riskLevel: 'high',
    riskFactors: ["SLA abaixo do esperado", "Atrasos frequentes", "Capacidade limitada"],
    ordersCompleted: 45,
    avgDeliveryDays: 12.3,
    defectRate: 3.8,
    lastOrderDate: "2024-12-08",
    trend: 'down',
    certifications: []
  },
  {
    id: "5",
    name: "Fornecedor Crítico ABC",
    category: "Eletrônicos",
    overallScore: 45,
    previousScore: 55,
    metrics: {
      slaCompliance: 40,
      deliveryTime: 35,
      quality: 60,
      pricing: 70,
      communication: 38,
      flexibility: 30
    },
    riskLevel: 'critical',
    riskFactors: ["Performance crítica", "Múltiplos atrasos", "Qualidade inconsistente", "Risco de ruptura"],
    ordersCompleted: 23,
    avgDeliveryDays: 25.6,
    defectRate: 8.2,
    lastOrderDate: "2024-11-28",
    trend: 'down',
    certifications: []
  }
];

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
    low: { label: "Baixo", variant: "default" as const, className: "bg-success/10 text-success border-emerald-500/20" },
    medium: { label: "Médio", variant: "secondary" as const, className: "bg-warning/10 text-warning border-amber-500/20" },
    high: { label: "Alto", variant: "destructive" as const, className: "bg-warning/10 text-warning border-orange-500/20" },
    critical: { label: "Crítico", variant: "destructive" as const, className: "bg-destructive/10 text-destructive border-red-500/20" }
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

  const filteredSuppliers = mockSuppliers.filter(s => 
    selectedCategory === "all" || s.category === selectedCategory
  );

  const categories = [...new Set(mockSuppliers.map(s => s.category))];

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
            {Math.round(filteredSuppliers.reduce((acc, s) => acc + s.overallScore, 0) / filteredSuppliers.length)}
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
        </h3>

        <div className="space-y-3">
          {filteredSuppliers
            .sort((a, b) => b.overallScore - a.overallScore)
            .map((supplier, index) => {
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
                      <div className="flex items-center gap-2">
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
                            flexibility: "Flexibilidade"
                          };
                          return (
                            <div key={key} className="text-center">
                              <p className="text-xs text-muted-foreground mb-1">{labels[key]}</p>
                              <p className={cn("text-lg font-semibold", getScoreColor(value))}>
                                {value}
                              </p>
                              <Progress 
                                value={value} 
                                className="h-1 mt-1"
                              />
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
      </Card>
    </div>
  );
};
