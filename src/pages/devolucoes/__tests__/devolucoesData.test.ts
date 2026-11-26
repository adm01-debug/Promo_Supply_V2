import { describe, it, expect, vi } from 'vitest';

vi.mock('lucide-react', () => ({
  Clock: { displayName: 'Clock' },
  AlertTriangle: { displayName: 'AlertTriangle' },
  CheckCircle2: { displayName: 'CheckCircle2' },
  Truck: { displayName: 'Truck' },
  Package: { displayName: 'Package' },
  CreditCard: { displayName: 'CreditCard' },
  X: { displayName: 'X' },
}));

import { STATUS_MAP, CREDITO_STATUS_MAP } from '../devolucoesData';

// ─── devolucoesData ───────────────────────────────────────────────────────────

describe('STATUS_MAP', () => {
  const EXPECTED_KEYS = [
    'rascunho', 'solicitada', 'aprovada', 'em_transito',
    'recebida_fornecedor', 'credito_emitido', 'reposicao_enviada',
    'concluida', 'rejeitada', 'cancelada',
  ];

  it('has exactly 10 status keys', () => {
    expect(Object.keys(STATUS_MAP)).toHaveLength(10);
  });

  it('covers all expected status keys', () => {
    EXPECTED_KEYS.forEach(key => {
      expect(STATUS_MAP[key]).toBeDefined();
    });
  });

  it('every entry has a non-empty label string', () => {
    EXPECTED_KEYS.forEach(key => {
      expect(typeof STATUS_MAP[key].label).toBe('string');
      expect(STATUS_MAP[key].label.length).toBeGreaterThan(0);
    });
  });

  it('every entry has a non-empty color string', () => {
    EXPECTED_KEYS.forEach(key => {
      expect(typeof STATUS_MAP[key].color).toBe('string');
      expect(STATUS_MAP[key].color.length).toBeGreaterThan(0);
    });
  });

  it('every entry has a defined icon', () => {
    EXPECTED_KEYS.forEach(key => {
      expect(STATUS_MAP[key].icon).toBeDefined();
    });
  });

  it('rascunho has label "Rascunho"', () => {
    expect(STATUS_MAP.rascunho.label).toBe('Rascunho');
  });

  it('solicitada has label "Solicitada"', () => {
    expect(STATUS_MAP.solicitada.label).toBe('Solicitada');
  });

  it('aprovada has label "Aprovada"', () => {
    expect(STATUS_MAP.aprovada.label).toBe('Aprovada');
  });

  it('em_transito has label "Em Trânsito"', () => {
    expect(STATUS_MAP.em_transito.label).toBe('Em Trânsito');
  });

  it('recebida_fornecedor has label "Recebida"', () => {
    expect(STATUS_MAP.recebida_fornecedor.label).toBe('Recebida');
  });

  it('credito_emitido has label "Crédito Emitido"', () => {
    expect(STATUS_MAP.credito_emitido.label).toBe('Crédito Emitido');
  });

  it('reposicao_enviada has label "Reposição Enviada"', () => {
    expect(STATUS_MAP.reposicao_enviada.label).toBe('Reposição Enviada');
  });

  it('concluida has label "Concluída"', () => {
    expect(STATUS_MAP.concluida.label).toBe('Concluída');
  });

  it('rejeitada has label "Rejeitada"', () => {
    expect(STATUS_MAP.rejeitada.label).toBe('Rejeitada');
  });

  it('cancelada has label "Cancelada"', () => {
    expect(STATUS_MAP.cancelada.label).toBe('Cancelada');
  });

  it('rascunho uses Clock icon', () => {
    expect(STATUS_MAP.rascunho.icon).toEqual({ displayName: 'Clock' });
  });

  it('solicitada uses AlertTriangle icon', () => {
    expect(STATUS_MAP.solicitada.icon).toEqual({ displayName: 'AlertTriangle' });
  });

  it('em_transito uses Truck icon', () => {
    expect(STATUS_MAP.em_transito.icon).toEqual({ displayName: 'Truck' });
  });

  it('recebida_fornecedor uses Package icon', () => {
    expect(STATUS_MAP.recebida_fornecedor.icon).toEqual({ displayName: 'Package' });
  });

  it('credito_emitido uses CreditCard icon', () => {
    expect(STATUS_MAP.credito_emitido.icon).toEqual({ displayName: 'CreditCard' });
  });

  it('rejeitada uses X icon', () => {
    expect(STATUS_MAP.rejeitada.icon).toEqual({ displayName: 'X' });
  });

  it('cancelada uses X icon', () => {
    expect(STATUS_MAP.cancelada.icon).toEqual({ displayName: 'X' });
  });

  it('aprovada and concluida share CheckCircle2 icon', () => {
    expect(STATUS_MAP.aprovada.icon).toEqual({ displayName: 'CheckCircle2' });
    expect(STATUS_MAP.concluida.icon).toEqual({ displayName: 'CheckCircle2' });
  });

  it('em_transito and reposicao_enviada share Truck icon', () => {
    expect(STATUS_MAP.em_transito.icon).toEqual({ displayName: 'Truck' });
    expect(STATUS_MAP.reposicao_enviada.icon).toEqual({ displayName: 'Truck' });
  });
});

describe('CREDITO_STATUS_MAP', () => {
  const EXPECTED_KEYS = ['ativo', 'utilizado', 'expirado', 'cancelado'];

  it('has exactly 4 status keys', () => {
    expect(Object.keys(CREDITO_STATUS_MAP)).toHaveLength(4);
  });

  it('covers all expected keys', () => {
    EXPECTED_KEYS.forEach(key => {
      expect(CREDITO_STATUS_MAP[key]).toBeDefined();
    });
  });

  it('every entry has a non-empty label string', () => {
    EXPECTED_KEYS.forEach(key => {
      expect(typeof CREDITO_STATUS_MAP[key].label).toBe('string');
      expect(CREDITO_STATUS_MAP[key].label.length).toBeGreaterThan(0);
    });
  });

  it('every entry has a non-empty color string', () => {
    EXPECTED_KEYS.forEach(key => {
      expect(typeof CREDITO_STATUS_MAP[key].color).toBe('string');
      expect(CREDITO_STATUS_MAP[key].color.length).toBeGreaterThan(0);
    });
  });

  it('ativo has label "Ativo"', () => {
    expect(CREDITO_STATUS_MAP.ativo.label).toBe('Ativo');
  });

  it('utilizado has label "Utilizado"', () => {
    expect(CREDITO_STATUS_MAP.utilizado.label).toBe('Utilizado');
  });

  it('expirado has label "Expirado"', () => {
    expect(CREDITO_STATUS_MAP.expirado.label).toBe('Expirado');
  });

  it('cancelado has label "Cancelado"', () => {
    expect(CREDITO_STATUS_MAP.cancelado.label).toBe('Cancelado');
  });

  it('ativo color uses success token', () => {
    expect(CREDITO_STATUS_MAP.ativo.color).toContain('success');
  });

  it('expirado color uses danger token', () => {
    expect(CREDITO_STATUS_MAP.expirado.color).toContain('danger');
  });

  it('utilizado and cancelado share muted color', () => {
    expect(CREDITO_STATUS_MAP.utilizado.color).toContain('muted');
    expect(CREDITO_STATUS_MAP.cancelado.color).toContain('muted');
  });
});
