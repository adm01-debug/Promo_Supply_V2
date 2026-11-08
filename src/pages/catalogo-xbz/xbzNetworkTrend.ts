/**
 * Onda 146 — detecção de tendência da eficiência de rede XBZ.
 *
 * O nível instantâneo (`xbzNetworkHealth`) só dispara alerta depois que a razão
 * de economia já caiu. Aqui olhamos a série temporal das amostras para detectar
 * degradação **antes** do rompimento do limiar, comparando a média da primeira
 * metade da janela com a da segunda metade.
 */

/** Tamanho máximo da janela deslizante de amostras. */
export const TREND_WINDOW = 12;
/** Mínimo de amostras para classificar tendência (metade cheia de cada lado). */
export const TREND_MIN_SAMPLES = 6;
/** Variação mínima (em pontos de razão) para considerar movimento real. */
export const TREND_DELTA = 0.05;

export interface XbzTrendSample {
  /** Razão de economia entre 0 e 1 no instante da amostra. */
  ratio: number;
  /** Total de chamadas contabilizadas na amostra (monotônico). */
  total: number;
}

export type XbzTrendDirection = 'unknown' | 'degrading' | 'stable' | 'improving';

export interface XbzNetworkTrend {
  direction: XbzTrendDirection;
  /** Diferença entre média recente e média anterior (-1..1). */
  delta: number;
  /** Amostras consideradas. */
  samples: number;
  /** Mensagem pronta para exibição (pt-BR). */
  message: string;
}

const mean = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((acc, v) => acc + v, 0) / values.length;

const clampRatio = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
};

/**
 * Adiciona uma amostra à janela deslizante, ignorando leituras duplicadas
 * (mesmo `total`), que ocorrem quando o painel faz polling sem novas chamadas.
 */
export function pushTrendSample(
  window: readonly XbzTrendSample[],
  sample: XbzTrendSample,
): XbzTrendSample[] {
  const normalized: XbzTrendSample = {
    ratio: clampRatio(sample.ratio),
    total: Number.isFinite(sample.total) ? Math.max(0, Math.trunc(sample.total)) : 0,
  };
  const last = window[window.length - 1];
  if (last && last.total === normalized.total) {
    return [...window];
  }
  // Reset de contadores (total regride) invalida a janela anterior.
  if (last && normalized.total < last.total) {
    return [normalized];
  }
  const next = [...window, normalized];
  return next.length > TREND_WINDOW ? next.slice(next.length - TREND_WINDOW) : next;
}

export function evaluateXbzNetworkTrend(window: readonly XbzTrendSample[]): XbzNetworkTrend {
  const samples = window.length;
  if (samples < TREND_MIN_SAMPLES) {
    return {
      direction: 'unknown',
      delta: 0,
      samples,
      message: `Tendência indisponível (${samples}/${TREND_MIN_SAMPLES} amostras).`,
    };
  }

  const half = Math.floor(samples / 2);
  const previous = mean(window.slice(0, half).map((s) => s.ratio));
  const recent = mean(window.slice(samples - half).map((s) => s.ratio));
  const delta = recent - previous;
  const pts = Math.round(Math.abs(delta) * 100);

  if (delta <= -TREND_DELTA) {
    return {
      direction: 'degrading',
      delta,
      samples,
      message: `Eficiência caindo ${pts} p.p. na janela recente — investigar invalidações de cache.`,
    };
  }
  if (delta >= TREND_DELTA) {
    return {
      direction: 'improving',
      delta,
      samples,
      message: `Eficiência subindo ${pts} p.p. na janela recente.`,
    };
  }
  return {
    direction: 'stable',
    delta,
    samples,
    message: 'Eficiência estável na janela recente.',
  };
}
