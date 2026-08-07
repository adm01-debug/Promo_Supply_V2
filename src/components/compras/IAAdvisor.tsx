import { motion } from "framer-motion";
import { Sparkles, TrendingUp, AlertCircle, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface IAAdvisorProps {
  stats: {
    pending: number;
    value: number;
    total: number;
  };
}

export const IAAdvisor = ({ stats }: IAAdvisorProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-violet-600/10 via-fuchsia-600/10 to-transparent border border-violet-500/20 rounded-[2rem] p-6 mb-8 backdrop-blur-xl relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
        <Sparkles className="w-24 h-24 text-violet-400" />
      </div>
      
      <div className="flex flex-col md:flex-row md:items-center gap-6 relative z-10">
        <div className="w-12 h-12 bg-violet-500 rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(139,92,246,0.5)]">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-white font-black text-sm uppercase tracking-widest mb-1">IA Procurement Advisor</h3>
          <p className="text-zinc-400 text-xs font-medium max-w-2xl leading-relaxed">
            {stats.pending > 0 
              ? `Identifiquei ${stats.pending} solicitações aguardando cotação. Recomendo priorizar itens de alto valor para otimizar o fluxo de caixa.`
              : "Seu fluxo de suprimentos está saudável. Nenhuma anomalia detectada no momento."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="bg-white/5 border-white/10 text-white font-black text-[10px] uppercase tracking-widest px-6 h-10 rounded-xl hover:bg-white/10">
            Ver Insights
          </Button>
          <Button className="bg-violet-600 hover:bg-violet-500 text-white font-black text-[10px] uppercase tracking-widest px-6 h-10 rounded-xl shadow-lg shadow-violet-500/20 border-none">
            Ação Rápida
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
