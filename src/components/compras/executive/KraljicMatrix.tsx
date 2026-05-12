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
    title: 'Alavancagem (Leverage)',
    icon: TrendingDown,
    color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
    strategy: 'Maximizar lucro, explorar concorrência, leilões reversos.',
    description: 'Alto impacto financeiro, baixo risco de fornecimento.'
  },
  strategic: {
    title: 'Estratégico (Strategic)',
    icon: Target,
    color: 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400',
    strategy: 'Parcerias de longo prazo, colaboração, inovação conjunta.',
    description: 'Alto impacto financeiro, alto risco de fornecimento.'
  },
  routine: {
    title: 'Não Crítico (Routine)',
    icon: Zap,
    color: 'bg-slate-500/10 border-slate-500/30 text-slate-700 dark:text-slate-400',
    strategy: 'Simplificar processos, automação, catálogos e-procurement.',
    description: 'Baixo impacto financeiro, baixo risco de fornecimento.'
  },
  bottleneck: {
    title: 'Gargalo (Bottleneck)',
    icon: ShieldAlert,
    color: 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400',
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
      quadrant: c.quadrant as any,
      spend: Number(c.annual_spend || 0),
      risk: c.supply_risk as any
    }));
  }, [realCategories]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Matriz de Kraljic
          </CardTitle>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Mapeamento estratégico de categorias com base no impacto financeiro (Spend) e risco de fornecimento.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 aspect-square max-h-[400px] relative mt-4">
          <div className="absolute -left-8 top-1/2 -rotate-90 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Risco de Fornecimento</div>
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Impacto Financeiro (Spend)</div>

          {(['leverage', 'strategic', 'routine', 'bottleneck'] as const).map((q) => {
            const config = quadrants[q];
            const categoriesInQuadrant = categories.filter(c => c.quadrant === q);
            
            return (
              <motion.div 
                key={q}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "p-3 border rounded-xl flex flex-col gap-2 transition-all duration-300 group overflow-hidden relative shadow-sm hover:shadow-md",
                  config.color,
                  hoveredCategory && categoriesInQuadrant.some(c => c.id === hoveredCategory) ? "ring-2 ring-primary/50 shadow-lg" : "opacity-90 hover:opacity-100"
                )}
              >
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-1.5">
                    <config.icon className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-tight">{config.title.split(' ')[0]}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] h-4 px-1 bg-background/50 border-none font-mono">
                    {categoriesInQuadrant.length}
                  </Badge>
                </div>
                
                <div className="flex flex-wrap gap-1 mt-1 relative z-10">
                  {categoriesInQuadrant.map(c => (
                    <TooltipProvider key={c.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.div 
                            whileHover={{ scale: 1.05 }}
                            onMouseEnter={() => setHoveredCategory(c.id)}
                            onMouseLeave={() => setHoveredCategory(null)}
                            className={cn(
                              "h-6 px-2 rounded-md bg-background/80 flex items-center text-[10px] font-medium cursor-help border border-transparent hover:border-primary/30 transition-colors truncate max-w-full shadow-sm",
                              hoveredCategory === c.id ? "bg-background border-primary shadow-sm" : ""
                            )}
                          >
                            {c.name}
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1 py-1">
                            <p className="font-bold">{c.name}</p>
                            <p className="text-xs">Spend: R$ {(c.spend/1000).toFixed(0)}k</p>
                            <p className="text-xs capitalize">Risco: {c.risk}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>

                <div className="mt-auto pt-2 border-t border-current/10 hidden group-hover:block animate-in fade-in slide-in-from-bottom-1 duration-300 relative z-10">
                  <p className="text-[9px] leading-tight font-semibold italic flex items-center gap-1">
                    <ArrowRight className="h-2 w-2" /> Estratégia: {config.strategy}
                  </p>
                </div>

                <config.icon className="absolute -bottom-4 -right-4 h-20 w-20 opacity-5 rotate-12 transition-transform group-hover:rotate-0" />
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col gap-2 p-3 bg-muted/40 rounded-lg border border-border/50">
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1">Recomendação da IA</p>
          <p className="text-[11px] leading-snug text-foreground/80">
            Analisando as {categories.length} categorias mapeadas. 
            {categories.some(c => c.quadrant === 'bottleneck' && c.risk === 'critical') ? 
              " Existem gargalos com risco crítico detectados. Ative planos de contingência." : 
              " Portfólio equilibrado. Foque em oportunidades de alavancagem para aumentar o saving."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
