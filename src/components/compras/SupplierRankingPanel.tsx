import { useMemo, useState, forwardRef } from 'react';
import { Trophy, Medal, TrendingUp, TrendingDown, Clock, CheckCircle, Star, Info, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

const WEIGHTS = {
  sla: 0.4,
  delivery: 0.35,
  quality: 0.25,
};

const getRankIcon = (position: number) => {
  switch (position) {
    case 0: return <Trophy className="h-5 w-5 text-warning" />;
    case 1: return <Medal className="h-5 w-5 text-muted-foreground" />;
    case 2: return <Medal className="h-5 w-5 text-warning" />;
    default: return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{position + 1}</span>;
  }
};

const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up': return <TrendingUp className="h-4 w-4 text-success" />;
    case 'down': return <TrendingDown className="h-4 w-4 text-destructive" />;
    default: return <span className="text-xs text-muted-foreground">—</span>;
  }
};

const getScoreColor = (score: number) => {
  if (score >= 90) return 'text-success';
  if (score >= 80) return 'text-primary';
  if (score >= 70) return 'text-warning';
  return 'text-destructive';
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
        position === 0 && "border-yellow-500/30 bg-warning/5",
        position === 1 && "border-gray-400/30 bg-gray-400/5",
        position === 2 && "border-amber-600/30 bg-warning/5",
        position > 2 && "border-border bg-muted/30"
      )}
      onClick={onToggle}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-6">{getRankIcon(position)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{supplier.name}</span>
            {getTrendIcon(supplier.trend)}
          </div>
          <span className="text-xs text-muted-foreground">{supplier.totalOrders} pedidos</span>
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
            {[
              { icon: CheckCircle, label: 'SLA', weight: WEIGHTS.sla, score: supplier.slaScore },
              { icon: Clock, label: 'Prazo', weight: WEIGHTS.delivery, score: supplier.deliveryScore },
              { icon: Star, label: 'Qualidade', weight: WEIGHTS.quality, score: supplier.qualityScore },
            ].map(({ icon: Icon, label, weight, score }) => (
              <TooltipProvider key={label}>
                <Tooltip>
                  <TooltipTrigger className="w-full text-left cursor-help">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Icon className="h-3 w-3" />
                        <span>{label} ({(weight * 100).toFixed(0)}%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={score} className="h-1.5 flex-1" />
                        <span className={cn("font-medium", getScoreColor(score))}>
                          {score.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent><p>{label} do fornecedor</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const SupplierRankingPanel = forwardRef<HTMLDivElement>((_props, ref) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState<number>(30);

  const { data: fornecedores, isLoading } = useQuery({
    queryKey: ['supplier-ranking', periodDays],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('id, razao_social, avaliacao, status')
        .eq('status', 'ativo');
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  const { data: pedidos } = useQuery({
    queryKey: ['supplier-ranking-pedidos', periodDays],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - periodDays);
      const { data, error } = await supabase
        .from('pedidos')
        .select('id, fornecedor_id, status, data_previsao, data_entrega')
        .gte('data_emissao', since.toISOString().split('T')[0]);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  const supplierData = useMemo<SupplierScore[]>(() => {
    const forn = fornecedores || [];
    const peds = pedidos || [];

    return forn.map(f => {
      const supplierPeds = peds.filter(p => p.fornecedor_id === f.id);
      const totalOrders = supplierPeds.length;
      
      const delivered = supplierPeds.filter(p => p.status === 'entregue');
      const onTime = delivered.filter(p => 
        p.data_entrega && p.data_previsao && p.data_entrega <= p.data_previsao
      ).length;
      
      const deliveryScore = delivered.length > 0 ? (onTime / delivered.length) * 100 : 80;
      const qualityScore = Number(f.avaliacao || 0) * 20; // 1-5 scale to 0-100
      const slaScore = totalOrders > 0 ? Math.min(100, deliveryScore + 5) : 75;
      
      const overallScore = slaScore * WEIGHTS.sla + deliveryScore * WEIGHTS.delivery + qualityScore * WEIGHTS.quality;
      
      // Simple trend based on recent delivery performance
      const trend: 'up' | 'down' | 'stable' = 
        deliveryScore >= 90 ? 'up' : deliveryScore < 70 ? 'down' : 'stable';

      return {
        id: f.id,
        name: f.razao_social,
        slaScore: Math.round(Math.min(100, slaScore) * 10) / 10,
        deliveryScore: Math.round(Math.min(100, deliveryScore) * 10) / 10,
        qualityScore: Math.round(Math.min(100, qualityScore) * 10) / 10,
        overallScore: Math.round(Math.min(100, overallScore) * 10) / 10,
        trend,
        totalOrders,
      };
    }).sort((a, b) => b.overallScore - a.overallScore);
  }, [fornecedores, pedidos]);

  if (isLoading) {
    return (
      <Card ref={ref}>
        <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
        <CardContent className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}
        </CardContent>
      </Card>
    );
  }

  const topPerformer = supplierData[0];
  const avgScore = supplierData.length > 0 
    ? supplierData.reduce((sum, s) => sum + s.overallScore, 0) / supplierData.length 
    : 0;

  return (
    <Card ref={ref}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" />
            Ranking
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={periodDays.toString()} onValueChange={(v) => setPeriodDays(Number(v))}>
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
                  <Badge variant="outline" className="gap-1 cursor-help"><Info className="h-3 w-3" /></Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium mb-1">Pesos:</p>
                  <ul className="text-xs space-y-1">
                    <li>• SLA: {(WEIGHTS.sla * 100)}%</li>
                    <li>• Prazo: {(WEIGHTS.delivery * 100)}%</li>
                    <li>• Qualidade: {(WEIGHTS.quality * 100)}%</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {supplierData.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-warning/10 border border-yellow-500/20">
                <p className="text-xs text-muted-foreground">Melhor Fornecedor</p>
                <p className="font-semibold text-sm truncate">{topPerformer?.name}</p>
                <p className="text-lg font-bold text-warning">{topPerformer?.overallScore.toFixed(1)} pts</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">Média Geral</p>
                <p className="font-semibold text-sm">{supplierData.length} fornecedores</p>
                <p className={cn("text-lg font-bold", getScoreColor(avgScore))}>
                  {avgScore.toFixed(1)} pts
                </p>
              </div>
            </div>
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
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum fornecedor ativo encontrado
          </p>
        )}
      </CardContent>
    </Card>
  );
});
SupplierRankingPanel.displayName = 'SupplierRankingPanel';
