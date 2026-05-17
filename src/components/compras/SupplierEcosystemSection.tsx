
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, DollarSign, Clock, Star, ArrowRight, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SupplierEcosystemSectionProps {
  produtoId: string;
  produtoNome: string;
}

export const SupplierEcosystemSection = ({ produtoId, produtoNome }: SupplierEcosystemSectionProps) => {
  const { data: ecossistema = [], isLoading } = useQuery({
    queryKey: ["produto-ecossistema", produtoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produto_fornecedores")
        .select(`
          *,
          fornecedor:fornecedores(id, razao_social, rating)
        `)
        .eq("produto_id", produtoId);
      if (error) throw error;
      return data;
    },
    enabled: !!produtoId,
  });

  if (isLoading) return <div className="h-40 w-full animate-pulse bg-white/5 rounded-3xl" />;

  return (
    <Card className="border-white/5 bg-white/[0.02] backdrop-blur-2xl rounded-[2.5rem] overflow-hidden shadow-2xl">
      <CardHeader className="p-8 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-black uppercase tracking-tight text-white">Ecosystem Database</CardTitle>
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-1">{produtoNome}</p>
            </div>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-4 py-1.5 rounded-full font-black text-[10px] tracking-widest uppercase">
            {ecossistema.length} Registered Partners
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ecossistema.length > 0 ? (
            ecossistema.map((item: any, idx) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] hover:border-emerald-500/30 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center font-black text-emerald-400 text-xs border border-emerald-500/20">
                      {item.fornecedor?.razao_social?.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{item.fornecedor?.razao_social}</h4>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={cn("w-2.5 h-2.5", i < (item.fornecedor?.rating || 0) ? "text-amber-400 fill-amber-400" : "text-zinc-800")} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-all" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/5">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Cost Base
                    </span>
                    <p className="text-xs font-black text-zinc-300">
                      {item.preco_custo?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || '—'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Lead Time
                    </span>
                    <p className="text-xs font-black text-zinc-300">
                      {item.lead_time_estimado || '—'} Days
                    </p>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center bg-white/[0.01] border-2 border-dashed border-white/5 rounded-3xl">
              <Package className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
              <p className="text-sm font-black text-zinc-600 uppercase tracking-[0.2em]">No partners linked to this product in the master database</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
