import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Sparkles, 
  TrendingUp, 
  Target, 
  Zap, 
  ArrowRight,
  Brain,
  ShieldCheck,
  Package,
  Clock,
  ChevronRight,
  Calculator
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatCurrency } from './executive/executiveDashboardData';

export const BulkPlanningConsole = () => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(['1', '2', '3']));
  const [activePlan, setActivePlan] = useState<string | null>(null);

  const mockPlanningData = [
    { 
      id: '1', 
      category: 'Brindes Premium', 
      items: ['Mochila Executiva', 'Garrafa Térmica'],
      totalQty: 1200,
      avgMarketPrice: 85.50,
      targetPrice: 72.00,
      suppliers: 5,
      status: 'Aguardando Cotação',
      risk: 'Médio'
    },
    { 
      id: '2', 
      category: 'Insumos TI', 
      items: ['Monitor 24"', 'Teclado Mecânico'],
      totalQty: 50,
      avgMarketPrice: 1250.00,
      targetPrice: 1100.00,
      suppliers: 3,
      status: 'Em Análise IA',
      risk: 'Baixo'
    },
    { 
      id: '3', 
      category: 'Logística', 
      items: ['Caixas de Papelão', 'Fita Adesiva'],
      totalQty: 5000,
      avgMarketPrice: 2.15,
      targetPrice: 1.85,
      suppliers: 8,
      status: 'Pronto para Disparo',
      risk: 'Crítico'
    }
  ];

  const toggleItem = (id: string) => {
    const next = new Set(selectedItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItems(next);
  };

  const totalSelectedValue = useMemo(() => {
    return mockPlanningData
      .filter(item => selectedItems.has(item.id))
      .reduce((acc, item) => acc + (item.avgMarketPrice * item.totalQty), 0);
  }, [selectedItems]);

  const projectedSavings = useMemo(() => {
    return mockPlanningData
      .filter(item => selectedItems.has(item.id))
      .reduce((acc, item) => acc + ((item.avgMarketPrice - item.targetPrice) * item.totalQty), 0);
  }, [selectedItems]);

  return (
    <Card className="border-white/5 bg-white/[0.03] backdrop-blur-2xl rounded-[2.5rem] overflow-hidden group">
      <CardHeader className="pb-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-400">
              <Calculator className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg font-black text-white uppercase tracking-tight">Planning Console 10/10</CardTitle>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Planejamento Estratégico em Lote</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Valor Planejado</p>
              <p className="text-sm font-black text-white">{formatCurrency(totalSelectedValue)}</p>
            </div>
            <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-[10px] font-black uppercase tracking-widest h-10 px-6 rounded-xl shadow-lg shadow-violet-500/20 border-none">
              Disparar Cotações ({selectedItems.size})
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-white/5 h-[400px]">
          {/* Lado Esquerdo: Lista de Lotes */}
          <div className="col-span-1 flex flex-col">
            <div className="p-4 bg-white/[0.01] border-b border-white/5">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Lotes de Aquisição Ativos</span>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {mockPlanningData.map((plan) => (
                  <motion.div
                    key={plan.id}
                    onClick={() => toggleItem(plan.id)}
                    className={cn(
                      "p-4 rounded-2xl cursor-pointer transition-all border border-transparent",
                      selectedItems.has(plan.id) 
                        ? "bg-violet-500/10 border-violet-500/20" 
                        : "hover:bg-white/5"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-sm text-white">{plan.category}</h4>
                      <Badge className={cn(
                        "text-[9px] font-black uppercase tracking-tighter",
                        plan.risk === 'Crítico' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                      )}>
                        {plan.risk}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">{plan.items.length} ITENS • {plan.totalQty} UN</span>
                      <ChevronRight className="h-4 w-4 text-zinc-600" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Lado Direito: Inteligência e Resumo */}
          <div className="col-span-2 flex flex-col p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Savings Projetado</p>
                    <p className="text-2xl font-black text-emerald-400 tracking-tighter">{formatCurrency(projectedSavings)}</p>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4 text-violet-400" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">IA Strategic Insight</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed italic">
                    "Identificamos que consolidar os pedidos de {selectedItems.size} categorias pode atrair fornecedores de Tier 1, aumentando a economia em até 12.5%."
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Compliance de Lote</p>
                    <p className="text-2xl font-black text-blue-400 tracking-tighter">98.2%</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                   <div className="flex justify-between text-[10px] font-black text-zinc-500 uppercase">
                      <span>Metas de Saving</span>
                      <span>85% alcançado</span>
                   </div>
                   <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '85%' }}
                        className="h-full bg-gradient-to-r from-violet-500 to-emerald-500"
                      />
                   </div>
                </div>
              </div>
            </div>

            <div className="mt-auto">
              <Card className="bg-violet-500/5 border-violet-500/10 p-6 rounded-[1.5rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
                  <Sparkles className="h-16 w-16 text-violet-400" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h5 className="font-black text-xs text-white uppercase tracking-widest">Pronto para execução massiva</h5>
                    <p className="text-[10px] text-zinc-500 font-medium">Os disparos serão realizados via IA para todos os fornecedores homologados.</p>
                  </div>
                  <EliteButton variant="outline" className="h-10 text-[9px] font-black uppercase tracking-[0.2em] border-white/10 text-zinc-300">
                    REVISAR FILAS
                  </EliteButton>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
