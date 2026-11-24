import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface InteracaoFornecedor {
  id: string;
  origem: 'sistema' | 'fornecedor';
  texto: string;
  quando: string | null;
  situacao?: string | null;
}

const FORMATADOR_BR = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
  timeStyle: 'short',
});

export function formatarQuando(quando: string | null | undefined): string {
  if (!quando) return 'sem data registrada';
  const data = new Date(quando);
  if (Number.isNaN(data.getTime())) return 'data invalida';
  return FORMATADOR_BR.format(data);
}

/**
 * Mostra apenas interacoes registradas de verdade (follow-up do agendador em
 * `cotacoes.last_follow_up_at` e notificacoes `cotacao_followup`). Sem registro,
 * o componente diz que nao ha registro - nao inventa dialogo.
 */
export const SupplierInteractionLog: React.FC<{
  supplierName?: string;
  interacoes?: InteracaoFornecedor[];
  carregando?: boolean;
}> = ({ supplierName, interacoes = [], carregando = false }) => {
  const fornecedor = supplierName || 'este fornecedor';
  return (
    <Card className="p-6 bg-white/[0.02] border-white/5 rounded-3xl backdrop-blur-2xl mt-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
          <Bot className="w-4 h-4 text-violet-400" />
          Historico de Follow-up
        </h3>
        <Badge variant="outline" className="text-[8px] font-black uppercase border-white/10 text-zinc-400">
          {carregando ? 'Carregando' : `${interacoes.length} registro${interacoes.length === 1 ? '' : 's'}`}
        </Badge>
      </div>

      {!carregando && interacoes.length === 0 ? (
        <p className="text-[11px] font-bold leading-relaxed text-zinc-500">
          Nenhuma interacao registrada com {fornecedor}. O sistema registra aqui os follow-ups
          enviados pelo agendador (cotacoes pendentes ha mais de 48h) e as respostas recebidas.
        </p>
      ) : (
        <div className="space-y-4">
          {interacoes.map((interacao, idx) => (
            <motion.div
              key={interacao.id}
              initial={{ opacity: 0, x: interacao.origem === 'sistema' ? -10 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={cn(
                "flex flex-col gap-1 max-w-[85%]",
                interacao.origem === 'sistema' ? "items-start" : "items-end ml-auto"
              )}
            >
              <div className={cn(
                "px-4 py-3 rounded-2xl text-[11px] font-bold leading-relaxed shadow-lg",
                interacao.origem === 'sistema'
                  ? "bg-violet-600/20 border border-violet-500/20 text-violet-100 rounded-tl-none"
                  : "bg-white/5 border border-white/10 text-zinc-300 rounded-tr-none"
              )}>
                {interacao.texto}
              </div>
              <div className="flex items-center gap-2 px-1">
                <span className="text-[8px] text-zinc-600 font-black uppercase tracking-tighter">
                  {formatarQuando(interacao.quando)}
                </span>
                {interacao.situacao && (
                  <span className="text-[8px] text-zinc-600 font-black uppercase tracking-tighter">
                    {interacao.situacao}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-white/5">
        <div className="flex items-center gap-2 text-zinc-500">
          <Clock className="w-3 h-3" />
          <span className="text-[9px] font-black uppercase tracking-widest">
            O aviso e automatico: o agendador verifica cotacoes pendentes a cada execucao.
          </span>
        </div>
      </div>
    </Card>
  );
};
