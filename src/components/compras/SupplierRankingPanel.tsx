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
import { motion, AnimatePresence } from "framer-motion";

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
    case 0: return <Trophy className="h-5 w-5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]" />;
    case 1: return <Medal className="h-5 w-5 text-zinc-400" />;
    case 2: return <Medal className="h-5 w-5 text-orange-600" />;
    default: return <span className="text-[10px] font-black text-zinc-600 w-5 text-center">{position + 1}</span>;
  }
};

const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up': return <TrendingUp className="h-4 w-4 text-emerald-400" />;
    case 'down': return <TrendingDown className="h-4 w-4 text-rose-400" />;
    default: return <span className="text-[10px] text-zinc-600 font-black">—</span>;
  }
};

const getScoreColor = (score: number) => {
  if (score >= 90) return 'text-emerald-400';
  if (score >= 80) return 'text-sky-400';
  if (score >= 70) return 'text-amber-400';
  return 'text-rose-400';
};

interface SupplierRankItemProps {
  supplier: SupplierScore;
  position: number;
  isExpanded: boolean;
  onToggle: () => void;
}

const SupplierRankItem = ({ supplier, position, isExpanded, onToggle }: SupplierRankItemProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-5 rounded-2xl border transition-all cursor-pointer group",
        position === 0 && "border-amber-500/20 bg-amber-500/[0.02]",
        position === 1 && "border-white/10 bg-white/[0.01]",
        position === 2 && "border-orange-600/20 bg-orange-600/[0.01]",
        position > 2 && "border-white/5 bg-transparent",
        isExpanded && "border-emerald-500/30 bg-white/[0.03]"
      )}
      onClick={onToggle}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.02] border border-white/5">{getRankIcon(position)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className="font-black text-xs text-white uppercase tracking-tight group-hover:text-emerald-400 transition-colors">{supplier.name}</span>
            {getTrendIcon(supplier.trend)}
          </div>
          <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">{supplier.totalOrders} Global Orders</span>
        </div>
        <div className="text-right">
          <span className={cn("text-2xl font-black", getScoreColor(supplier.overallScore))}>
            {supplier.overallScore.toFixed(1)}
          </span>
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Points</p>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-6 pt-6 border-t border-white/5 space-y-4 overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-6">
              {[
                { icon: CheckCircle, label: 'SLA', weight: WEIGHTS.sla, score: supplier.slaScore, color: 'text-sky-400' },
                { icon: Clock, label: 'Delivery', weight: WEIGHTS.delivery, score: supplier.deliveryScore, color: 'text-amber-400' },
                { icon: Star, label: 'Quality', weight: WEIGHTS.quality, score: supplier.qualityScore, color: 'text-emerald-400' },
              ].map(({ icon: Icon, label, weight, score, color }) => (
                <div key={label} className="space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    <div className="flex items-center gap-1.5">
                      <Icon className={cn("h-3 w-3", color)} />
                      <span>{label}</span>
                    </div>
                    <span>{(weight * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={score} className="h-1 bg-white/5 flex-1" />
                    <span className={cn("text-[10px] font-black", getScoreColor(score))}>
                      {score.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
      const onTime = delivered.filter(p => p.data_entrega && p.data_previsao && p.data_entrega <= p.data_previsao).length;
      const deliveryScore = delivered.length > 0 ? (onTime / delivered.length) * 100 : 80;
      const qualityScore = Number(f.avaliacao || 0) * 20;
      const slaScore = totalOrders > 0 ? Math.min(100, deliveryScore + 5) : 75;
      const overallScore = slaScore * WEIGHTS.sla + deliveryScore * WEIGHTS.delivery + qualityScore * WEIGHTS.quality;
      const trend: 'up' | 'down' | 'stable' = deliveryScore >= 90 ? 'up' : deliveryScore < 70 ? 'down' : 'stable';
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
      <Card ref={ref} className="bg-white/[0.02] border-white/5 rounded-[2.5rem]">
        <CardHeader><Skeleton className="h-6 w-32 bg-white/5" /></CardHeader>
        <CardContent className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-20 bg-white/5 rounded-2xl" />)}
        </CardContent>
      </Card>
    );
  }

  const topPerformer = supplierData[0];
  const avgScore = supplierData.length > 0 ? supplierData.reduce((sum, s) => sum + s.overallScore, 0) / supplierData.length : 0;

  return (
    <Card ref={ref} className="bg-white/[0.02] border-white/5 rounded-[2.5rem] backdrop-blur-3xl overflow-hidden shadow-2xl">
      <CardHeader className="pb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-3">
            <Trophy className="h-4 w-4 text-amber-400" />
            Performance Rankings
          </CardTitle>
          <div className="flex items-center gap-3">
            <Select value={periodDays.toString()} onValueChange={(v) => setPeriodDays(Number(v))}>
              <SelectTrigger className="h-9 w-[150px] bg-white/[0.03] border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-300">
                <Calendar className="h-3 w-3 mr-2 text-emerald-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a0f] border-white/10 rounded-xl">
                <SelectItem value="7" className="text-xs font-bold">7 Days</SelectItem>
                <SelectItem value="30" className="text-xs font-bold">30 Days</SelectItem>
                <SelectItem value="90" className="text-xs font-bold">90 Days</SelectItem>
              </SelectContent>
            </Select>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.03] border border-white/5 text-zinc-500 cursor-help hover:text-white transition-colors">
                    <Info className="h-4 w-4" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-[#0a0a0f] border-white/10 p-4 rounded-2xl shadow-2xl">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3">Ranking Weights</p>
                  <ul className="text-[10px] font-black uppercase tracking-widest space-y-2">
                    <li className="flex justify-between gap-6"><span>SLA COMPLIANCE</span> <span className="text-sky-400">{(WEIGHTS.sla * 100)}%</span></li>
                    <li className="flex justify-between gap-6"><span>LOGISTICS PRECISION</span> <span className="text-amber-400">{(WEIGHTS.delivery * 100)}%</span></li>
                    <li className="flex justify-between gap-6"><span>PRODUCT QUALITY</span> <span className="text-emerald-400">{(WEIGHTS.quality * 100)}%</span></li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {supplierData.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl bg-amber-500/[0.05] border border-amber-500/20 text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-500/60 mb-2">Alpha Partner</p>
                <p className="font-black text-xs text-white uppercase tracking-tight truncate mb-2">{topPerformer?.name}</p>
                <p className="text-3xl font-black text-amber-400">{topPerformer?.overallScore.toFixed(1)} <span className="text-xs">PTS</span></p>
              </div>
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Network Average</p>
                <p className="font-black text-xs text-zinc-400 uppercase tracking-tight mb-2">{supplierData.length} Partners</p>
                <p className={cn("text-3xl font-black", getScoreColor(avgScore))}>{avgScore.toFixed(1)} <span className="text-xs">PTS</span></p>
              </div>
            </div>
            <div className="space-y-3">
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
          <div className="text-center py-16 text-zinc-600 font-black uppercase tracking-[0.2em] text-xs">
            No active partners in network
          </div>
        )}
      </CardContent>
    </Card>
  );
});
SupplierRankingPanel.displayName = 'SupplierRankingPanel';