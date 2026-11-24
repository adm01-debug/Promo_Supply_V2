import { calcularSLA } from "@/pages/acompanhamento/AcompanhamentoHelpers";

/**
 * Saude do prazo de um pedido para a coluna da lista (QA 103, UI-06).
 *
 * Antes a coluna era desenhada a partir do indice da linha (`index % 3`): a
 * cada terceiro pedido a barra virava 40% ambar com o rotulo ATENCAO, sem
 * olhar prazo, status ou data. Aqui o estado vem do dado: a mesma `calcularSLA`
 * que a tela de Acompanhamento usa, e o preenchimento da barra e o quanto do
 * prazo (emissao -> previsao) ja foi consumido. Sem previsao nao ha medida -
 * devolve `sem_prazo` e barra vazia em vez de inventar um percentual.
 */

export type SaudeDoPrazoStatus = 'entregue' | 'atrasado' | 'critico' | 'atencao' | 'no_prazo' | 'sem_prazo';

export interface SaudeDoPrazo {
  status: SaudeDoPrazoStatus;
  rotulo: string;
  detalhe: string;
  /** % do prazo ja consumido - 100 quando estourou, 0 quando nao da para medir. */
  largura: number;
  barra: string;
  texto: string;
}

const APRESENTACAO: Record<SaudeDoPrazoStatus, { rotulo: string; barra: string; texto: string }> = {
  entregue: { rotulo: 'ENTREGUE', barra: 'bg-emerald-500', texto: 'text-emerald-400' },
  no_prazo: { rotulo: 'NO PRAZO', barra: 'bg-emerald-500', texto: 'text-emerald-400' },
  atencao: { rotulo: 'ATENCAO', barra: 'bg-amber-500', texto: 'text-amber-400' },
  critico: { rotulo: 'CRITICO', barra: 'bg-red-500', texto: 'text-red-400' },
  atrasado: { rotulo: 'ATRASADO', barra: 'bg-red-500', texto: 'text-red-400' },
  sem_prazo: { rotulo: 'SEM PRAZO', barra: 'bg-zinc-600', texto: 'text-zinc-500' },
};

const paraData = (valor: string | null | undefined): number | null => {
  if (!valor) return null;
  const quando = new Date(valor).getTime();
  return Number.isFinite(quando) ? quando : null;
};

const montar = (status: SaudeDoPrazoStatus, largura: number, detalhe: string): SaudeDoPrazo => ({
  status,
  largura,
  detalhe,
  ...APRESENTACAO[status],
});

/** % do prazo consumido entre a emissao e a previsao; 0 quando nao da para medir. */
export const prazoConsumido = (
  dataEmissao: string | null | undefined,
  dataPrevisao: string | null | undefined,
  agora: Date = new Date(),
): number => {
  const emissao = paraData(dataEmissao);
  const previsao = paraData(dataPrevisao);
  if (emissao === null || previsao === null || previsao <= emissao) return 0;
  const consumido = ((agora.getTime() - emissao) / (previsao - emissao)) * 100;
  return Math.min(100, Math.max(5, Math.round(consumido)));
};

export const saudeDoPrazo = (
  pedido: { status?: string | null; data_emissao?: string | null; data_previsao?: string | null },
): SaudeDoPrazo => {
  const status = (pedido.status ?? '').toLowerCase();

  if (status === 'entregue') {
    return montar('entregue', 100, 'Entregue');
  }
  if (!paraData(pedido.data_previsao)) {
    return montar('sem_prazo', 0, 'Pedido sem data de previsao');
  }

  const sla = calcularSLA(pedido.data_previsao as string, status.toUpperCase());
  const largura = sla.status === 'atrasado' ? 100 : prazoConsumido(pedido.data_emissao, pedido.data_previsao);
  const statusDaSaude: SaudeDoPrazoStatus = sla.status === 'entregue' ? 'entregue' : sla.status;

  return montar(statusDaSaude, largura, sla.label);
};
