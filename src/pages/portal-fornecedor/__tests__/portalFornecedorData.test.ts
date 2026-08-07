import { describe, it, expect, vi } from 'vitest';

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/features/auth', () => ({ useAuth: vi.fn() }));

import { statusPedido, statusCotacao } from '../portalFornecedorData';

// ─── portalFornecedorData ─────────────────────────────────────────────────────

const VALID_VARIANTS = ['default', 'secondary', 'destructive', 'outline'] as const;

describe('statusPedido', () => {
  const EXPECTED_KEYS = ['pendente', 'aprovado', 'em_transito', 'entregue', 'cancelado'];

  it('has 5 status keys', () => {
    expect(Object.keys(statusPedido)).toHaveLength(5);
  });

  it('covers all expected status keys', () => {
    EXPECTED_KEYS.forEach(key => {
      expect(statusPedido[key]).toBeDefined();
    });
  });

  it('every entry has a non-empty label', () => {
    EXPECTED_KEYS.forEach(key => {
      expect(typeof statusPedido[key].label).toBe('string');
      expect(statusPedido[key].label.length).toBeGreaterThan(0);
    });
  });

  it('every entry has a valid variant', () => {
    EXPECTED_KEYS.forEach(key => {
      expect(VALID_VARIANTS).toContain(statusPedido[key].variant);
    });
  });

  it('pendente has label "Pendente" and variant "secondary"', () => {
    expect(statusPedido.pendente.label).toBe('Pendente');
    expect(statusPedido.pendente.variant).toBe('secondary');
  });

  it('cancelado has variant "destructive"', () => {
    expect(statusPedido.cancelado.variant).toBe('destructive');
  });

  it('entregue has variant "outline"', () => {
    expect(statusPedido.entregue.variant).toBe('outline');
  });

  it('aprovado has label "Aprovado"', () => {
    expect(statusPedido.aprovado.label).toBe('Aprovado');
  });

  it('em_transito has label "Em Trânsito"', () => {
    expect(statusPedido.em_transito.label).toBe('Em Trânsito');
  });

  it('aprovado has variant "default"', () => {
    expect(statusPedido.aprovado.variant).toBe('default');
  });

  it('all labels are unique across statusPedido', () => {
    const labels = Object.values(statusPedido).map(v => v.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('each entry has exactly 2 keys: label and variant', () => {
    Object.values(statusPedido).forEach(entry => {
      expect(Object.keys(entry).sort()).toEqual(['label', 'variant']);
    });
  });
});

describe('statusCotacao', () => {
  const EXPECTED_KEYS = ['pendente', 'enviada', 'aprovada', 'rejeitada'];

  it('has 4 status keys', () => {
    expect(Object.keys(statusCotacao)).toHaveLength(4);
  });

  it('covers all expected status keys', () => {
    EXPECTED_KEYS.forEach(key => {
      expect(statusCotacao[key]).toBeDefined();
    });
  });

  it('every entry has a non-empty label', () => {
    EXPECTED_KEYS.forEach(key => {
      expect(typeof statusCotacao[key].label).toBe('string');
      expect(statusCotacao[key].label.length).toBeGreaterThan(0);
    });
  });

  it('every entry has a valid variant', () => {
    EXPECTED_KEYS.forEach(key => {
      expect(VALID_VARIANTS).toContain(statusCotacao[key].variant);
    });
  });

  it('pendente has variant "secondary"', () => {
    expect(statusCotacao.pendente.variant).toBe('secondary');
  });

  it('rejeitada has variant "destructive"', () => {
    expect(statusCotacao.rejeitada.variant).toBe('destructive');
  });

  it('aprovada has label "Aprovada"', () => {
    expect(statusCotacao.aprovada.label).toBe('Aprovada');
  });

  it('enviada has label "Enviada"', () => {
    expect(statusCotacao.enviada.label).toBe('Enviada');
  });

  it('enviada has variant "default"', () => {
    expect(statusCotacao.enviada.variant).toBe('default');
  });

  it('all labels are unique across statusCotacao', () => {
    const labels = Object.values(statusCotacao).map(v => v.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
