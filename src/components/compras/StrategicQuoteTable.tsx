import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Zap, Clock, TrendingDown, CheckCircle2, ShieldCheck, ArrowRight, ExternalLink, Scale, Sparkles } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "@/lib/feedbackToast";
import { VisualComparadorCotacoes } from "./VisualComparadorCotacoes";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Sugestões Estratégicas
          </h3>
          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">IA selecionou os melhores caminhos por perfil</p>
        </div>
        <VisualComparadorCotacoes 
          cotacoes={cotacoes.map(c => ({
            id: c.id,
            fornecedor: c.fornecedor,
            valorUnitario: c.unit_price || (c.total / quantidade),
            quantidadeDisponivel: c.stock || quantidade,
            prazoEntrega: c.lead_time,
            frete: c.shipping || 0,
            condicaoPagamento: c.payment_terms || "N/A",
            total: c.total,
            rating: c.rating
          }))} 
          quantidade={quantidade} 
          onSelecionar={(id) => {
            const c = cotacoes.find(x => x.id === id);
            if (c) handleSelectStrategy('Comparador Visual', c.fornecedor);
          }} 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {strategies.map((strat, idx) => (
          <motion.div
            key={strat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, type: "spring", stiffness: 100 }}
            onClick={() => handleSelectStrategy(strat.label, strat.supplier)}
            className={cn(
              "p-6 rounded-[2.5rem] border backdrop-blur-3xl shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer active:scale-95",
              "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:to-transparent before:opacity-0 hover:before:opacity-100 transition-opacity",
              strat.bg,
              strat.border
            )}
          >

            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity group-hover:scale-110 duration-500">
              <strat.icon className={cn("w-24 h-24", strat.color)} />
            </div>
            
            <div className="absolute -bottom-4 -left-4 p-6 opacity-0 group-hover:opacity-[0.05] transition-opacity">
              <Sparkles className={cn("w-20 h-20", strat.color)} />
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
                    {strat.value != null ? formatCurrency(strat.value) : undefined}
                  </span>
                </div>
                <Badge variant="outline" className={cn("text-[9px] font-black uppercase px-3 py-1 bg-black/20", strat.border, strat.color)}>
                  {strat.detail}
                </Badge>
              </div>
              
              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{strat.saving}</span>
                  {idx === 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                      <span className="text-[8px] font-bold text-emerald-400/80 uppercase">Elite Choice</span>
                    </div>
                  )}
                </div>
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border group-hover:bg-white group-hover:text-black transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]", strat.border)}>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>

            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
