import { FileText, Building2, Calendar, DollarSign, Mail, MessageCircle, Clock, CheckCircle2, Truck, Info, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns/format";
import { ptBR } from "date-fns/locale/pt-BR";
import { type Pedido } from "@/features/pedidos";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pendente: { label: 'PENDING', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock },
  aprovado: { label: 'APPROVED', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20', icon: CheckCircle2 },
  enviado: { label: 'DISPATCHED', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', icon: FileText },
  em_transito: { label: 'IN TRANSIT', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20', icon: Truck },
  entregue: { label: 'FULFILLED', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
  cancelado: { label: 'VOIDED', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: Info },
const statusSteps = [
  { id: 'pendente', label: 'PENDING', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400' },
  { id: 'aprovado', label: 'APPROVED', icon: CheckCircle2, color: 'text-sky-400', bg: 'bg-sky-400' },
  { id: 'enviado', label: 'DISPATCHED', icon: FileText, color: 'text-indigo-400', bg: 'bg-indigo-400' },
  { id: 'em_transito', label: 'IN TRANSIT', icon: Truck, color: 'text-violet-400', bg: 'bg-violet-400' },
  { id: 'entregue', label: 'FULFILLED', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400' },
];


interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedido: Pedido | null;
}

export const PedidoDetailsDialog = ({ open, onOpenChange, pedido }: Props) => {
  if (!pedido) return null;
  const config = statusConfig[pedido.status] || statusConfig["pendente"];
  const StatusIcon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="dialog-desc" className="max-w-4xl p-0 bg-[#0a0a0f] border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-3xl shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600" />
        
        <DialogHeader className="p-8 pb-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner", config.color)}>
                <StatusIcon className="w-7 h-7" />
              </div>
              <div>
                <DialogTitle className="text-3xl font-black text-white tracking-tighter uppercase font-mono">
                   {pedido.numero}
                </DialogTitle>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                   <Calendar className="w-3 h-3" />
                   Issued: {format(new Date(pedido.data_emissao), 'dd MMM yyyy')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
               <Badge className={cn("px-5 py-2 rounded-full font-black text-[10px] tracking-widest uppercase border-none", config.color)}>
                 {config.label}
               </Badge>
               <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer">
                 <Zap className="w-4 h-4" />
               </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full grid grid-cols-3 bg-white/[0.03] border border-white/5 h-14 p-1 rounded-2xl mb-8">
              <TabsTrigger value="overview" className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white/[0.05] rounded-xl transition-all">SURVEILLANCE</TabsTrigger>
              <TabsTrigger value="financial" className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white/[0.05] rounded-xl transition-all">FINANCIALS</TabsTrigger>
              <TabsTrigger value="history" className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white/[0.05] rounded-xl transition-all">AUDIT LOG</TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                <TabsContent value="overview" className="mt-0 space-y-6 focus-visible:ring-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-6 bg-white/[0.02] border-white/5 rounded-3xl backdrop-blur-2xl">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-6 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-violet-400" />
                        Supplier Entity
                      </h3>
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center font-black text-zinc-400 uppercase tracking-tighter">
                            {pedido.fornecedor?.razao_social?.slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-black text-white uppercase text-sm tracking-tight leading-tight">{pedido.fornecedor?.razao_social || 'REDACTED ENTITY'}</p>
                            <p className="text-[10px] text-zinc-600 font-black uppercase mt-1 tracking-widest">Authorized Provider</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <Button variant="outline" className="h-10 rounded-xl bg-white/[0.03] border-white/10 font-black text-[9px] uppercase tracking-widest hover:bg-white/10">
                            <Mail className="w-3.5 h-3.5 mr-2" /> ENCRYPTED MAIL
                          </Button>
                          <Button variant="outline" className="h-10 rounded-xl bg-white/[0.03] border-white/10 font-black text-[9px] uppercase tracking-widest hover:bg-white/10">
                            <MessageCircle className="w-3.5 h-3.5 mr-2" /> COMMS HUB
                          </Button>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-6 bg-white/[0.02] border-white/5 rounded-3xl backdrop-blur-2xl">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-8 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-violet-400" />
                        Neural Fulfillment Timeline
                      </h3>
                      
                      <div className="relative">
                        {/* Status Timeline */}
                        <div className="space-y-8 relative">
                          {statusSteps.map((step, index) => {
                            const isCompleted = statusSteps.findIndex(s => s.id === pedido.status) >= index;
                            const isCurrent = pedido.status === step.id;
                            const isCancelled = pedido.status === 'cancelado';
                            
                            return (
                              <div key={step.id} className="relative flex items-start gap-4">
                                {index < statusSteps.length - 1 && (
                                  <div 
                                    className={cn(
                                      "absolute left-5 top-10 w-[2px] h-[calc(100%+8px)] transition-all duration-500",
                                      isCompleted && !isCurrent ? "bg-gradient-to-b from-violet-500 to-fuchsia-500" : "bg-white/5"
                                    )} 
                                  />
                                )}
                                
                                <div className={cn(
                                  "relative z-10 w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500 shadow-lg",
                                  isCurrent ? cn("scale-110 border-white/20", step.bg, "shadow-violet-500/20") : 
                                  isCompleted ? "bg-white/5 border-white/10" : "bg-zinc-900/50 border-white/5 opacity-40"
                                )}>
                                  <step.icon className={cn("w-5 h-5", isCurrent ? "text-white" : isCompleted ? step.color : "text-zinc-600")} />
                                  
                                  {isCurrent && (
                                    <motion.div
                                      layoutId="active-glow"
                                      className="absolute inset-0 rounded-xl bg-white/20 blur-md"
                                      animate={{ opacity: [0.2, 0.5, 0.2] }}
                                      transition={{ duration: 2, repeat: Infinity }}
                                    />
                                  )}
                                </div>
                                
                                <div className="pt-1.5 flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className={cn(
                                      "text-[10px] font-black tracking-widest uppercase transition-colors",
                                      isCurrent ? "text-white" : isCompleted ? "text-zinc-300" : "text-zinc-600"
                                    )}>
                                      {step.label}
                                    </p>
                                    {isCurrent && (
                                      <Badge variant="outline" className="text-[8px] font-black uppercase border-violet-500/30 text-violet-400 px-2 py-0 animate-pulse">
                                        ACTIVE STATE
                                      </Badge>
                                    )}
                                  </div>
                                  <p className={cn(
                                    "text-[9px] font-bold mt-1 uppercase",
                                    isCurrent ? "text-zinc-400" : "text-zinc-700"
                                  )}>
                                    {isCurrent ? "Vigilance Active" : isCompleted ? "Cycle Verified" : "Pending Vector"}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </Card>

                  </div>

                  {pedido.observacoes && (
                    <Card className="p-6 bg-white/[0.02] border-white/5 rounded-3xl backdrop-blur-2xl">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3 flex items-center gap-2">
                        <Info className="w-4 h-4 text-violet-400" />
                        Executive Briefing
                      </h3>
                      <p className="text-xs text-zinc-300 font-bold leading-relaxed">{pedido.observacoes}</p>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="financial" className="mt-0 space-y-6 focus-visible:ring-0">
                  <Card className="p-8 bg-white/[0.02] border-white/5 rounded-3xl backdrop-blur-2xl">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-8 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      Financial Intelligence
                    </h3>
                    <div className="space-y-6">
                      <div className="flex justify-between items-center text-zinc-500 font-black uppercase tracking-widest text-[10px]">
                        <span>Gross Subtotal</span>
                        <span className="text-white text-sm">{(pedido.valor_total - (pedido.valor_frete || 0) + (pedido.desconto || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                      <div className="flex justify-between items-center text-zinc-500 font-black uppercase tracking-widest text-[10px]">
                        <span>Logistics Overhead</span>
                        <span className={cn("text-sm", (pedido.valor_frete || 0) > 0 ? "text-white" : "text-emerald-400")}>{(pedido.valor_frete || 0) > 0 ? (pedido.valor_frete || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'ZERO COST'}</span>
                      </div>
                      <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                        <div className="space-y-1">
                           <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em]">Net Liquidity Value</p>
                           <p className="text-4xl font-black text-white tracking-tighter">{pedido.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                        <Badge variant="outline" className="mb-1 text-[10px] font-black border-emerald-500/30 text-emerald-400 px-4 py-1.5 uppercase tracking-widest bg-emerald-500/10">
                           SECURED ASSET
                        </Badge>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="history" className="mt-0 focus-visible:ring-0">
                  <Card className="p-12 bg-white/[0.02] border-white/5 rounded-3xl backdrop-blur-2xl text-center">
                    <Clock className="w-12 h-12 text-zinc-700 mx-auto mb-6 opacity-30" />
                    <h4 className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em]">Neural History Stream</h4>
                    <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mt-2">Initializing historical audit log vectors...</p>
                  </Card>
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </Tabs>
        </div>

        <div className="p-8 pt-0 flex justify-end gap-3">
           <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-black text-[10px] uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-white/5">CLOSE BRIEFING</Button>
           <Button className="rounded-xl px-8 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 border-none font-black text-[10px] uppercase tracking-widest shadow-lg shadow-violet-500/20">AUTHORIZE RE-DISPATCH</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};