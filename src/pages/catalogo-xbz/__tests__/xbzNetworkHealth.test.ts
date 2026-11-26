import { describe, expect, it } from 'vitest';
import {
  evaluateXbzNetworkHealth,
  MIN_SAMPLE,
  TARGET_RATIO,
  WARN_RATIO,
} from '../xbzNetworkHealth';

describe('evaluateXbzNetworkHealth', () => {
  it('permanece neutro sem amostra suficiente', () => {
    const h = evaluateXbzNetworkHealth({ network: 1, cacheHits: 0, coalesced: 0 });
    expect(h.level).toBe('collecting');
    expect(h.total).toBeLessThan(MIN_SAMPLE);
  });

  it('sinaliza crítico abaixo do mínimo', () => {
    const h = evaluateXbzNetworkHealth({ network: 19, cacheHits: 1, coalesced: 0 });
    expect(h.ratio).toBeLessThan(WARN_RATIO);
    expect(h.level).toBe('below');
  });

  it('sinaliza atenção entre mínimo e meta', () => {
    const h = evaluateXbzNetworkHealth({ network: 6, cacheHits: 4, coalesced: 0 });
    expect(h.ratio).toBeGreaterThanOrEqual(WARN_RATIO);
    expect(h.ratio).toBeLessThan(TARGET_RATIO);
    expect(h.level).toBe('warning');
  });

  it('sinaliza saudável na meta ou acima', () => {
    const h = evaluateXbzNetworkHealth({ network: 4, cacheHits: 4, coalesced: 4 });
    expect(h.level).toBe('healthy');
    expect(h.saved).toBe(8);
  });

  it('não divide por zero sem chamadas', () => {
    const h = evaluateXbzNetworkHealth({ network: 0, cacheHits: 0, coalesced: 0 });
    expect(h.ratio).toBe(0);
    expect(h.level).toBe('collecting');
  });
});
