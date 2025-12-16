import { useMemo, useState } from 'react';
import { Trophy, Medal, TrendingUp, TrendingDown, Clock, CheckCircle, Star, Info, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface SupplierScore {
  id: string;
  name: string;
  slaScore: number;
  deliveryScore: number;
  qualityScore: number;
  overallScore: number;
  trend: 'up' | 'down' | 'stable';
  totalOrders: number;
}

// Weights for score calculation
const WEIGHTS = {
  sla: 0.4,
  delivery: 0.35,
  quality: 0.25,
};

type PeriodDays = 7 | 30 | 90;

// Generate mock supplier ranking data based on period
const generateSupplierRankingData = (periodDays: PeriodDays): SupplierScore[] => {
  const suppliers = [
    { id: 'xbz', name: 'XBZ Brindes' },
    { id: 'tech', name: 'Tech Brindes' },
    { id: 'stricker', name: 'Stricker / Spot Gifts' },
    { id: 'premium', name: 'Premium Gifts' },
    { id: 'asia', name: 'Asia Import' },
    { id: 'eco', name: 'Eco Brindes' },
    { id: 'somarcas', name: 'Só Marcas' },
  ];

  // Use period as seed for slightly different data per period
  const periodSeed = periodDays / 100;

  return suppliers.map((supplier, idx) => {
    // Generate consistent but varying scores based on supplier index and period
    const baseVariation = (idx * 7 + periodDays) % 20;
    const slaScore = 70 + baseVariation + Math.sin(idx + periodSeed) * 10;
    const deliveryScore = 65 + baseVariation + Math.cos(idx + periodSeed) * 12;
    const qualityScore = 75 + (baseVariation * 0.8) + Math.sin(idx * 2 + periodSeed) * 8;
    
    const overallScore = 
      slaScore * WEIGHTS.sla + 
      deliveryScore * WEIGHTS.delivery + 
      qualityScore * WEIGHTS.quality;
    
    // Different trends based on period
    const trendValue = Math.sin(idx + periodDays / 10);
    const trend: 'up' | 'down' | 'stable' = 
      trendValue > 0.3 ? 'up' : trendValue < -0.3 ? 'down' : 'stable';

    // More orders for longer periods
    const orderMultiplier = periodDays / 30;

    return {
      id: supplier.id,
      name: supplier.name,
      slaScore: Math.round(Math.min(100, Math.max(60, slaScore)) * 10) / 10,
      deliveryScore: Math.round(Math.min(100, Math.max(60, deliveryScore)) * 10) / 10,
      qualityScore: Math.round(Math.min(100, Math.max(60, qualityScore)) * 10) / 10,
      overallScore: Math.round(Math.min(100, Math.max(60, overallScore)) * 10) / 10,
      trend,
      totalOrders: Math.floor((15 + idx * 5) * orderMultiplier),
    };
  }).sort((a, b) => b.overallScore - a.overallScore);
};

const getRankIcon = (position: number) => {
  switch (position) {
    case 0:
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    case 1:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 2:
      return <Medal className="h-5 w-5 text-amber-600" />;
    default:
      return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{position + 1}</span>;
  }
};

const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-4 w-4 text-success" />;
    case 'down':
      return <TrendingDown className="h-4 w-4 text-destructive" />;
    default:
      return <span className="text-xs text-muted-foreground">—</span>;
  }
};

const getScoreColor = (score: number) => {
  if (score >= 90) return 'text-success';
  if (score >= 80) return 'text-primary';
  if (score >= 70) return 'text-warning';
  return 'text-destructive';
};

const getProgressColor = (score: number) => {
  if (score >= 90) return 'bg-success';
  if (score >= 80) return 'bg-primary';
  if (score >= 70) return 'bg-warning';
  return 'bg-destructive';
};

interface SupplierRankItemProps {
  supplier: SupplierScore;
  position: number;
  isExpanded: boolean;
  onToggle: () => void;
}

const SupplierRankItem = ({ supplier, position, isExpanded, onToggle }: SupplierRankItemProps) => {
  return (
    <div 
      className={cn(
        "p-3 rounded-lg border transition-all cursor-pointer hover:shadow-sm",
        position === 0 && "border-yellow-500/30 bg-yellow-500/5",
        position === 1 && "border-gray-400/30 bg-gray-400/5",
        position === 2 && "border-amber-600/30 bg-amber-600/5",
        position > 2 && "border-border bg-muted/30"
      )}
      onClick={onToggle}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-6">
          {getRankIcon(position)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{supplier.name}</span>
            {getTrendIcon(supplier.trend)}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {supplier.totalOrders} pedidos
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className={cn("text-xl font-bold", getScoreColor(supplier.overallScore))}>
            {supplier.overallScore.toFixed(1)}
          </span>
          <p className="text-xs text-muted-foreground">pontos</p>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle className="h-3 w-3" />
                      <span>SLA ({(WEIGHTS.sla * 100).toFixed(0)}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={supplier.slaScore} 
                        className="h-1.5 flex-1"
                      />
                      <span className={cn("font-medium", getScoreColor(supplier.slaScore))}>
                        {supplier.slaScore.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Cumprimento de SLA acordado</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Prazo ({(WEIGHTS.delivery * 100).toFixed(0)}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={supplier.deliveryScore} 
                        className="h-1.5 flex-1"
                      />
                      <span className={cn("font-medium", getScoreColor(supplier.deliveryScore))}>
                        {supplier.deliveryScore.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Entrega dentro do prazo</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Star className="h-3 w-3" />
                      <span>Qualidade ({(WEIGHTS.quality * 100).toFixed(0)}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={supplier.qualityScore} 
                        className="h-1.5 flex-1"
                      />
                      <span className={cn("font-medium", getScoreColor(supplier.qualityScore))}>
                        {supplier.qualityScore.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Qualidade dos produtos entregues</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}
    </div>
  );
};

export const SupplierRankingPanel = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState<PeriodDays>(30);
  
  const supplierData = useMemo(() => generateSupplierRankingData(periodDays), [periodDays]);

  const topPerformer = supplierData[0];
  const avgScore = supplierData.reduce((sum, s) => sum + s.overallScore, 0) / supplierData.length;

  const periodLabels: Record<PeriodDays, string> = {
    7: 'Últimos 7 dias',
    30: 'Últimos 30 dias',
    90: 'Últimos 90 dias',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Ranking
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select
              value={periodDays.toString()}
              onValueChange={(value) => setPeriodDays(Number(value) as PeriodDays)}
            >
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
              </SelectContent>
            </Select>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="gap-1 cursor-help">
                    <Info className="h-3 w-3" />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium mb-1">Pesos da pontuação:</p>
                  <ul className="text-xs space-y-1">
                    <li>• SLA: {(WEIGHTS.sla * 100).toFixed(0)}%</li>
                    <li>• Prazo de Entrega: {(WEIGHTS.delivery * 100).toFixed(0)}%</li>
                    <li>• Qualidade: {(WEIGHTS.quality * 100).toFixed(0)}%</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-xs text-muted-foreground">Melhor Fornecedor</p>
            <p className="font-semibold text-sm truncate">{topPerformer.name}</p>
            <p className="text-lg font-bold text-yellow-600">{topPerformer.overallScore.toFixed(1)} pts</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">Média Geral</p>
            <p className="font-semibold text-sm">{supplierData.length} fornecedores</p>
            <p className={cn("text-lg font-bold", getScoreColor(avgScore))}>
              {avgScore.toFixed(1)} pts
            </p>
          </div>
        </div>

        {/* Ranking List */}
        <div className="space-y-2">
          {supplierData.map((supplier, index) => (
            <SupplierRankItem
              key={supplier.id}
              supplier={supplier}
              position={index}
              isExpanded={expandedId === supplier.id}
              onToggle={() => setExpandedId(expandedId === supplier.id ? null : supplier.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
