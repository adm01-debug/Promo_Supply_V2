
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Zap, Clock, TrendingDown, CheckCircle2, ShieldCheck, ArrowRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface StrategicQuoteTableProps {
  cotacoes: any[];
  quantidade: number;
}

export const StrategicQuoteTable = ({ cotacoes, quantidade }: StrategicQuoteTableProps) => {
  if (cotacoes.length === 0) return null;

  const cheapest = [...cotacoes].sort((a, b) => a.total - b.total)[0];
  const fastest = [...cotacoes].sort((a, b) => (a.lead_time || 99) - (b.lead_time || 99))[0];
  
  // Advanced Rating Scoring (Rating + Weight for reliable delivery)
  const bestRated = [...cotacoes].sort((a, b) => {
    const scoreA = (a.rating || 0) * 10 - (a.lead_time || 0);
    const scoreB = (b.rating || 0) * 10 - (b.lead_time || 0);
    return scoreB - scoreA;
  })[0];

  const handleSelectStrategy = (strat: string, supplier: string) => {
    toast.success(`Estratégia "${strat}" selecionada para o fornecedor ${supplier}.`, {
      description: "Iniciando processo de solicitação de compra...",
    });
  };

  const strategies = [
    {
      id: 'cheapest',
      label: 'Opção Mais Econômica',
      icon: TrendingDown,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      supplier: cheapest.fornecedor,
      value: cheapest.total,
      detail: `${cheapest.lead_time} Dias`,
      saving: `${(((cotacoes.reduce((acc, c) => acc + c.total, 0) / cotacoes.length) - cheapest.total) / (cotacoes.reduce((acc, c) => acc + c.total, 0) / cotacoes.length) * 100).toFixed(1)}% abaixo da média`
    },
    {
      id: 'fastest',
      label: 'Entrega Mais Rápida',
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      supplier: fastest.fornecedor,
      value: fastest.total,
      detail: `${fastest.lead_time} Dias (EXPRESSO)`,
      saving: 'Foco Total em Urgência'
    },
    {
      id: 'best_rated',
      label: 'Premium de Qualidade',
      icon: ShieldCheck,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
      supplier: bestRated.fornecedor,
      value: bestRated.total,
      detail: `Rating ${bestRated.rating}/5.0`,
      saving: 'Caminho de Risco Mínimo'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {strategies.map((strat, idx) => (
        <motion.div
          key={strat.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.1 }}
          onClick={() => handleSelectStrategy(strat.label, strat.supplier)}
          className={cn(
            "p-6 rounded-[2.5rem] border backdrop-blur-3xl shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer active:scale-95",
            strat.bg,
            strat.border
          )}
        >
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity">
            <strat.icon className={cn("w-24 h-24", strat.color)} />
          </div>
          
          <div className="flex items-center gap-4 mb-6 relative z-10">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform group-hover:rotate-12", strat.border)}>
              <strat.icon className={cn("w-6 h-6", strat.color)} />
            </div>
            <div className="flex-1">
              <h3 className={cn("text-[10px] font-black uppercase tracking-[0.2em]", strat.color)}>
                {strat.label}
              </h3>
              <p className="text-sm font-black text-white uppercase tracking-tight mt-1 truncate max-w-[150px]">{strat.supplier}</p>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink className={cn("w-4 h-4", strat.color)} />
            </div>
          </div>

          <div className="space-y-4 relative z-10">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Impacto Total</span>
                <span className="text-2xl font-black text-white tracking-tight">
                  {strat.value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <Badge variant="outline" className={cn("text-[9px] font-black uppercase px-3 py-1 bg-black/20", strat.border, strat.color)}>
                {strat.detail}
              </Badge>
            </div>
            
            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{strat.saving}</span>
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border group-hover:bg-white group-hover:text-black transition-all", strat.border)}>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
