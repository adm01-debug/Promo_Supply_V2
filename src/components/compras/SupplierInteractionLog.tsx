import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Bot, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Interaction {
  id: string;
  type: 'ai' | 'human';
  message: string;
  timestamp: string;
  status: 'sent' | 'read' | 'replied';
}

const mockInteractions: Interaction[] = [
  {
    id: '1',
    type: 'ai',
    message: "Olá! Verifiquei que o pedido está pendente há 24h. Poderia confirmar a previsão de início da produção?",
    timestamp: "10:00",
    status: 'read'
  },
  {
    id: '2',
    type: 'human',
    message: "Opa, tudo bem? Estamos aguardando a chegada da matéria-prima, deve chegar amanhã.",
    timestamp: "10:15",
    status: 'replied'
  },
  {
    id: '3',
    type: 'ai',
    message: "Entendido! Marquei aqui para te cobrar novamente amanhã à tarde. Obrigado!",
    timestamp: "10:16",
    status: 'sent'
  }
];

export const SupplierInteractionLog: React.FC<{ supplierName?: string }> = ({ supplierName }) => {
  return (
    <Card className="p-6 bg-white/[0.02] border-white/5 rounded-3xl backdrop-blur-2xl mt-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
          <Bot className="w-4 h-4 text-violet-400" />
          IA Follow-up Agent
        </h3>
        <Badge variant="outline" className="text-[8px] font-black uppercase border-emerald-500/20 text-emerald-400 bg-emerald-500/5">
          Ativo
        </Badge>
      </div>

      <div className="space-y-4">
        {mockInteractions.map((interaction, idx) => (
          <motion.div
            key={interaction.id}
            initial={{ opacity: 0, x: interaction.type === 'ai' ? -10 : 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={cn(
              "flex flex-col gap-1 max-w-[85%]",
              interaction.type === 'ai' ? "items-start" : "items-end ml-auto"
            )}
          >
            <div className={cn(
              "px-4 py-3 rounded-2xl text-[11px] font-bold leading-relaxed shadow-lg",
              interaction.type === 'ai' 
                ? "bg-violet-600/20 border border-violet-500/20 text-violet-100 rounded-tl-none" 
                : "bg-white/5 border border-white/10 text-zinc-300 rounded-tr-none"
            )}>
              {interaction.message}
            </div>
            <div className="flex items-center gap-2 px-1">
              <span className="text-[8px] text-zinc-600 font-black uppercase tracking-tighter">{interaction.timestamp}</span>
              {interaction.type === 'ai' && (
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-zinc-700" />
                  <span className="text-[8px] text-zinc-600 font-black uppercase tracking-tighter">
                    {interaction.status === 'sent' ? 'Enviado' : interaction.status === 'read' ? 'Lido' : 'Respondido'}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-500">
            <Clock className="w-3 h-3" />
            <span className="text-[9px] font-black uppercase tracking-widest">Próxima cobrança: Amanhã às 14:00</span>
          </div>
          <Badge variant="outline" className="text-[8px] font-black uppercase border-violet-500/30 text-violet-400 cursor-pointer hover:bg-violet-500/10 transition-colors">
            Intervir Agora
          </Badge>
        </div>
      </div>
    </Card>
  );
};
