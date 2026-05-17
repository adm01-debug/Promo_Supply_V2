import { useState } from "react";
import { Trophy, Check, AlertTriangle, Truck, Settings2, Sparkles, MessageSquare, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";

interface Cotacao {
  id: string;
  fornecedor: string;
  valorUnitario: number;
  quantidadeDisponivel: number;
  prazoEntrega: number;
  frete: number;
  freteInfo: string;
  condicaoPagamento: string;
  total: number;
  alerta?: string;
  score_preco?: number;
  score_prazo?: number;
  score_qualidade?: number;
  score_total?: number;
}

interface RankingCotacoesProps {
  cotacoes: Cotacao[];
  quantidade: number;
  onSelecionar: (id: string, justificativa?: string) => void;
  selecionado: string | null;
}

interface ScoreWeights {
  preco: number;
  prazo: number;
  estoque: number;
}

const medalConfig = [
  { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: '🥇', label: 'Gold Choice' },
  { bg: 'bg-zinc-300/10', border: 'border-zinc-400/30', text: 'text-zinc-300', icon: '🥈', label: 'Silver Runner' },
  { bg: 'bg-orange-400/10', border: 'border-orange-500/30', text: 'text-orange-400', icon: '🥉', label: 'Bronze Value' },
];

export const RankingCotacoes = ({ cotacoes, quantidade, onSelecionar, selecionado }: RankingCotacoesProps) => {
  const [weights, setWeights] = useState<ScoreWeights>({
    preco: 60,
    prazo: 20,
    estoque: 20
  });
  
  const [justificativa, setJustificativa] = useState("");
  const [showJustifyModal, setShowJustifyModal] = useState(false);
  const [pendingSelectionId, setPendingSelectionId] = useState<string | null>(null);

  const confirmSelection = () => {
    if (pendingSelectionId) {
      onSelecionar(pendingSelectionId, justificativa);
      setShowJustifyModal(false);
      setPendingSelectionId(null);
      setJustificativa("");
    }
  };

  const handleSelectClick = (cotacaoId: string, isTopRanked: boolean) => {
    if (isTopRanked) {
      onSelecionar(cotacaoId);
    } else {
      setPendingSelectionId(cotacaoId);
      setShowJustifyModal(true);
    }
  };

  const calculateScore = (cotacao: Cotacao) => {
    const minTotal = Math.min(...cotacoes.map(c => c.total));
    const maxTotal = Math.max(...cotacoes.map(c => c.total));
    const minPrazo = Math.min(...cotacoes.map(c => c.prazoEntrega));
    const maxPrazo = Math.max(...cotacoes.map(c => c.prazoEntrega));
    
    const normalizedPreco = maxTotal === minTotal ? 100 : (1 - (cotacao.total - minTotal) / (maxTotal - minTotal)) * 100;
    const normalizedPrazo = maxPrazo === minPrazo ? 100 : (1 - (cotacao.prazoEntrega - minPrazo) / (maxPrazo - minPrazo)) * 100;
    const normalizedEstoque = cotacao.quantidadeDisponivel >= quantidade ? 100 : (cotacao.quantidadeDisponivel / quantidade) * 100;

    const finalScore = (
      (normalizedPreco * (weights.preco / 100)) +
      (normalizedPrazo * (weights.prazo / 100)) +
      (normalizedEstoque * (weights.estoque / 100))
    );

    return Math.round(finalScore);
  };

  const cotacoesComScore = cotacoes.map(c => ({
    ...c,
    score: calculateScore(c)
  }));

  const cotacoesOrdenadas = [...cotacoesComScore].sort((a, b) => b.score - a.score);
  
  const cheapestId = useMemo(() => {
    return [...cotacoes].sort((a, b) => a.total - b.total)[0]?.id;
  }, [cotacoes]);

  const fastestId = useMemo(() => {
    return [...cotacoes].sort((a, b) => a.prazoEntrega - b.prazoEntrega)[0]?.id;
  }, [cotacoes]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500 italic">
          Dynamic Ranking: Price ({weights.preco}%) • Delivery ({weights.prazo}%) • Stock ({weights.estoque}%)
        </p>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-10 px-4 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 font-black text-[10px] tracking-widest uppercase gap-2 border border-white/5 bg-white/[0.02]">
              <Settings2 className="w-4 h-4" />
              Weight Config
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 bg-[#0a0a0f]/95 border-white/10 backdrop-blur-3xl p-6 rounded-2xl shadow-2xl z-50">
            <div className="space-y-6">
              <div className="space-y-2 pb-4 border-b border-white/5">
                <h4 className="font-black text-white uppercase tracking-tight text-sm">Decision Weights</h4>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider leading-relaxed">
                  Calibrate how AI ranks these proposals based on your current strategy.
                </p>
              </div>
              <div className="space-y-6">
                {[
                  { id: 'preco', label: 'Price Efficiency', val: weights.preco, set: (v: number) => setWeights(p => ({ ...p, preco: v })) },
                  { id: 'prazo', label: 'Lead Time', val: weights.prazo, set: (v: number) => setWeights(p => ({ ...p, prazo: v })) },
                  { id: 'estoque', label: 'Stock Reliability', val: weights.estoque, set: (v: number) => setWeights(p => ({ ...p, estoque: v })) }
                ].map(w => (
                  <div key={w.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={w.id} className="text-[10px] font-black uppercase text-zinc-300 tracking-widest">{w.label}</Label>
                      <span className="text-[10px] font-black text-violet-400">{w.val}%</span>
                    </div>
                    <Slider
                      id={w.id}
                      max={100}
                      step={5}
                      value={[w.val]}
                      onValueChange={([val]) => w.set(val)}
                      className="py-1"
                    />
                  </div>
                ))}
                <div className="pt-4 border-t border-white/5">
                  <div className="flex justify-between items-center mb-2">
                     <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total Weight:</span>
                     <span className={cn("text-xs font-black", (weights.preco + weights.prazo + weights.estoque) === 100 ? "text-emerald-400" : "text-rose-400")}>
                        {weights.preco + weights.prazo + weights.estoque}%
                     </span>
                  </div>
                  {(weights.preco + weights.prazo + weights.estoque) !== 100 && (
                    <p className="text-[9px] text-rose-400/70 text-center font-bold uppercase tracking-tighter">
                      Sum must equal 100% for precise calculation.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <AnimatePresence mode="popLayout">
        {cotacoesOrdenadas.map((cotacao, index) => {
          const medal = medalConfig[index] || { bg: 'bg-white/5', border: 'border-white/5', text: 'text-zinc-500', icon: `#${index + 1}`, label: 'Qualified' };
          const isSelected = selecionado === cotacao.id;
          const estoqueOk = cotacao.quantidadeDisponivel >= quantidade;
          const displayScore = cotacao.score_total || cotacao.score;

          return (
            <motion.div
              key={cotacao.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className={cn(
                "p-6 rounded-[2rem] border transition-all duration-500 relative overflow-hidden group",
                isSelected 
                  ? "border-violet-500/50 bg-violet-500/10 ring-2 ring-violet-500/20 shadow-[0_20px_60px_rgba(139,92,246,0.2)]" 
                  : cn("bg-white/[0.02] hover:bg-white/[0.04] hover:shadow-xl hover:border-white/10", medal.border)
              )}
            >
              <div className="absolute top-0 right-0">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className={cn(
                      "px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-bl-[1.5rem] cursor-help flex items-center gap-2 shadow-lg transition-all active:scale-95",
                      displayScore >= 80 ? "bg-emerald-600 text-white" : 
                      displayScore >= 60 ? "bg-amber-600 text-white" : 
                      "bg-rose-600 text-white"
                    )}>
                      <Trophy className="w-3.5 h-3.5" />
                      Score: {displayScore}/100
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-5 bg-[#0a0a0f]/95 border-white/10 backdrop-blur-3xl shadow-2xl rounded-2xl z-50">
                    <div className="space-y-5">
                      <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                        <Sparkles className="w-5 h-5 text-violet-400" />
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-white">AI Decision Matrix</h4>
                      </div>
                      
                      <div className="space-y-4">
                        {[
                          { label: 'Price Index', score: cotacao.score_preco || cotacao.score, color: 'bg-violet-500' },
                          { label: 'Timeline Index', score: cotacao.score_prazo || cotacao.score, color: 'bg-emerald-500' },
                          { label: 'Quality & Risk', score: cotacao.score_qualidade || 80, color: 'bg-fuchsia-500' }
                        ].map(metric => (
                          <div key={metric.label}>
                            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-1.5">
                              <span className="text-zinc-500">{metric.label}</span>
                              <span className="text-white">{metric.score}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                              <motion.div 
                                className={cn("h-full transition-all duration-1000", metric.color)}
                                initial={{ width: 0 }}
                                animate={{ width: `${metric.score}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <p className="text-[9px] leading-relaxed text-zinc-500 font-bold uppercase tracking-wider italic pt-2 border-t border-white/5">
                        This ranking accounts for supplier performance history, lead time reliability, and net unit cost optimization.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 shadow-inner backdrop-blur-md",
                  medal.bg, medal.text
                )}>
                  <span className="drop-shadow-lg">{medal.icon}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-4">
                    <h4 className="font-black text-white text-lg tracking-tight group-hover:text-violet-400 transition-colors uppercase">{cotacao.fornecedor}</h4>
                    <div className="flex gap-2">
                       {isSelected && (
                        <Badge className="bg-violet-500 text-white border-none px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest animate-in fade-in zoom-in duration-300">
                          SELECTED
                        </Badge>
                      )}
                      <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest border-white/10 text-zinc-500", medal.border, medal.text)}>
                        {medal.label}
                      </Badge>
                      {cotacao.id === cheapestId && (
                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
                          <TrendingDown className="w-3 h-3 mr-1" /> Best Value
                        </Badge>
                      )}
                      {cotacao.id === fastestId && (
                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-amber-500/30 text-amber-400 bg-amber-500/5">
                          <Clock className="w-3 h-3 mr-1" /> Fastest Delivery
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Unit Cost</p>
                      <p className="font-bold text-zinc-200">R$ {cotacao.valorUnitario.toFixed(2)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Total Volume</p>
                      <p className="font-black text-white text-base tracking-tighter">R$ {cotacao.total.toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Lead Time</p>
                      <p className="font-bold text-zinc-200 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-zinc-600" />
                        {cotacao.prazoEntrega} Days
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Inventory</p>
                      <div className="flex items-center gap-2">
                        {estoqueOk ? (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-none font-black text-[10px] px-2">
                             {cotacao.quantidadeDisponivel} UNITS
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-1.5 text-rose-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span className="font-black text-[10px] uppercase">{cotacao.quantidadeDisponivel} (LOW)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-5 mt-5 pt-4 border-t border-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
                    <span className="flex items-center gap-2">
                      <Truck className="w-3.5 h-3.5" />
                      Logistic: {cotacao.freteInfo}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-zinc-800" />
                    <span>Payment: {cotacao.condicaoPagamento}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 shrink-0 pt-4 md:pt-0">
                  <Button
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSelectClick(cotacao.id, index === 0)}
                    className={cn(
                      "h-11 px-8 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all duration-300 active:scale-95 border-white/10",
                      isSelected 
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                        : "bg-white/[0.02] hover:bg-white/10 text-zinc-300 hover:text-white"
                    )}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        CONFIRMED
                      </>
                    ) : (
                      'SELECT'
                    )}
                  </Button>
                  {index === 0 && !isSelected && (
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">
                      <Sparkles className="w-3 h-3" />
                      Prime Choice
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <Dialog open={showJustifyModal} onOpenChange={setShowJustifyModal}>
        <DialogContent className="bg-[#0a0a0f] border-white/10 backdrop-blur-3xl rounded-[2.5rem] sm:max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-white font-black uppercase tracking-tight">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              Selection Variance
            </DialogTitle>
            <DialogDescription className="text-zinc-500 font-medium leading-relaxed">
              You are selecting a supplier that deviates from the AI Prime Choice recommendation. Please provide justification for audit tracking.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="justificativa" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Rationale</Label>
              <Textarea
                id="justificativa"
                placeholder="Ex: Offline pricing agreement, existing MSA terms, or preferred logistics partnership..."
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                className="min-h-[120px] bg-white/5 border-white/10 rounded-2xl focus:ring-violet-500/20 focus:border-violet-500/40 text-sm font-bold text-white placeholder:text-zinc-700"
              />
            </div>
          </div>
          <DialogFooter className="gap-3">
             <Button variant="ghost" onClick={() => setShowJustifyModal(false)} className="rounded-xl h-12 font-bold text-zinc-400 hover:bg-white/5 uppercase tracking-widest text-[10px]">
              Cancel
            </Button>
            <Button 
              onClick={confirmSelection} 
              disabled={!justificativa.trim()}
              className="rounded-xl h-12 px-8 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-black uppercase tracking-widest text-[10px] border-none shadow-lg shadow-violet-500/20"
            >
              Confirm Selection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
