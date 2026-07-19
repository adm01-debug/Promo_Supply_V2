import { describe, it, expect } from 'vitest';
import { getTipoLabel, buildWhatsAppMessage, buildEmailMessage } from '../gerarOrdemHelpers';

vi.mock('@/lib/utils', () => ({
  formatCurrency: (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`,
}));

const makeSupplier = (overrides = {}) => ({
  nome_fantasia: 'Acme Ltda',
  razao_social: 'Acme Comércio e Distribuição Ltda',
  ...overrides,
});

const makeOrder = (overrides = {}) => ({
  produto: 'Canetas Personalizadas',
  quantidadeReal: 500,
  valorUnitario: 2.5,
  prazoEntrega: '2024-12-31',
  tipo: 'produto',
  ...overrides,
});

// ─── getTipoLabel ─────────────────────────────────────────────────────────────

describe('getTipoLabel', () => {
  const cases: [string, string][] = [
    ['produto', 'Produto'],
    ['servico', 'Serviço'],
    ['material', 'Material'],
    ['pe_liso', 'P.E. Liso'],
    ['fabricacao_liso', 'Fab. Liso'],
    ['fabricacao_personalizado', 'Fab. Personalizado'],
    ['PE_LISO', 'P.E. Liso'],
    ['FAB_LISO', 'Fab. Liso'],
    ['FAB_PERSONALIZADO', 'Fab. Personalizado'],
  ];

  it.each(cases)('maps %s → %s', (tipo, expected) => {
    expect(getTipoLabel(tipo)).toBe(expected);
  });

  it('returns the raw value for unknown tipo', () => {
    expect(getTipoLabel('CUSTOM_TYPE')).toBe('CUSTOM_TYPE');
  });
});

// ─── buildWhatsAppMessage ─────────────────────────────────────────────────────

describe('buildWhatsAppMessage', () => {
  it('includes the order number', () => {
    const msg = buildWhatsAppMessage(makeSupplier(), makeOrder(), 'OC-001', 1250, 0, 0, '');
    expect(msg).toContain('OC-001');
  });

  it('uses nome_fantasia when available', () => {
    const msg = buildWhatsAppMessage(makeSupplier(), makeOrder(), 'OC-001', 1250, 0, 0, '');
    expect(msg).toContain('Acme Ltda');
  });

  it('falls back to razao_social when nome_fantasia is empty', () => {
    const supplier = makeSupplier({ nome_fantasia: '' });
    const msg = buildWhatsAppMessage(supplier, makeOrder(), 'OC-001', 1250, 0, 0, '');
    expect(msg).toContain('Acme Comércio e Distribuição Ltda');
  });

  it('includes the product name', () => {
    const msg = buildWhatsAppMessage(makeSupplier(), makeOrder(), 'OC-001', 1250, 0, 0, '');
    expect(msg).toContain('Canetas Personalizadas');
  });

  it('includes the quantity', () => {
    const msg = buildWhatsAppMessage(makeSupplier(), makeOrder(), 'OC-001', 1250, 0, 0, '');
    expect(msg).toContain('500');
  });

  it('shows Grátis when frete is 0', () => {
    const msg = buildWhatsAppMessage(makeSupplier(), makeOrder(), 'OC-001', 1250, 0, 0, '');
    expect(msg).toContain('Grátis');
  });

  it('shows frete value when frete > 0', () => {
    const msg = buildWhatsAppMessage(makeSupplier(), makeOrder(), 'OC-001', 1400, 150, 0, '');
    expect(msg).toContain('150.00');
  });

  it('includes discount line when desconto > 0', () => {
    const msg = buildWhatsAppMessage(makeSupplier(), makeOrder(), 'OC-001', 1150, 0, 100, '');
    expect(msg).toContain('Desconto');
  });

  it('omits discount line when desconto is 0', () => {
    const msg = buildWhatsAppMessage(makeSupplier(), makeOrder(), 'OC-001', 1250, 0, 0, '');
    expect(msg).not.toContain('Desconto');
  });

  it('includes observacoes when provided', () => {
    const msg = buildWhatsAppMessage(makeSupplier(), makeOrder(), 'OC-001', 1250, 0, 0, 'Urgente!');
    expect(msg).toContain('Urgente!');
  });

  it('omits observacoes line when empty', () => {
    const msg = buildWhatsAppMessage(makeSupplier(), makeOrder(), 'OC-001', 1250, 0, 0, '');
    expect(msg).not.toContain('Observações');
  });

  it('returns a non-empty string', () => {
    const msg = buildWhatsAppMessage(makeSupplier(), makeOrder(), 'OC-001', 1250, 0, 0, '');
    expect(msg.length).toBeGreaterThan(0);
  });
});

// ─── buildEmailMessage ────────────────────────────────────────────────────────

describe('buildEmailMessage', () => {
  it('returns an object with assunto and corpo', () => {
    const result = buildEmailMessage(makeOrder(), 'OC-001', 1250, 1250, 0, 0, '');
    expect(result).toHaveProperty('assunto');
    expect(result).toHaveProperty('corpo');
  });

  it('includes order number in assunto', () => {
    const { assunto } = buildEmailMessage(makeOrder(), 'OC-001', 1250, 1250, 0, 0, '');
    expect(assunto).toContain('OC-001');
  });

  it('includes product name in assunto', () => {
    const { assunto } = buildEmailMessage(makeOrder(), 'OC-001', 1250, 1250, 0, 0, '');
    expect(assunto).toContain('Canetas Personalizadas');
  });

  it('includes product name in corpo', () => {
    const { corpo } = buildEmailMessage(makeOrder(), 'OC-001', 1250, 1250, 0, 0, '');
    expect(corpo).toContain('Canetas Personalizadas');
  });

  it('includes quantity in corpo', () => {
    const { corpo } = buildEmailMessage(makeOrder(), 'OC-001', 1250, 1250, 0, 0, '');
    expect(corpo).toContain('500');
  });

  it('shows Grátis when frete is 0', () => {
    const { corpo } = buildEmailMessage(makeOrder(), 'OC-001', 1250, 1250, 0, 0, '');
    expect(corpo).toContain('Grátis');
  });

  it('shows frete value when frete > 0', () => {
    const { corpo } = buildEmailMessage(makeOrder(), 'OC-001', 1250, 1400, 150, 0, '');
    expect(corpo).toContain('150.00');
  });

  it('includes desconto line when desconto > 0', () => {
    const { corpo } = buildEmailMessage(makeOrder(), 'OC-001', 1350, 1250, 0, 100, '');
    expect(corpo).toContain('Desconto');
  });

  it('omits desconto line when 0', () => {
    const { corpo } = buildEmailMessage(makeOrder(), 'OC-001', 1250, 1250, 0, 0, '');
    expect(corpo).not.toContain('Desconto');
  });

  it('includes observacoes section when provided', () => {
    const { corpo } = buildEmailMessage(makeOrder(), 'OC-001', 1250, 1250, 0, 0, 'Nota fiscal obrigatória');
    expect(corpo).toContain('Nota fiscal obrigatória');
  });

  it('omits OBSERVAÇÕES section when empty', () => {
    const { corpo } = buildEmailMessage(makeOrder(), 'OC-001', 1250, 1250, 0, 0, '');
    expect(corpo).not.toContain('OBSERVAÇÕES');
  });

  it('includes tipo label for the order type', () => {
    const { corpo } = buildEmailMessage(makeOrder({ tipo: 'servico' }), 'OC-001', 1250, 1250, 0, 0, '');
    expect(corpo).toContain('Serviço');
  });
});
