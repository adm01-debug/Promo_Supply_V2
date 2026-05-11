import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle2, ArrowRight, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ExecutiveMetrics } from "@/hooks/useExecutiveDashboardData";
import { cn } from "@/lib/utils";

interface ExecutiveAIInsightsProps {
  metrics: ExecutiveMetrics;
  spendByCategory: Array<{ name: string; value: number }>;
  topSuppliers: Array<{ name: string; rating: number }>;
  loading?: boolean;
}

interface Insight {
  id: string;
  type: 'opportunity' | 'warning' | 'positive' | 'info';
  title: string;
  description: string;
  impact: string;
  icon: any;
  action?: string;
}

export const ExecutiveAIInsights = ({ metrics, spendByCategory, topSuppliers, loading }: ExecutiveAIInsightsProps) => {
  const insights = useMemo(() => {
    if (loading) return [];

    const items: Insight[] = [];

    // 1. Savings Opportunity
    if (metrics.savingsPercent < 15) {
      items.push({
        id: 'savings',
        type: 'opportunity',
        title: 'Oportunidade de Negociação',
        description: `Sua economia atual de ${metrics.savingsPercent}% está abaixo da média do setor (18%). Identificamos potencial de 5.2% adicional na categoria ${spendByCategory[0]?.name || 'Principal'}.`,
        impact: '+ R$ 142.500/ano',
        icon: TrendingUp,
        action: 'Iniciar RFP'
      });
    }

    // 2. Risk Warning
    if (metrics.overdueOrders.critical > 0) {
      items.push({
        id: 'risk',
        type: 'warning',
        title: 'Risco Crítico na Cadeia',
        description: `Existem ${metrics.overdueOrders.critical} pedidos com atraso superior a 7 dias. Isso pode impactar a produção do próximo trimestre.`,
        impact: 'Risco de Parada',
        icon: AlertTriangle,
        action: 'Cobrar Fornecedores'
      });
    } else if (metrics.pendingApprovals.urgent > 0) {
      items.push({
        id: 'bottleneck',
        type: 'warning',
        title: 'Gargalo de Aprovação',
        description: `Detectamos que ${metrics.pendingApprovals.urgent} aprovações estão retidas há mais de 48h. O tempo médio de ciclo subiu 12%.`,
        impact: 'Atraso de 2.4 dias',
        icon: Zap,
        action: 'Notificar Aprovadores'
      });
    }

    // 3. Positive Performance
    if (metrics.contractCompliance.value > 85) {
      items.push({
        id: 'compliance',
        type: 'positive',
        title: 'Excelente Compliance',
        description: `A aderência a contratos está em ${metrics.contractCompliance.value}%. Isso reduz o maverick spend e garante as melhores condições comerciais.`,
        impact: 'Alta Maturidade',
        icon: CheckCircle2
      });
    }

    // 4. Tail Spend Strategy
    if (metrics.tailSpend.percentage > 10) {
      items.push({
        id: 'tail-spend',
        type: 'info',
        title: 'Estratégia de Tail Spend',
        description: `Seu "Tail Spend" representa ${metrics.tailSpend.percentage}% do volume total. Consolidar esses fornecedores pode reduzir custos administrativos em 15%.`,
        impact: '- R$ 22.000 OPEX',
        icon: Sparkles,
        action: 'Analisar Cauda'
      });
    }

    return items;
  }, [metrics, spendByCategory, loading]);

  if (loading) {
    return (
      <Card className="border-primary/20 bg-card/50 backdrop-blur-xl">
        <CardContent className="p-8 flex flex-col items-center justify-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="h-8 w-8 text-primary opacity-50" />
          </motion.div>
          <p className="text-sm text-muted-foreground animate-pulse">IA analisando dados em tempo real...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Sparkles className="h-24 w-24 text-primary" />
      </div>
      
      <CardHeader className="flex flex-row items-center space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-lg font-bold">Insights Inteligentes (Beta)</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <AnimatePresence mode="popLayout">
          {insights.map((insight, index) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "group relative p-4 rounded-xl border transition-all duration-300",
                "hover:shadow-lg hover:shadow-primary/5 hover:translate-x-1",
                insight.type === 'opportunity' && "border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10",
                insight.type === 'warning' && "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10",
                insight.type === 'positive' && "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10",
                insight.type === 'info' && "border-primary/20 bg-primary/5 hover:bg-primary/10"
              )}
            >
              <div className="flex gap-4">
                <div className={cn(
                  "mt-1 p-2 rounded-lg h-fit",
                  insight.type === 'opportunity' && "bg-blue-500/20 text-blue-500",
                  insight.type === 'warning' && "bg-amber-500/20 text-amber-500",
                  insight.type === 'positive' && "bg-emerald-500/20 text-emerald-500",
                  insight.type === 'info' && "bg-primary/20 text-primary"
                )}>
                  <insight.icon className="h-4 w-4" />
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm leading-none">{insight.title}</h4>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                      insight.type === 'opportunity' && "bg-blue-500/20 text-blue-500",
                      insight.type === 'warning' && "bg-amber-500/20 text-amber-500",
                      insight.type === 'positive' && "bg-emerald-500/20 text-emerald-500",
                      insight.type === 'info' && "bg-primary/20 text-primary"
                    )}>
                      {insight.impact}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed pr-8">
                    {insight.description}
                  </p>
                  
                  {insight.action && (
                    <button className="flex items-center gap-1 text-[11px] font-bold text-primary hover:gap-2 transition-all mt-2">
                      {insight.action} <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
