import { Check, X, Loader2, Search, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ResultadoBusca {
  id: string;
  fornecedor: string;
  status: 'encontrado' | 'nao_encontrado' | 'buscando';
  valorUnitario?: number;
  quantidadeDisponivel?: number;
}

interface BuscaAutomaticaProps {
  status: 'idle' | 'searching' | 'done';
  resultados: ResultadoBusca[];
}

const fornecedoresAPI = [
  { nome: 'XBZ Brindes', produtos: '10.172 produtos' },
  { nome: 'Stricker / Spot Gifts', produtos: '1.249 produtos' },
  { nome: 'Asia Import', produtos: '393 produtos' },
  { nome: 'Só Marcas', produtos: '1.139 produtos' },
];

export const BuscaAutomatica = ({ status, resultados }: BuscaAutomaticaProps) => {
  if (status === 'idle') {
    return (
      <div className="border-2 border-dashed border-white/5 rounded-[2rem] p-10 text-center bg-white/[0.01] transition-all hover:bg-white/[0.02]">
        <div className="w-16 h-16 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-zinc-600">
           <Search className="w-8 h-8 opacity-20" />
        </div>
        <p className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-xs max-w-xs mx-auto leading-relaxed">
          Click "Start Auto Search" to query {fornecedoresAPI.length} integrated cloud suppliers
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          {fornecedoresAPI.map(f => (
            <span key={f.nome} className="text-[9px] font-black uppercase tracking-widest text-zinc-600 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
              {f.nome}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6 px-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
          {status === 'searching' ? 'Live Querying Global Nodes...' : 'Query Cycle Completed'}
        </p>
        {status === 'searching' && (
           <div className="flex items-center gap-2 text-violet-400 text-[10px] font-black uppercase tracking-widest">
              <Zap className="w-3 h-3 animate-pulse" />
              Active
           </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {status === 'searching' ? (
            fornecedoresAPI.map((f, index) => (
              <motion.div
                key={f.nome}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl border transition-all duration-500 backdrop-blur-xl",
                  index < 2 
                    ? "border-emerald-500/20 bg-emerald-500/5 shadow-lg shadow-emerald-500/5" 
                    : "border-white/5 bg-white/[0.02]"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner",
                  index < 2 ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-zinc-600"
                )}>
                  {index < 2 ? (
                    <Check className="w-5 h-5" />
                  ) : index === 2 ? (
                    <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-zinc-800" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white uppercase tracking-tight truncate">{f.nome}</p>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">
                    {index < 2 ? 'Cloud Match Found' : index === 2 ? 'Scanning Catalog...' : 'Pending Query'}
                  </p>
                </div>
              </motion.div>
            ))
          ) : (
            resultados.map((r, index) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl border transition-all duration-500 backdrop-blur-xl",
                  r.status === 'encontrado' 
                    ? "border-emerald-500/20 bg-emerald-500/5 shadow-lg shadow-emerald-500/5" 
                    : "border-rose-500/20 bg-rose-500/5"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner",
                  r.status === 'encontrado' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                )}>
                  {r.status === 'encontrado' ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <X className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white uppercase tracking-tight truncate">{r.fornecedor}</p>
                  {r.status === 'encontrado' ? (
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-black text-emerald-400 tracking-tighter">
                        R$ {r.valorUnitario?.toFixed(2)}
                      </span>
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                        {r.quantidadeDisponivel} Stock
                      </span>
                    </div>
                  ) : (
                    <p className="text-[9px] font-bold text-rose-400 uppercase tracking-widest mt-1">No SKU Match</p>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
