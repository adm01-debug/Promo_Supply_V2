import { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Lightbulb, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  ArrowRight,
  Zap,
  ShieldCheck,
  Target
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useDashboardKPIs } from '@/hooks/useDashboardKPIs';

interface Insight {
  id: string;
  type: 'opportunity' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  impact: string;
  action: string;
  icon: any;
  color: string;
}

export const DashboardInsights = () => {
  const { kpis, loading } = useDashboardKPIs();
  const [activeTab, setActiveTab] = useState<'all' | 'opportunity' | 'warning'>('all');

  const insights = useMemo<Insight[]>(() => {
    if (loading) return [];

    const result: Insight[] = [];

    // Opportunity: Savings
    if (kpis.economiaPercentual < 15) {
      const potentialExtraSaving = Math.round(kpis.volumeMes * 0.03); // Assuming we can save 3% more
      result.push({
        id: '1',
        type: 'opportunity',
        title: 'Otimização de Negociação',
        description: `Seu saving atual de ${kpis.economiaPercentual}% está abaixo do benchmark de 18% para sua categoria principal.`,
        impact: `Potencial de +R$ ${potentialExtraSaving.toLocaleString('pt-BR')} em economia mensal adicional.`,
        action: 'Revisar cotações em aberto',
        icon: Target,
        color: 'blue'
      });
    }

    // Warning: SLA
    if (kpis.taxaSlaReal < 85) {
      const slaTrend = kpis.comparisons.sla.trend;
      result.push({
        id: '2',
        type: 'warning',
        title: 'Risco de Lead Time (SLA)',
        description: `O cumprimento do SLA está em ${kpis.taxaSlaReal}%. ${slaTrend < 0 ? `Houve uma queda de ${Math.abs(Math.round(slaTrend))}%` : 'A tendência é de estabilidade'}, mas ainda abaixo da meta.`,
        impact: 'Atrasos nas entregas podem impactar a operação.',
        action: 'Analisar gargalos no SLA',
        icon: AlertTriangle,
        color: 'orange'
      });
    }

    // Info: Volume
    const volumeTrend = Math.round(kpis.comparisons.volume.trend);
    if (volumeTrend > 5) {
      result.push({
        id: '3',
        type: 'info',
        title: 'Aumento de Demanda',
        description: `O volume de compras deste mês é ${volumeTrend}% superior ao período anterior.`,
        impact: 'O aumento de volume permite negociar melhores condições com fornecedores estratégicos.',
        action: 'Ver pedidos volumosos',
        icon: TrendingUp,
        color: 'purple'
      });
    } else if (volumeTrend < -5) {
      result.push({
        id: '3',
        type: 'info',
        title: 'Queda na Demanda',
        description: `O volume de compras deste mês é ${Math.abs(volumeTrend)}% inferior ao período anterior.`,
        impact: 'Atenção aos estoques mínimos e contratos de fornecimento fixo.',
        action: 'Analisar tendência de volume',
        icon: TrendingDown,
        color: 'blue'
      });
    }


    // Success: Compliance
    result.push({
      id: '4',
      type: 'success',
      title: 'Compliance de Fornecedores',
      description: '98% dos fornecedores ativos estão com documentação em dia.',
      impact: 'Redução de risco jurídico e operacional.',
      action: 'Ver relatório de compliance',
      icon: ShieldCheck,
      color: 'emerald'
    });

    return result;
  }, [kpis, loading]);

  const filteredInsights = insights.filter(i => activeTab === 'all' || i.type === activeTab);

  if (loading) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          <h2 className="text-lg font-bold text-foreground">Insights Inteligentes</h2>
        </div>
        <div className="flex bg-muted p-1 rounded-lg">
          {(['all', 'opportunity', 'warning'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                activeTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === 'all' ? 'Todos' : tab === 'opportunity' ? 'Oportunidades' : 'Riscos'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredInsights.map((insight, idx) => (
            <motion.div
              key={insight.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, delay: idx * 0.05 }}
            >
              <Card className={cn(
                "p-4 border-l-4 h-full flex flex-col justify-between group cursor-pointer hover:shadow-md transition-all",
                insight.color === 'blue' && "border-l-blue-500 bg-blue-500/5",
                insight.color === 'orange' && "border-l-orange-500 bg-orange-500/5",
                insight.color === 'purple' && "border-l-purple-500 bg-purple-500/5",
                insight.color === 'emerald' && "border-l-emerald-500 bg-emerald-500/5"
              )}>
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div className={cn(
                      "p-2 rounded-lg",
                      insight.color === 'blue' && "bg-blue-500/10 text-blue-600",
                      insight.color === 'orange' && "bg-orange-500/10 text-orange-600",
                      insight.color === 'purple' && "bg-purple-500/10 text-purple-600",
                      insight.color === 'emerald' && "bg-emerald-500/10 text-emerald-600"
                    )}>
                      <insight.icon className="w-4 h-4" />
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                      Impacto {idx === 0 ? 'Alto' : 'Médio'}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-sm mb-1">{insight.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                    {insight.description}
                  </p>
                </div>
                
                <div className="mt-auto space-y-3">
                  <div className="p-2 rounded bg-background/50 border border-border/50">
                    <p className="text-[10px] font-semibold flex items-center gap-1">
                      <Zap className="w-3 h-3 text-warning fill-warning" />
                      {insight.impact}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-xs font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    {insight.action}
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
