import { describe, it, expect } from 'vitest';
import {
  evaluateXbzNetworkTrend,
  pushTrendSample,
  TREND_MIN_SAMPLES,
  TREND_WINDOW,
  type XbzTrendSample,
} from '../xbzNetworkTrend';

const build = (ratios: number[]): XbzTrendSample[] =>
  ratios.map((ratio, i) => ({ ratio, total: (i + 1) * 10 }));

describe('pushTrendSample', () => {
  it('ignora leituras duplicadas (mesmo total)', () => {
    const w = pushTrendSample([{ ratio: 0.5, total: 10 }], { ratio: 0.9, total: 10 });
    expect(w).toHaveLength(1);
    expect(w[0].ratio).toBe(0.5);
  });

  it('reinicia a janela quando os contadores são zerados', () => {
    const w = pushTrendSample(build([0.8, 0.7, 0.6]), { ratio: 0, total: 0 });
    expect(w).toEqual([{ ratio: 0, total: 0 }]);
  });

  it('respeita o tamanho máximo da janela', () => {
    let w: XbzTrendSample[] = [];
    for (let i = 1; i <= TREND_WINDOW + 5; i += 1) {
      w = pushTrendSample(w, { ratio: 0.5, total: i });
    }
    expect(w).toHaveLength(TREND_WINDOW);
    expect(w[w.length - 1].total).toBe(TREND_WINDOW + 5);
  });

  it('normaliza razões fora do intervalo e totais inválidos', () => {
    const w = pushTrendSample([], { ratio: 1.8, total: Number.NaN });
    expect(w[0]).toEqual({ ratio: 1, total: 0 });
  });
});

describe('evaluateXbzNetworkTrend', () => {
  it('retorna unknown antes do mínimo de amostras', () => {
    const t = evaluateXbzNetworkTrend(build([0.9, 0.8]));
    expect(t.direction).toBe('unknown');
    expect(t.message).toContain(`/${TREND_MIN_SAMPLES}`);
  });

  it('detecta degradação', () => {
    const t = evaluateXbzNetworkTrend(build([0.9, 0.9, 0.9, 0.5, 0.4, 0.4]));
    expect(t.direction).toBe('degrading');
    expect(t.delta).toBeLessThan(0);
    expect(t.message).toContain('caindo');
  });

  it('detecta melhora', () => {
    const t = evaluateXbzNetworkTrend(build([0.2, 0.2, 0.3, 0.7, 0.8, 0.9]));
    expect(t.direction).toBe('improving');
  });

  it('classifica variação pequena como estável', () => {
    const t = evaluateXbzNetworkTrend(build([0.6, 0.61, 0.6, 0.62, 0.6, 0.61]));
    expect(t.direction).toBe('stable');
  });
});
