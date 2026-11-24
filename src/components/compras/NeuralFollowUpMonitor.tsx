
import { Brain, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ResumoFollowUp {
  registrado: boolean;
  situacao: string;
  latencia: string;
  linhas: string[];
}

const SITUACOES: Record<string, string> = {
  notificado: 'Notificado',
  respondido: 'Respondido',
  expirado: 'Expirado',
  aguardando: 'Aguardando',
};

const FORMATADOR_BR = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
  timeStyle: 'short',
});

export function formatarEnvio(iso: string | null | undefined): string {
  if (!iso) return 'sem data registrada';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return 'data invalida';
  return FORMATADOR_BR.format(data);
}

/**
 * Deriva o painel do que o agendador registrou em `cotacoes` (`last_follow_up_at`
 * e `follow_up_status`). Sem registro, devolve o estado vazio - o componente nao
 * pode afirmar entrega que nao aconteceu.
 */
export function descreverFollowUp(
  ultimoFollowUpEm?: string | null,
  followUpStatus?: string | null,
  horasDeAtraso?: number | null,
): ResumoFollowUp {
  const registrado = Boolean(ultimoFollowUpEm);
  if (!registrado) {
    return {
      registrado: false,
      situacao: followUpStatus ? (SITUACOES[followUpStatus] || followUpStatus) : 'Sem registro',
      latencia: 'Sem registro',
      linhas: ['[REG] Nenhum follow-up registrado para esta cotacao.'],
    };
  }

  const situacao = followUpStatus ? (SITUACOES[followUpStatus] || followUpStatus) : 'Registrado';
  const latencia = typeof horasDeAtraso === 'number' && Number.isFinite(horasDeAtraso)
    ? (horasDeAtraso > 0 ? `+${Math.round(horasDeAtraso)}h de atraso` : 'No prazo')
    : 'Sem prazo registrado';

  return {
    registrado: true,
    situacao,
    latencia,
    linhas: [
      `[REG] Follow-up registrado em ${formatarEnvio(ultimoFollowUpEm)}.`,
      `[REG] Situacao informada pelo agendador: ${situacao}.`,
    ],
  };
}

export const NeuralFollowUpMonitor = ({
  itemName,
  ultimoFollowUpEm,
  followUpStatus,
  horasDeAtraso,
}: {
  supplierName?: string;
  itemName: string;
  lastUpdate?: string;
  ultimoFollowUpEm?: string | null;
  followUpStatus?: string | null;
  horasDeAtraso?: number | null;
}) => {
  const resumo = descreverFollowUp(ultimoFollowUpEm, followUpStatus, horasDeAtraso);

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
            <h3 className="text-xl font-black uppercase tracking-tight text-white">Follow-up de Cotacao</h3>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-1">
              Registro do agendador
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-[9px] font-black uppercase px-4 py-1.5 rounded-full border-white/10 text-zinc-400">
          {resumo.registrado ? 'Follow-up enviado' : 'Sem envio'}
        </Badge>
      </div>

      <div className="space-y-4 relative z-10">
        <div className="p-6 rounded-3xl bg-black/40 border border-white/5 min-h-[140px] flex flex-col">
          <div className="flex-1 space-y-3 font-mono">
            {resumo.linhas.map((log) => (
              <div
                key={log}
                className={cn(
                  "text-[11px] font-medium leading-relaxed",
                  resumo.registrado ? "text-violet-400" : "text-zinc-500"
                )}
              >
                {log}
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Item</p>
                <p className="text-xs font-bold text-zinc-200">{itemName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Latencia</p>
                <p className={cn("text-xs font-bold", resumo.registrado ? "text-zinc-200" : "text-zinc-500")}>
                  {resumo.latencia}
                </p>
              </div>
            </div>

            <Badge variant="outline" className={cn(
              "text-[9px] font-black uppercase px-4 py-1.5 rounded-full",
              resumo.registrado ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/5" : "border-white/10 text-zinc-500"
            )}>
              {resumo.situacao}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};
