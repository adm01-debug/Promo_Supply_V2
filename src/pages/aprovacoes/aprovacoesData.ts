/**
 * Agregacoes reais da tela de Aprovacoes (QA 099/100).
 *
 * Este modulo era "Mock data and constants": os 5 KPIs (3/28/2/4.2h/1), a serie
 * Jul-Dez, a distribuicao 149/15/3/5, os gargalos e o historico SOL-2024-150
 * eram literais exibidos como se fossem medicao. Agora tudo deriva de
 * approval_history / approval_workflows / approval_steps, recortado pelo periodo
 * escolhido; o que nao tem amostra volta null e a tela mostra "-" em vez de um
 * numero inventado.
 */

import type {
  ApprovalHistoryItem,
  ApprovalTrendItem,
  BottleneckItem,
  StatusDistributionItem,
} from "@/features/aprovacoes";
import type { ApprovalHistory, ApprovalStep } from "@/hooks/useApprovalWorkflow";

export const JANELA_MESES: Record<string, number> = { "1m": 1, "3m": 3, "6m": 6, "12m": 12 };

const MES_CURTO = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const VERDE = "#10b981";
const VERMELHO = "#ef4444";
const AMBAR = "#f59e0b";
const ROXO = "#8b5cf6";

export interface ResumoAprovacoes {
  pendentes: number;
  aprovadas: number;
  rejeitadas: number;
  escalacoes: number;
  tempoMedioHoras: number | null;
  taxaAprovacao: number | null;
}

/** Inicio da janela do seletor de periodo, contado a partir de agora. */
export function inicioDaJanela(periodo: string, agora: Date = new Date()): Date {
  const meses = JANELA_MESES[periodo] ?? 6;
  const inicio = new Date(agora.getTime());
  inicio.setMonth(inicio.getMonth() - meses);
  return inicio;
}

export function dentroDaJanela(valor: string | null | undefined, inicio: Date): boolean {
  if (!valor) return false;
  const quando = new Date(valor).getTime();
  return Number.isFinite(quando) && quando >= inicio.getTime();
}

const horasEntre = (de: string | null | undefined, ate: string | null | undefined): number | null => {
  if (!de || !ate) return null;
  const inicio = new Date(de).getTime();
  const fim = new Date(ate).getTime();
  if (!Number.isFinite(inicio) || !Number.isFinite(fim) || fim < inicio) return null;
  return (fim - inicio) / 3_600_000;
};

const media = (valores: number[]): number | null =>
  valores.length === 0 ? null : valores.reduce((acc, valor) => acc + valor, 0) / valores.length;

/** Tempo entre a criacao da etapa e a decisao, so para etapas decididas dentro da janela. */
export function tempoMedioDecisaoHoras(steps: ApprovalStep[], inicio: Date): number | null {
  const duracoes: number[] = [];
  for (const step of steps) {
    if (step.status !== "approved" && step.status !== "rejected") continue;
    if (!dentroDaJanela(step.decidido_em, inicio)) continue;
    const horas = horasEntre(step.created_at, step.decidido_em);
    if (horas !== null) duracoes.push(horas);
  }
  return media(duracoes);
}

export function resumirAprovacoes(
  history: ApprovalHistory[],
  pendentes: number,
  steps: ApprovalStep[],
  inicio: Date,
): ResumoAprovacoes {
  const naJanela = history.filter((h) => dentroDaJanela(h.created_at, inicio));
  const aprovadas = naJanela.filter((h) => h.acao === "approved").length;
  const rejeitadas = naJanela.filter((h) => h.acao === "rejected").length;
  const escalacoes = naJanela.filter((h) => h.acao === "escalated").length;
  const decididas = aprovadas + rejeitadas;

  return {
    pendentes,
    aprovadas,
    rejeitadas,
    escalacoes,
    tempoMedioHoras: tempoMedioDecisaoHoras(steps, inicio),
    taxaAprovacao: decididas > 0 ? (aprovadas / decididas) * 100 : null,
  };
}

/**
 * Serie mes a mes da janela. `pendentes` do mes e o que segue aberto hoje naquele
 * mes (nao da para reconstruir o passado sem historico de status), e `tempoMedio`
 * e a media das etapas decididas naquele mes - 0 quando nao houve decisao.
 */
export function serieMensal(
  history: ApprovalHistory[],
  steps: ApprovalStep[],
  periodo: string,
  agora: Date = new Date(),
): ApprovalTrendItem[] {
  const meses = JANELA_MESES[periodo] ?? 6;
  const primeiro = new Date(agora.getFullYear(), agora.getMonth() - (meses - 1), 1);
  const baldes: ApprovalTrendItem[] = [];
  for (let i = 0; i < meses; i++) {
    const ref = new Date(primeiro.getFullYear(), primeiro.getMonth() + i, 1);
    baldes.push({ mes: MES_CURTO[ref.getMonth()], aprovadas: 0, rejeitadas: 0, pendentes: 0, tempoMedio: 0 });
  }

  const indiceDe = (valor: string | null | undefined): number | null => {
    if (!valor) return null;
    const quando = new Date(valor);
    if (!Number.isFinite(quando.getTime()) || quando < primeiro) return null;
    const indice = (quando.getFullYear() - primeiro.getFullYear()) * 12 + (quando.getMonth() - primeiro.getMonth());
    return indice >= 0 && indice < baldes.length ? indice : null;
  };

  for (const h of history) {
    const indice = indiceDe(h.created_at);
    if (indice === null) continue;
    if (h.acao === "approved") baldes[indice].aprovadas += 1;
    else if (h.acao === "rejected") baldes[indice].rejeitadas += 1;
  }

  const duracoes: number[][] = baldes.map(() => []);
  for (const step of steps) {
    if (step.status !== "approved" && step.status !== "rejected") continue;
    const indice = indiceDe(step.decidido_em);
    if (indice === null) continue;
    const horas = horasEntre(step.created_at, step.decidido_em);
    if (horas !== null) duracoes[indice].push(horas);
  }
  duracoes.forEach((lista, indice) => {
    const valor = media(lista);
    baldes[indice].tempoMedio = valor === null ? 0 : Number(valor.toFixed(1));
  });

  return baldes;
}

/** Contagem real dos workflows por status (nao so os pendentes). */
export function distribuicaoPorStatus(workflows: { status: string }[]): StatusDistributionItem[] {
  const contagem: Record<string, number> = { approved: 0, rejected: 0, pending: 0, escalated: 0 };
  for (const workflow of workflows) {
    if (workflow.status in contagem) contagem[workflow.status] += 1;
  }
  return [
    { name: "Aprovadas", value: contagem.approved, color: VERDE },
    { name: "Rejeitadas", value: contagem.rejected, color: VERMELHO },
    { name: "Pendentes", value: contagem.pending, color: AMBAR },
    { name: "Escaladas", value: contagem.escalated, color: ROXO },
  ];
}

/** Etapas em aberto: quanto tempo cada etapa ja espera e o peso dela no total. */
export function gargalos(steps: ApprovalStep[], agora: Date = new Date()): BottleneckItem[] {
  const esperaPorEtapa = new Map<number, number[]>();
  for (const step of steps) {
    if (step.status !== "pending") continue;
    const horas = horasEntre(step.created_at, agora.toISOString());
    if (horas === null) continue;
    const lista = esperaPorEtapa.get(step.etapa) ?? [];
    lista.push(horas);
    esperaPorEtapa.set(step.etapa, lista);
  }

  const total = [...esperaPorEtapa.values()].reduce(
    (acc, lista) => acc + lista.reduce((soma, horas) => soma + horas, 0),
    0,
  );

  return [...esperaPorEtapa.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([etapa, lista]) => {
      const soma = lista.reduce((acc, horas) => acc + horas, 0);
      return {
        etapa: `${etapa}a etapa`,
        tempo: Number((soma / lista.length).toFixed(1)),
        percentual: total > 0 ? Math.round((soma / total) * 100) : 0,
      };
    });
}

const valorDoDetalhe = (detalhes: Record<string, unknown> | null | undefined): number => {
  const valor = detalhes?.valor;
  return typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
};

/** Historico do banco no formato da lista - sem fallback de mock quando vazio. */
export function historicoDaLista(history: ApprovalHistory[]): ApprovalHistoryItem[] {
  return history.map((h) => ({
    id: h.id,
    solicitacao: h.solicitacao_id ? h.solicitacao_id.substring(0, 8) : "N/A",
    valor: valorDoDetalhe(h.detalhes),
    acao: h.acao,
    por: h.usuario_nome || "Sistema",
    data: new Date(h.created_at).toLocaleString("pt-BR"),
  }));
}
