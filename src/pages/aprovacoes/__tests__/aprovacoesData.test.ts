import { describe, it, expect } from 'vitest';
import {
  approvalHistory,
  approvalStats,
  approvalTrendData,
  approvalByValueRange,
  approvalByApprover,
  bottleneckData,
  statusDistribution,
  weeklyTrend,
  COLORS,
} from '../aprovacoesData';

// ─── aprovacoesData ───────────────────────────────────────────────────────────

describe('approvalHistory', () => {
  it('has 4 items', () => {
    expect(approvalHistory).toHaveLength(4);
  });

  it('every item has required fields', () => {
    approvalHistory.forEach(item => {
      expect(typeof item.id).toBe('string');
      expect(typeof item.solicitacao).toBe('string');
      expect(typeof item.valor).toBe('number');
      expect(typeof item.acao).toBe('string');
      expect(typeof item.por).toBe('string');
      expect(typeof item.data).toBe('string');
    });
  });

  it('all ids are unique', () => {
    const ids = approvalHistory.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all solicitacao references follow SOL-YYYY-NNN pattern', () => {
    approvalHistory.forEach(item => {
      expect(item.solicitacao).toMatch(/^SOL-\d{4}-\d+$/);
    });
  });

  it('all valores are positive numbers', () => {
    approvalHistory.forEach(item => {
      expect(item.valor).toBeGreaterThan(0);
    });
  });
});

describe('approvalStats', () => {
  it('has all required stat keys', () => {
    expect(typeof approvalStats.pendentes).toBe('number');
    expect(typeof approvalStats.aprovadasMes).toBe('number');
    expect(typeof approvalStats.rejeitadasMes).toBe('number');
    expect(typeof approvalStats.tempoMedioAprovacao).toBe('string');
    expect(typeof approvalStats.escalacoesMes).toBe('number');
  });

  it('pendentes is a non-negative integer', () => {
    expect(approvalStats.pendentes).toBeGreaterThanOrEqual(0);
  });

  it('tempoMedioAprovacao ends with "h"', () => {
    expect(approvalStats.tempoMedioAprovacao).toMatch(/h$/);
  });
});

describe('approvalTrendData', () => {
  it('has 6 months of data', () => {
    expect(approvalTrendData).toHaveLength(6);
  });

  it('every item has mes, aprovadas, rejeitadas, pendentes, tempoMedio', () => {
    approvalTrendData.forEach(item => {
      expect(typeof item.mes).toBe('string');
      expect(typeof item.aprovadas).toBe('number');
      expect(typeof item.rejeitadas).toBe('number');
      expect(typeof item.pendentes).toBe('number');
      expect(typeof item.tempoMedio).toBe('number');
    });
  });

  it('all tempoMedio values are positive', () => {
    approvalTrendData.forEach(item => {
      expect(item.tempoMedio).toBeGreaterThan(0);
    });
  });

  it('last month is Dez', () => {
    expect(approvalTrendData[approvalTrendData.length - 1].mes).toBe('Dez');
  });
});

describe('approvalByValueRange', () => {
  it('has 5 value ranges', () => {
    expect(approvalByValueRange).toHaveLength(5);
  });

  it('every item has faixa, quantidade, tempoMedio', () => {
    approvalByValueRange.forEach(item => {
      expect(typeof item.faixa).toBe('string');
      expect(typeof item.quantidade).toBe('number');
      expect(typeof item.tempoMedio).toBe('number');
    });
  });

  it('higher value ranges have higher average processing times', () => {
    const times = approvalByValueRange.map(i => i.tempoMedio);
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThan(times[i - 1]);
    }
  });
});

describe('approvalByApprover', () => {
  it('has 4 approvers', () => {
    expect(approvalByApprover).toHaveLength(4);
  });

  it('every item has nome, aprovadas, rejeitadas, tempoMedio', () => {
    approvalByApprover.forEach(item => {
      expect(typeof item.nome).toBe('string');
      expect(typeof item.aprovadas).toBe('number');
      expect(typeof item.rejeitadas).toBe('number');
      expect(typeof item.tempoMedio).toBe('number');
    });
  });

  it('all approver names are non-empty', () => {
    approvalByApprover.forEach(item => {
      expect(item.nome.length).toBeGreaterThan(0);
    });
  });
});

describe('bottleneckData', () => {
  it('has 4 bottleneck stages', () => {
    expect(bottleneckData).toHaveLength(4);
  });

  it('percentuals sum to 100', () => {
    const total = bottleneckData.reduce((sum, item) => sum + item.percentual, 0);
    expect(total).toBe(100);
  });

  it('every item has etapa, tempo, percentual', () => {
    bottleneckData.forEach(item => {
      expect(typeof item.etapa).toBe('string');
      expect(typeof item.tempo).toBe('number');
      expect(typeof item.percentual).toBe('number');
    });
  });
});

describe('statusDistribution', () => {
  it('has 4 status entries', () => {
    expect(statusDistribution).toHaveLength(4);
  });

  it('every item has name, value, color', () => {
    statusDistribution.forEach(item => {
      expect(typeof item.name).toBe('string');
      expect(typeof item.value).toBe('number');
      expect(typeof item.color).toBe('string');
    });
  });

  it('all color values are hex colors', () => {
    statusDistribution.forEach(item => {
      expect(item.color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it('all values are positive', () => {
    statusDistribution.forEach(item => {
      expect(item.value).toBeGreaterThan(0);
    });
  });
});

describe('weeklyTrend', () => {
  it('has 5 days (work week)', () => {
    expect(weeklyTrend).toHaveLength(5);
  });

  it('every item has dia, quantidade, tempoMedio', () => {
    weeklyTrend.forEach(item => {
      expect(typeof item.dia).toBe('string');
      expect(typeof item.quantidade).toBe('number');
      expect(typeof item.tempoMedio).toBe('number');
    });
  });

  it('days are Mon-Fri in Portuguese abbreviations', () => {
    const days = weeklyTrend.map(i => i.dia);
    expect(days).toEqual(['Seg', 'Ter', 'Qua', 'Qui', 'Sex']);
  });
});

describe('COLORS', () => {
  it('has 4 colors', () => {
    expect(COLORS).toHaveLength(4);
  });

  it('all colors are hex strings', () => {
    COLORS.forEach(color => {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });
});
