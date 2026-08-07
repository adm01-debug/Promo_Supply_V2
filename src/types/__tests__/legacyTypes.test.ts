import { describe, it, expect } from 'vitest';

import { getTipoLabel, getStatusLabel, getStatusColor } from '../legacyTypes';

// ─── getTipoLabel ─────────────────────────────────────────────────────────────

describe('getTipoLabel', () => {
  it('returns "P.E. Liso" for PE_LISO', () => {
    expect(getTipoLabel('PE_LISO')).toBe('P.E. Liso');
  });

  it('returns "Fab. Liso" for FAB_LISO', () => {
    expect(getTipoLabel('FAB_LISO')).toBe('Fab. Liso');
  });

  it('returns "Fab. Personalizado" for FAB_PERSONALIZADO', () => {
    expect(getTipoLabel('FAB_PERSONALIZADO')).toBe('Fab. Personalizado');
  });

  it('all labels are unique', () => {
    const tipos = ['PE_LISO', 'FAB_LISO', 'FAB_PERSONALIZADO'] as const;
    const labels = tipos.map(t => getTipoLabel(t));
    expect(new Set(labels).size).toBe(labels.length);
  });
});

// ─── getStatusLabel ───────────────────────────────────────────────────────────

const ALL_STATUSES = [
  'AGUARDANDO_COTACAO', 'EM_COTACAO', 'FORNECEDOR_SELECIONADO',
  'PEDIDO_GERADO', 'AGUARDANDO_PAGAMENTO', 'PAGO',
  'EM_TRANSITO', 'ENTREGUE', 'REJEITADA', 'CANCELADA',
] as const;

describe('getStatusLabel', () => {
  it('returns non-empty string for every status', () => {
    ALL_STATUSES.forEach(status => {
      const label = getStatusLabel(status);
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    });
  });

  it('AGUARDANDO_COTACAO label is "Aguardando Cotação"', () => {
    expect(getStatusLabel('AGUARDANDO_COTACAO')).toBe('Aguardando Cotação');
  });

  it('EM_COTACAO label is "Em Cotação"', () => {
    expect(getStatusLabel('EM_COTACAO')).toBe('Em Cotação');
  });

  it('FORNECEDOR_SELECIONADO label is "Fornecedor Selecionado"', () => {
    expect(getStatusLabel('FORNECEDOR_SELECIONADO')).toBe('Fornecedor Selecionado');
  });

  it('PEDIDO_GERADO label is "Pedido Gerado"', () => {
    expect(getStatusLabel('PEDIDO_GERADO')).toBe('Pedido Gerado');
  });

  it('ENTREGUE label is "Finalizada"', () => {
    expect(getStatusLabel('ENTREGUE')).toBe('Finalizada');
  });

  it('REJEITADA label is "Rejeitada"', () => {
    expect(getStatusLabel('REJEITADA')).toBe('Rejeitada');
  });

  it('CANCELADA label is "Cancelada"', () => {
    expect(getStatusLabel('CANCELADA')).toBe('Cancelada');
  });

  it('covers all 10 statuses', () => {
    expect(ALL_STATUSES).toHaveLength(10);
  });

  it('all labels are unique', () => {
    const labels = ALL_STATUSES.map(s => getStatusLabel(s));
    expect(new Set(labels).size).toBe(labels.length);
  });
});

// ─── getStatusColor ───────────────────────────────────────────────────────────

describe('getStatusColor', () => {
  it('returns non-empty string for every status', () => {
    ALL_STATUSES.forEach(status => {
      const color = getStatusColor(status);
      expect(typeof color).toBe('string');
      expect(color.length).toBeGreaterThan(0);
    });
  });

  it('all colors start with "bg-"', () => {
    ALL_STATUSES.forEach(status => {
      expect(getStatusColor(status)).toMatch(/^bg-/);
    });
  });

  it('AGUARDANDO_COTACAO uses emerald color', () => {
    expect(getStatusColor('AGUARDANDO_COTACAO')).toContain('emerald');
  });

  it('EM_COTACAO uses yellow color', () => {
    expect(getStatusColor('EM_COTACAO')).toContain('yellow');
  });

  it('REJEITADA uses red color', () => {
    expect(getStatusColor('REJEITADA')).toContain('red');
  });

  it('CANCELADA uses gray color', () => {
    expect(getStatusColor('CANCELADA')).toContain('gray');
  });

  it('ENTREGUE uses green color', () => {
    expect(getStatusColor('ENTREGUE')).toContain('green');
  });

  it('all colors are unique', () => {
    const colors = ALL_STATUSES.map(s => getStatusColor(s));
    expect(new Set(colors).size).toBe(colors.length);
  });
});
