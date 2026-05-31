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
import { cn, formatCurrency } from '@/lib/utils';


export const BulkPlanningConsole = () => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(['1', '2', '3']));
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [freightAnalysis, setFreightAnalysis] = useState<{ [key: string]: { cost: number, optimization: number } }>({
    '1': { cost: 450, optimization: 12 },
    '2': { cost: 1200, optimization: 8 },
    '3': { cost: 85, optimization: 15 }
  });

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
            <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-[10px] font-black uppercase tracking-[0.2em] h-11 px-8 rounded-2xl shadow-xl shadow-violet-500/20 border-none group/btn relative overflow-hidden">
              <span className="relative z-10 flex items-center gap-2">
                Disparar Cotações ({selectedItems.size})
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                animate={{ left: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
              />
            </Button>

          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-12 divide-x divide-white/5 h-[450px]">
          {/* Lado Esquerdo: Lista de Lotes */}
          <div className="md:col-span-3 flex flex-col">
            <div className="p-4 bg-white/[0.01] border-b border-white/5">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Lotes de Aquisição Ativos</span>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {mockPlanningData.map((plan, idx) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => toggleItem(plan.id)}
                    className={cn(
                      "p-4 rounded-2xl cursor-pointer transition-all border border-transparent relative overflow-hidden",
                      selectedItems.has(plan.id) 
                        ? "bg-violet-500/10 border-violet-500/20 shadow-[inset_0_0_20px_rgba(139,92,246,0.05)]" 
                        : "hover:bg-white/5"
                    )}
                  >
                    {selectedItems.has(plan.id) && (
                      <motion.div 
                        layoutId="active-indicator"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500"
                      />
                    )}

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
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">{plan.items.length} ITENS • {plan.totalQty} UN</span>
                      <div className="flex items-center gap-1.5">
                        <div className="flex flex-col items-end">
                          <span className="text-[8px] font-black text-emerald-400 uppercase">-{freightAnalysis[plan.id]?.optimization}% FRETE</span>
                          <span className="text-[9px] font-bold text-zinc-500">R$ {freightAnalysis[plan.id]?.cost}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-zinc-600" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Lado Direito: Inteligência e Resumo */}
          <div className="md:col-span-9 flex flex-col p-8 bg-black/20">
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
                <div className="p-5 rounded-3xl bg-gradient-to-br from-violet-500/10 to-transparent border border-white/5 relative group/insight">
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover/insight:opacity-100 transition-opacity">
                    <Sparkles className="h-4 h-4 text-violet-400 animate-pulse" />
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center">
                      <Brain className="h-4 w-4 text-violet-400" />
                    </div>
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">IA Strategic Insight</span>
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-relaxed italic font-medium">
                    "Detectamos uma correlação de 94% entre os fornecedores de {selectedItems.size} categorias. Otimização de frete estimada em <span className="text-emerald-400 font-black">R$ 4.2k</span>."
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

            <div className="mt-auto grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-violet-500/5 border-violet-500/10 p-6 rounded-[1.5rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
                  <Sparkles className="h-16 w-16 text-violet-400" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h5 className="font-black text-xs text-white uppercase tracking-widest">IA Decision Support</h5>
                    <p className="text-[10px] text-zinc-500 font-medium">Validando propostas vs. benchmark de mercado.</p>
                  </div>
                  <Button variant="outline" className="h-10 text-[9px] font-black uppercase tracking-[0.2em] border-white/10 text-zinc-300">
                    VALIDAR
                  </Button>
                </div>
              </Card>

              <Card className="bg-emerald-500/5 border-emerald-500/10 p-6 rounded-[1.5rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
                  <TrendingUp className="h-16 w-16 text-emerald-400" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h5 className="font-black text-xs text-white uppercase tracking-widest">Execução Massiva</h5>
                    <p className="text-[10px] text-zinc-500 font-medium">Os disparos serão realizados via IA para todos os fornecedores.</p>
                  </div>
                  <Button variant="outline" className="h-10 text-[9px] font-black uppercase tracking-[0.2em] border-white/10 text-zinc-300">
                    REVISAR FILA
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
