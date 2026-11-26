import { describe, it, expect } from 'vitest';
import { iconesPorEtapa, statusColors } from '../timelineConfig';

vi.mock('lucide-react', () => ({
  Check: {},
  Package: {},
  CreditCard: {},
  Truck: {},
  MapPin: {},
  CheckCircle2: {},
  FileText: {},
}));

// ─── iconesPorEtapa ───────────────────────────────────────────────────────────

describe('iconesPorEtapa', () => {
  it('has 10 entries', () => {
    expect(Object.keys(iconesPorEtapa)).toHaveLength(10);
  });

  it('includes solicitacao key', () => {
    expect(iconesPorEtapa).toHaveProperty('solicitacao');
  });

  it('includes aprovacao key', () => {
    expect(iconesPorEtapa).toHaveProperty('aprovacao');
  });

  it('includes cotacao key', () => {
    expect(iconesPorEtapa).toHaveProperty('cotacao');
  });

  it('includes selecao key', () => {
    expect(iconesPorEtapa).toHaveProperty('selecao');
  });

  it('includes pedido key', () => {
    expect(iconesPorEtapa).toHaveProperty('pedido');
  });

  it('includes pagamento key', () => {
    expect(iconesPorEtapa).toHaveProperty('pagamento');
  });

  it('includes preparacao key', () => {
    expect(iconesPorEtapa).toHaveProperty('preparacao');
  });

  it('includes transito key', () => {
    expect(iconesPorEtapa).toHaveProperty('transito');
  });

  it('includes coleta key', () => {
    expect(iconesPorEtapa).toHaveProperty('coleta');
  });

  it('includes entregue key', () => {
    expect(iconesPorEtapa).toHaveProperty('entregue');
  });

  it('all values are truthy (icon components)', () => {
    Object.values(iconesPorEtapa).forEach(icon => {
      expect(icon).toBeTruthy();
    });
  });
});

// ─── statusColors ─────────────────────────────────────────────────────────────

describe('statusColors', () => {
  const statuses = ['concluido', 'atual', 'pendente', 'erro'] as const;

  it('has 4 status entries', () => {
    expect(Object.keys(statusColors)).toHaveLength(4);
  });

  it.each(statuses)('has entry for %s', (status) => {
    expect(statusColors).toHaveProperty(status);
  });

  it('each entry has bg, border, text, icon, line, glow properties', () => {
    statuses.forEach(s => {
      expect(typeof statusColors[s].bg).toBe('string');
      expect(typeof statusColors[s].border).toBe('string');
      expect(typeof statusColors[s].text).toBe('string');
      expect(typeof statusColors[s].icon).toBe('string');
      expect(typeof statusColors[s].line).toBe('string');
      expect(typeof statusColors[s].glow).toBe('string');
    });
  });

  it('concluido uses success color tokens', () => {
    expect(statusColors.concluido.bg).toContain('success');
    expect(statusColors.concluido.border).toContain('success');
  });

  it('atual uses primary color tokens', () => {
    expect(statusColors.atual.bg).toContain('primary');
    expect(statusColors.atual.border).toContain('primary');
  });

  it('pendente uses muted color tokens', () => {
    expect(statusColors.pendente.bg).toContain('muted');
  });

  it('erro uses destructive color tokens', () => {
    expect(statusColors.erro.bg).toContain('destructive');
    expect(statusColors.erro.border).toContain('destructive');
  });

  it('concluido has glow shadow', () => {
    expect(statusColors.concluido.glow.length).toBeGreaterThan(0);
  });

  it('pendente glow is empty string', () => {
    expect(statusColors.pendente.glow).toBe('');
  });

  it('erro has glow shadow', () => {
    expect(statusColors.erro.glow.length).toBeGreaterThan(0);
  });
});
