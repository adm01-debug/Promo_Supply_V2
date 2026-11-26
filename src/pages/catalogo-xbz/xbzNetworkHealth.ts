import type { XbzNetworkStats } from '@/hooks/useXbzIntegration';

/**
 * Onda 145 — avaliação da eficiência da camada de rede XBZ.
 *
 * A razão de economia (`saved / total`) só é estatisticamente confiável a
 * partir de um volume mínimo de chamadas; abaixo disso o painel exibe estado
 * neutro ("coletando") em vez de alarme falso.
 */

/** Volume mínimo de chamadas antes de classificar a eficiência. */
export const MIN_SAMPLE = 10;
/** Abaixo disso, o cache/coalescing não está entregando o esperado. */
export const WARN_RATIO = 0.3;
/** Meta operacional de economia. */
export const TARGET_RATIO = 0.5;

export type XbzNetworkLevel = 'collecting' | 'below' | 'warning' | 'healthy';

export interface XbzNetworkHealth {
  level: XbzNetworkLevel;
  /** Total de chamadas contabilizadas (rede + evitadas). */
  total: number;
  /** Chamadas evitadas (cache + coalescing). */
  saved: number;
  /** Razão de economia entre 0 e 1. */
  ratio: number;
  /** Mensagem pronta para exibição (pt-BR). */
  message: string;
}

export function evaluateXbzNetworkHealth(stats: XbzNetworkStats): XbzNetworkHealth {
  const saved = stats.cacheHits + stats.coalesced;
  const total = saved + stats.network;
  const ratio = total === 0 ? 0 : saved / total;

  if (total < MIN_SAMPLE) {
    return {
      level: 'collecting',
      total,
      saved,
      ratio,
      message: `Coletando amostras (${total}/${MIN_SAMPLE} chamadas).`,
    };
  }

  const pct = Math.round(ratio * 100);
  if (ratio < WARN_RATIO) {
    return {
      level: 'below',
      total,
      saved,
      ratio,
      message: `Economia de ${pct}% está abaixo do mínimo de ${Math.round(WARN_RATIO * 100)}% — risco de rate limit na XBZ.`,
    };
  }
  if (ratio < TARGET_RATIO) {
    return {
      level: 'warning',
      total,
      saved,
      ratio,
      message: `Economia de ${pct}%, ainda abaixo da meta de ${Math.round(TARGET_RATIO * 100)}%.`,
    };
  }
  return {
    level: 'healthy',
    total,
    saved,
    ratio,
    message: `Economia de ${pct}% das chamadas ao portal XBZ.`,
  };
}
