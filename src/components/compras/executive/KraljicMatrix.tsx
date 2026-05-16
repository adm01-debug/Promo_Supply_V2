import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Target, 
  TrendingDown, 
  ShieldAlert, 
  Zap, 
  ArrowRight,
  Info,
  Loader2
} from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CategoryItem {
  id: string;
  name: string;
  quadrant: 'strategic' | 'leverage' | 'bottleneck' | 'routine';
  spend: number;
  risk: 'low' | 'medium' | 'high' | 'critical';
}

const quadrants = {
  leverage: {
    title: 'Leverage',
    icon: TrendingDown,
    color: 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400',
    strategy: 'Maximizar lucro, explorar concorrência, leilões reversos.',
    description: 'Alto impacto financeiro, baixo risco de fornecimento.'
  },
  strategic: {
    title: 'Strategic',
    icon: Target,
    color: 'bg-blue-500/5 border-blue-500/20 text-blue-400',
    strategy: 'Parcerias de longo prazo, colaboração, inovação conjunta.',
    description: 'Alto impacto financeiro, alto risco de fornecimento.'
  },
  routine: {
    title: 'Routine',
    icon: Zap,
    color: 'bg-zinc-500/5 border-zinc-500/20 text-zinc-400',
    strategy: 'Simplificar processos, automação, catálogos e-procurement.',
    description: 'Baixo impacto financeiro, baixo risco de fornecimento.'
  },
  bottleneck: {
    title: 'Bottleneck',
    icon: ShieldAlert,
    color: 'bg-amber-500/5 border-amber-500/20 text-amber-400',
    strategy: 'Garantir volume, estoque de segurança, contratos fixos.',
    description: 'Baixo impacto financeiro, alto risco de fornecimento.'
  }
};

export const KraljicMatrix = () => {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const { data: realCategories, isLoading } = useQuery({
    queryKey: ['kraljic-matrix-data'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('category_strategies')
        .select('*, categorias(nome)');
      if (error) throw error;
      return data;
    }
  });

  const categories = useMemo((): CategoryItem[] => {
    if (!realCategories || realCategories.length === 0) {
      return [
        { id: '1', name: 'Matéria Prima A', quadrant: 'strategic', spend: 450000, risk: 'high' },
        { id: '2', name: 'Energia Elétrica', quadrant: 'bottleneck', spend: 85000, risk: 'critical' },
        { id: '3', name: 'Material de Escritório', quadrant: 'routine', spend: 12000, risk: 'low' },
        { id: '4', name: 'Hardware/TI', quadrant: 'leverage', spend: 280000, risk: 'medium' },
      ];
    }

    return realCategories.map(c => ({
      id: c.id,
      name: (c as any).categorias?.nome || 'Sem Categoria',
      quadrant: c.kraljic_quadrant as any,
      spend: Number(c.spend_impact || 0),
      risk: c.risk_level as any
    }));
  }, [realCategories]);

  return (
    <Card className="h-full border-white/5 bg-white/[0.03] backdrop-blur-2xl rounded-[2.5rem] overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-3 font-black text-white uppercase tracking-tight">
            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
              <Target className="h-5 w-5" />
            </div>
            Kraljic Strategy Matrix
          </CardTitle>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-violet-400" />}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-zinc-500" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-[#05020a] border-white/10 text-zinc-300">
                <p className="text-[10px] font-bold uppercase tracking-widest">Strategic mapping of categories based on financial impact (Spend) and supply risk.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 aspect-square max-h-[450px] relative mt-6 mb-12">
          <div className="absolute -left-10 top-1/2 -rotate-90 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 whitespace-nowrap">Supply Risk</div>
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 whitespace-nowrap">Financial Impact (Spend)</div>

          {(['leverage', 'strategic', 'routine', 'bottleneck'] as const).map((q) => {
            const config = quadrants[q];
            const categoriesInQuadrant = categories.filter(c => c.quadrant === q);
            
            return (
              <motion.div 
                key={q}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "p-4 border rounded-2xl flex flex-col gap-2 transition-all duration-500 group overflow-hidden relative shadow-sm",
                  config.color,
                  hoveredCategory && categoriesInQuadrant.some(c => c.id === hoveredCategory) ? "ring-2 ring-violet-500/50 shadow-[0_0_20px_rgba(139,92,246,0.2)]" : "opacity-80 hover:opacity-100"
                )}
              >
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-2">
                    <config.icon className="h-4 w-4" />
                    <span className="text-[11px] font-black uppercase tracking-widest">{config.title}</span>
                  </div>
                  <Badge className="text-[10px] font-black h-5 px-2 bg-white/10 text-white border-none rounded-lg">
                    {categoriesInQuadrant.length}
                  </Badge>
                </div>
                
                <div className="flex flex-wrap gap-1.5 mt-2 relative z-10">
                  {categoriesInQuadrant.map(c => (
                    <TooltipProvider key={c.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.div 
                            whileHover={{ scale: 1.05 }}
                            onMouseEnter={() => setHoveredCategory(c.id)}
                            onMouseLeave={() => setHoveredCategory(null)}
                            className={cn(
                              "h-7 px-3 rounded-xl bg-white/5 backdrop-blur-md flex items-center text-[10px] font-black uppercase tracking-tight cursor-help border border-white/5 hover:border-violet-500/30 transition-all truncate max-w-full shadow-lg",
                              hoveredCategory === c.id ? "bg-white/10 border-violet-500/50 text-white" : "text-zinc-300"
                            )}
                          >
                            {c.name}
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#05020a] border-white/10">
                          <div className="space-y-1.5 py-1">
                            <p className="font-black text-white text-[11px] uppercase tracking-widest">{c.name}</p>
                            <div className="space-y-0.5">
                               <p className="text-[10px] text-zinc-400 font-bold">Spend: <span className="text-zinc-100">R$ {(c.spend/1000).toFixed(0)}k</span></p>
                               <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">Risk Level: <span className={cn(
                                 c.risk === 'critical' ? 'text-rose-400' : 'text-amber-400'
                               )}>{c.risk}</span></p>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>

                <div className="mt-auto pt-3 border-t border-white/5 hidden group-hover:block animate-in fade-in slide-in-from-bottom-2 duration-500 relative z-10">
                  <p className="text-[9px] leading-relaxed font-black uppercase tracking-wider text-zinc-400 flex items-start gap-2">
                    <ArrowRight className="h-3 w-3 mt-0.5 shrink-0 text-violet-400" /> 
                    <span>STRATEGY: <span className="text-zinc-200 normal-case font-medium">{config.strategy}</span></span>
                  </p>
                </div>

                <config.icon className="absolute -bottom-6 -right-6 h-24 w-24 opacity-[0.03] rotate-12 transition-transform group-hover:rotate-0 group-hover:opacity-[0.08]" />
              </motion.div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-2 p-4 bg-white/[0.02] rounded-[2rem] border border-white/5">
          <p className="text-[10px] font-black uppercase text-violet-400 tracking-[0.2em] mb-1">AI Strategic Advisory</p>
          <p className="text-[11px] leading-relaxed text-zinc-400 font-medium">
            Analisando as {categories.length} categorias mapeadas. 
            {categories.some(c => c.quadrant === 'bottleneck' && c.risk === 'critical') ? 
              " Existem gargalos com risco crítico detectados na cadeia de suprimentos. Ative planos de contingência e busque diversificação imediata." : 
              " Portfólio equilibrado. Recomendamos focar em oportunidades de alavancagem para consolidar volumes e maximizar economias contratuais."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
