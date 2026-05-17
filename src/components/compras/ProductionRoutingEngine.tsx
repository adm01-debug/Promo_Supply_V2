import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Zap, AlertTriangle, Clock, Target, CheckCircle2, Factory } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProductionRoutineProps {
  items: any[];
}

export const ProductionRoutingEngine: React.FC<ProductionRoutineProps> = ({ items }) => {
  // Logic to detect specialized routines based on Promobrink workflows
  const hasCap = items.some(item => item.descricao?.toLowerCase().includes('boné') || item.produto?.nome?.toLowerCase().includes('boné'));
  const hasPersonalized = hasCap || items.some(item => item.produto?.tipo_produto === 'personalizado' || item.descricao?.toLowerCase().includes('personalizado'));
  const hasHighLeadTime = items.some(item => (item.produto?.lead_time_dias || 0) > 15);
  
  const routine = hasCap ? {
    title: "ROTINA ESPECIAL: FABRICAÇÃO DE BONÉS",
    description: "Item de longo lead-time detectado. Requer aprovação crítica de 1ª peça.",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    icon: Factory,
    steps: [
      { label: "Layout Aprovado", status: "completed" },
      { label: "1ª Peça (Amostra)", status: "pending" },
      { label: "Produção em Massa", status: "upcoming" }
    ]
  } : hasPersonalized ? {
    title: "ROTINA ESPECIAL: PERSONALIZAÇÃO PREMIUM",
    description: "Este pedido exige acompanhamento de primeira peça e validação de layout.",
    color: "text-fuchsia-400",
    bg: "bg-fuchsia-500/10",
    border: "border-fuchsia-500/20",
    icon: Zap,
    steps: [
      { label: "Checklist de Layout", status: "completed" },
      { label: "Aprovação 1ª Peça", status: "pending" },
      { label: "Início Bordado/Silk", status: "upcoming" }
    ]
  } : hasHighLeadTime ? {
    title: "ROTINA ESPECIAL: LONGO LEAD TIME",
    description: "Produção complexa detectada. Requer follow-up semanal com fornecedor.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: Clock,
    steps: [
      { label: "Confirmação de Insumos", status: "completed" },
      { label: "Fase de Montagem", status: "pending" },
      { label: "Logística de Coleta", status: "upcoming" }
    ]
  } : null;

  if (!routine) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("p-6 rounded-[2rem] border backdrop-blur-3xl shadow-2xl", routine.bg, routine.border)}
    >
      <div className="flex items-center gap-4 mb-4">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border", routine.border)}>
          <routine.icon className={cn("w-6 h-6", routine.color)} />
        </div>
        <div>
          <h3 className={cn("text-xs font-black uppercase tracking-[0.2em]", routine.color)}>
            {routine.title}
          </h3>
          <p className="text-[10px] text-zinc-400 font-bold mt-1 uppercase leading-tight">
            {routine.description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {routine.steps.map((step, idx) => (
          <div key={idx} className="flex flex-col gap-2">
            <div className="h-1 rounded-full bg-white/5 overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-1000",
                  step.status === 'completed' ? "bg-emerald-500 w-full" : 
                  step.status === 'pending' ? "bg-amber-500 w-1/2 animate-pulse" : "w-0"
                )} 
              />
            </div>
            <span className={cn(
              "text-[8px] font-black uppercase tracking-widest text-center",
              step.status === 'completed' ? "text-emerald-400" : 
              step.status === 'pending' ? "text-amber-400" : "text-zinc-600"
            )}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const SourcingIntelligenceBanner: React.FC<{ items: any[] }> = ({ items }) => {
  // Fetch real supplier ecosystems for the first few items
  const { data: backups = [] } = useQuery({
    queryKey: ['sourcing-alternatives', items.map(i => i.produto_id)],
    queryFn: async () => {
      const results = [];
      for (const item of items) {
        if (!item.produto_id) continue;
        const { data, count } = await supabase
          .from('produto_fornecedores')
          .select('id', { count: 'exact' })
          .eq('produto_id', item.produto_id);
        
        results.push({
          produto_id: item.produto_id,
          descricao: item.descricao,
          count: count || 0
        });
      }
      return results;
    },
    enabled: items.length > 0
  });

  return (
    <div className="mt-6 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4 flex items-center gap-2">
        <Target className="w-4 h-4 text-violet-400" />
        Sourcing Intelligence (Ecosystem)
      </h4>
      <div className="space-y-3">
        {backups.map((item: any, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all cursor-help group">
            <div className="flex items-center gap-3">
              <Factory className="w-4 h-4 text-zinc-600 group-hover:text-violet-400 transition-colors" />
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">Database: {item.descricao}</p>
                <p className="text-[9px] text-zinc-600 font-bold uppercase mt-0.5">
                  {item.count > 0 ? `${item.count} parceiro(s) vinculado(s)` : 'Nenhum parceiro direto vinculado'}
                </p>
              </div>
            </div>
            <Badge variant="outline" className={cn(
              "text-[8px] font-black uppercase",
              item.count > 0 ? "border-emerald-500/20 text-emerald-400/80" : "border-amber-500/20 text-amber-400/80"
            )}>
              {item.count > 0 ? 'Active' : 'Missing'}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
};
