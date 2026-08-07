
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, MessageSquare, Send, CheckCircle2, Loader2, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NeuralFollowUpMonitorProps {
  supplierName: string;
  itemName: string;
  lastUpdate?: string;
}

export const NeuralFollowUpMonitor = ({ supplierName, itemName, lastUpdate }: NeuralFollowUpMonitorProps) => {
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'drafting' | 'sent'>('idle');
  const [logs, setLogs] = useState<string[]>([]);

  const runNeuralProcess = async () => {
    setStatus('analyzing');
    setLogs(prev => [...prev, `[AI] Analyzing quotation delay for ${itemName}...`]);
    await new Promise(r => setTimeout(r, 1200));
    
    setStatus('drafting');
    setLogs(prev => [...prev, `[AI] Drafting context-aware message for ${supplierName}...`]);
    await new Promise(r => setTimeout(r, 1500));
    
    setLogs(prev => [...prev, `[MSG] "Olá ${supplierName}, tudo bem? Notei que ainda não recebemos sua atualização sobre ${itemName}. Precisamos fechar esse SLA hoje."`]);
    await new Promise(r => setTimeout(r, 1000));
    
    setStatus('sent');
    setLogs(prev => [...prev, `[OK] Message delivered via Promo AI Gateway.`]);
  };

  return (
    <div className="p-8 rounded-[2.5rem] bg-violet-600/5 border border-violet-500/20 backdrop-blur-3xl overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity">
        <Brain className="w-32 h-32 text-violet-400" />
      </div>
      
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/20 flex items-center justify-center text-violet-400 shadow-xl shadow-violet-500/20 border border-violet-500/30">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight text-white">Neural Follow-up Engine</h3>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-1">Autonomous Interaction System</p>
          </div>
        </div>
        
        <button 
          onClick={runNeuralProcess}
          disabled={status !== 'idle'}
          className={cn(
            "h-12 px-8 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all flex items-center gap-3",
            status === 'idle' ? "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20" : "bg-white/5 text-zinc-500 cursor-not-allowed border border-white/5"
          )}
        >
          {status === 'idle' ? (
            <>TRIGGER AI FOLLOW-UP <Send className="w-4 h-4" /></>
          ) : (
            <>SYSTEM ACTIVE <Loader2 className="w-4 h-4 animate-spin" /></>
          )}
        </button>
      </div>

      <div className="space-y-4 relative z-10">
        <div className="p-6 rounded-3xl bg-black/40 border border-white/5 min-h-[200px] flex flex-col">
          <div className="flex-1 space-y-3 font-mono">
            {logs.map((log, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "text-[11px] font-medium leading-relaxed",
                  log.startsWith('[AI]') ? "text-violet-400" : 
                  log.startsWith('[MSG]') ? "text-zinc-300 italic pl-4 border-l border-white/10" :
                  log.startsWith('[OK]') ? "text-emerald-400 font-bold" : "text-zinc-500"
                )}
              >
                {log}
              </motion.div>
            ))}
            {status === 'analyzing' || status === 'drafting' ? (
              <div className="flex gap-1 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0.4s]" />
              </div>
            ) : null}
          </div>
          
          <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Supplier</p>
                <p className="text-xs font-bold text-zinc-200">{supplierName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Latency</p>
                <p className="text-xs font-bold text-rose-400">+48h Overdue</p>
              </div>
            </div>
            
            <Badge variant="outline" className={cn(
              "text-[9px] font-black uppercase px-4 py-1.5 rounded-full",
              status === 'sent' ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/5" : "border-white/10 text-zinc-500"
            )}>
              {status === 'sent' ? 'SLA Restored' : 'Monitoring Active'}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};
