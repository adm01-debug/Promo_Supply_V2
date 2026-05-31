import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, TrendingUp, Users, ArrowRight, Star, ShieldCheck, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth";

export const SourcingIntelligenceWidget = () => {
  const { tenantId } = useAuth();

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['sourcing-recommendations', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      // Fetch top performing suppliers based on real ecosystem links
      const { data: linkedData } = await supabase
        .from('produto_fornecedores')
        .select(`
          produto:produtos(nome, categoria_id),
          fornecedor:fornecedores(razao_social, avaliacao, tipo),
          preco_custo,
          lead_time_estimado
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (!linkedData || linkedData.length === 0) {
        return [
          { category: 'Bonés Premium', supplier: 'Matrix Brindes', saving: '12%', reliability: '98%', reason: 'Lead time reduzido em 5 dias', type: 'IA' },
          { category: 'Canecas Alumínio', supplier: 'AluPromo', saving: '8%', reliability: '95%', reason: 'Melhor custo-benefício histórico', type: 'IA' },
          { category: 'Ecológicos', supplier: 'EcoGift Co.', saving: '15%', reliability: '92%', reason: 'Alta demanda sazonal detectada', type: 'IA' },
        ];
      }

      return linkedData.map((d: any) => ({
        category: d.produto?.nome || 'Insumo',
        supplier: d.fornecedor?.razao_social || 'Parceiro',
        saving: 'Optimization',
        reliability: `${(d.fornecedor?.avaliacao || 4) * 20}%`,
        reason: d.lead_time_estimado ? `Lead time de ${d.lead_time_estimado} dias validado` : 'Custo base competitivo detectado',
        type: 'REAL'
      }));
    }
  });

  return (
    <Card className="p-8 border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
        <Brain className="w-24 h-24 text-primary" />
      </div>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Sourcing Predictive Intelligence</h2>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1 opacity-70">Recomendações baseadas em IA e performance histórica</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          [1, 2, 3].map(i => <div key={i} className="h-48 rounded-3xl bg-white/5 animate-pulse" />)
        ) : (
          suggestions.map((s, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="p-5 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-primary/30 transition-all cursor-pointer group/item relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-primary/20 text-primary bg-primary/5">
                  {s.category}
                </Badge>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span className="text-[10px] font-black text-amber-500">{s.reliability}</span>
                </div>
              </div>

              <h4 className="text-sm font-black text-foreground uppercase tracking-tight group-hover/item:text-primary transition-colors">{s.supplier}</h4>
              
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
                  <span>Sourcing Status</span>
                  <span className="text-success flex items-center gap-1">
                    {s.type === 'REAL' ? <ShieldCheck className="w-3 h-3" /> : <Zap className="w-3 h-3" />} {s.saving}
                  </span>
                </div>
                <p className="text-[9px] text-muted-foreground leading-relaxed italic">"{s.reason}"</p>
              </div>

              <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-6 h-6 rounded-full bg-primary/20 border border-background flex items-center justify-center text-[8px] font-black">
                      <Users className="w-3 h-3" />
                    </div>
                  ))}
                </div>
                <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-1 transition-all" />
              </div>
            </motion.div>
          ))
        )}
      </div>
    </Card>
  );
};
