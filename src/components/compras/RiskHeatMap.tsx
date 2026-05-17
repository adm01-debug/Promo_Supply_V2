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
import { motion, AnimatePresence } from "framer-motion";

interface RiskData {
  supplierId: string;
  supplierName: string;
  category: string;
  risks: {
    financial: number;
    operational: number;
    quality: number;
    delivery: number;
    concentration: number;
    geopolitical: number;
  };
  overallRisk: number;
  trend: 'improving' | 'worsening' | 'stable';
  volume: number;
}

const riskCategories = [
  { key: 'financial', label: 'Finance', icon: DollarSign, description: 'Financial health & stability' },
  { key: 'operational', label: 'Ops', icon: Zap, description: 'Operational capacity & processes' },
  { key: 'quality', label: 'Quality', icon: Shield, description: 'Compliance & defect history' },
  { key: 'delivery', label: 'Logistics', icon: Clock, description: 'SLA & On-time performance' },
  { key: 'concentration', label: 'Reliance', icon: Package, description: 'Supplier dependency ratio' },
  { key: 'geopolitical', label: 'Geo-Risk', icon: MapPin, description: 'Regional & international risk' }
];

const getRiskColor = (value: number) => {
  if (value <= 25) return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
  if (value <= 50) return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' };
  if (value <= 75) return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' };
  return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' };
};

const getRiskLabel = (value: number) => {
  if (value <= 25) return 'LOW';
  if (value <= 50) return 'MED';
  if (value <= 75) return 'HIGH';
  return 'CRIT';
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
    const totalSpend = pedidos.reduce((sum, p) => sum + (Number(p.valor_total) || 0), 1);
    return fornecedores.filter(f => f.status === 'ativo').map(f => {
      const supplierPeds = pedidos.filter(p => p.fornecedor_id === f.id);
      const supplierSpend = supplierPeds.reduce((sum, p) => sum + (Number(p.valor_total) || 0), 0);
      const spendPercent = Math.round((supplierSpend / totalSpend) * 100);
      const delivered = supplierPeds.filter(p => p.status === 'entregue');
      const onTime = delivered.filter(p => p.data_entrega && p.data_previsao && p.data_entrega <= p.data_previsao).length;
      const onTimeRate = delivered.length > 0 ? (onTime / delivered.length) * 100 : 90;
      const deliveryRisk = Math.round(100 - onTimeRate);
      const qualityRisk = Math.round(100 - (Number(f.avaliacao || 4.5) * 20));
      const concentrationRisk = Math.min(100, spendPercent * 3);
      const financialRisk = Math.round(Math.max(10, 40 - (Number(f.avaliacao || 4) * 5)));
      const operationalRisk = Math.round(Math.max(15, deliveryRisk * 0.8 + qualityRisk * 0.2));
      const geopoliticalRisk = f.categorias?.nome === 'Eletrônicos' || f.categorias?.nome === 'Tecnologia' ? 60 : 15;
      const overallRisk = Math.round(financialRisk * 0.15 + operationalRisk * 0.25 + qualityRisk * 0.2 + deliveryRisk * 0.2 + concentrationRisk * 0.1 + geopoliticalRisk * 0.1);
      return {
        supplierId: f.id,
        supplierName: f.razao_social,
        category: (f as any).categorias?.nome || 'General',
        risks: { financial: financialRisk, operational: operationalRisk, quality: qualityRisk, delivery: deliveryRisk, concentration: concentrationRisk, geopolitical: geopoliticalRisk },
        overallRisk,
        trend: overallRisk > 40 ? 'worsening' : overallRisk < 20 ? 'improving' : 'stable',
        volume: spendPercent
      } as RiskData;
    });
  }, [fornecedores, pedidos]);

  if (loadingForn || loadingPed) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 bg-white/5 rounded-2xl" />)}
        </div>
        <Skeleton className="h-[500px] w-full bg-white/5 rounded-[2.5rem]" />
      </div>
    );
  }

  const sortedSuppliers = [...riskData].sort((a, b) => b.overallRisk - a.overallRisk);

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Low Risk', count: riskData.filter(s => s.overallRisk <= 25).length, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Moderate', count: riskData.filter(s => s.overallRisk > 25 && s.overallRisk <= 50).length, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'High Risk', count: riskData.filter(s => s.overallRisk > 50 && s.overallRisk <= 75).length, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { label: 'Critical', count: riskData.filter(s => s.overallRisk > 75).length, color: 'text-rose-400', bg: 'bg-rose-500/10' }
        ].map((item, i) => (
          <Card key={i} className={cn("p-6 border-white/5 backdrop-blur-3xl rounded-[2rem] flex flex-col items-center", item.bg)}>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">{item.label}</span>
            <p className={cn("text-3xl font-black", item.color)}>{item.count}</p>
          </Card>
        ))}
      </div>

      <Card className="p-8 bg-white/[0.02] border-white/5 rounded-[2.5rem] backdrop-blur-3xl overflow-hidden shadow-2xl">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 mb-8 flex items-center gap-3">
          <Zap className="w-4 h-4 text-amber-400" />
          Intelligence Risk Matrix
        </h3>

        <div className="overflow-x-auto">
          <TooltipProvider>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left py-6 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Partner Entity</th>
                  {riskCategories.map(cat => (
                    <th key={cat.key} className="p-4 text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex flex-col items-center gap-2 cursor-help opacity-60 hover:opacity-100 transition-opacity">
                            <cat.icon className="w-4 h-4 text-zinc-400" />
                            <span className="text-[9px] font-black uppercase tracking-widest">{cat.label}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#0a0a0f] border-white/10 p-3 rounded-xl">
                          <p className="text-xs font-bold text-white uppercase tracking-widest">{cat.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </th>
                  ))}
                  <th className="p-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Composite</th>
                  <th className="p-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Network Vol</th>
                </tr>
              </thead>
              <tbody>
                {sortedSuppliers.map(supplier => {
                  const overallColor = getRiskColor(supplier.overallRisk);
                  return (
                    <tr key={supplier.supplierId} className="border-t border-white/5 group hover:bg-white/[0.01] transition-colors">
                      <td className="py-6 px-4">
                        <div className="flex items-center gap-3">
                          <span className="font-black text-xs text-white uppercase tracking-tight truncate max-w-[150px]">
                            {supplier.supplierName}
                          </span>
                          {supplier.trend === 'improving' && <TrendingDown className="w-3 h-3 text-emerald-400" />}
                          {supplier.trend === 'worsening' && <TrendingUp className="w-3 h-3 text-rose-400" />}
                        </div>
                        <Badge variant="outline" className="text-[8px] mt-2 font-black uppercase tracking-[0.2em] border-zinc-800 text-zinc-500">
                          {supplier.category}
                        </Badge>
                      </td>
                      {riskCategories.map(cat => {
                        const value = supplier.risks[cat.key as keyof typeof supplier.risks];
                        const color = getRiskColor(value);
                        return (
                          <td key={cat.key} className="p-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <motion.div
                                  whileHover={{ scale: 1.1 }}
                                  className={cn(
                                    "w-12 h-12 mx-auto rounded-xl flex items-center justify-center transition-all cursor-crosshair border border-transparent",
                                    color.bg,
                                    hoveredCell?.supplier === supplier.supplierId && hoveredCell?.category === cat.key && "ring-1 ring-white/20 border-white/10"
                                  )}
                                  onMouseEnter={() => setHoveredCell({ supplier: supplier.supplierId, category: cat.key })}
                                  onMouseLeave={() => setHoveredCell(null)}
                                >
                                  <span className={cn("text-xs font-black", color.text)}>{value}</span>
                                </motion.div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-[#0a0a0f] border-white/10 p-3 rounded-xl shadow-2xl">
                                <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">{cat.label}</p>
                                <p className={cn("text-xs font-black", color.text)}>EXPOSURE: {getRiskLabel(value)} ({value})</p>
                              </TooltipContent>
                            </Tooltip>
                          </td>
                        );
                      })}
                      <td className="p-2">
                        <div className={cn("w-16 h-12 mx-auto rounded-xl flex flex-col items-center justify-center border", overallColor.bg, overallColor.border)}>
                          <span className={cn("text-lg font-black", overallColor.text)}>{supplier.overallRisk}</span>
                          <span className={cn("text-[8px] font-black tracking-widest", overallColor.text)}>{getRiskLabel(supplier.overallRisk)}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-[10px] font-black text-white">{supplier.volume}%</span>
                          <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${supplier.volume}%` }} className="h-full bg-emerald-500" />
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
      </Card>

      <Card className="p-8 border-rose-500/20 bg-rose-500/[0.02] rounded-[2.5rem] backdrop-blur-3xl shadow-2xl">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-rose-400 mb-8 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4" />
          Critical Exposure Alerts
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {sortedSuppliers.filter(s => s.overallRisk > 50).map((supplier, i) => (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} key={supplier.supplierId} className="flex items-start gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 group hover:border-rose-500/20 transition-all">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", getRiskColor(supplier.overallRisk).bg)}>
                  <AlertTriangle className={cn("w-5 h-5", getRiskColor(supplier.overallRisk).text)} />
                </div>
                <div className="flex-1">
                  <p className="font-black text-white uppercase text-xs tracking-tight group-hover:text-rose-400 transition-colors">{supplier.supplierName}</p>
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1">
                    {Object.entries(supplier.risks).filter(([_, v]) => v > 50).map(([k]) => riskCategories.find(c => c.key === k)?.label).join(' • ')} Critical
                  </p>
                </div>
                <Badge variant="outline" className={cn("text-[9px] font-black border-none px-3 py-1", getRiskColor(supplier.overallRisk).bg, getRiskColor(supplier.overallRisk).text)}>
                  RISK {supplier.overallRisk}
                </Badge>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
};