import { describe, it, expect, vi } from 'vitest';

vi.mock('react', () => ({
  ...vi.importActual('react'),
  useState: vi.fn((v: unknown) => [v, vi.fn()]),
}));
vi.mock('@/components/ui/card', () => ({ Card: {} }));
vi.mock('@/components/ui/badge', () => ({ Badge: {} }));
vi.mock('@/components/ui/button', () => ({ Button: {} }));
vi.mock('@/components/ui/scroll-area', () => ({ ScrollArea: {} }));
vi.mock('@/types/legacyTypes', () => ({
  getStatusLabel: vi.fn((s: string) => s),
  getTipoLabel: vi.fn((t: string) => t),
}));
vi.mock('@/lib/utils', () => ({ formatCurrency: vi.fn((v: number) => String(v)) }));
vi.mock('lucide-react', () => ({
  Package: { displayName: 'Package' },
  Building2: { displayName: 'Building2' },
  Calendar: { displayName: 'Calendar' },
  GripVertical: { displayName: 'GripVertical' },
  Eye: { displayName: 'Eye' },
}));

import { isKanbanStatus, isKanbanTipo } from '../KanbanBoard';

// ─── isKanbanStatus ───────────────────────────────────────────────────────────

const VALID_STATUSES = [
  'AGUARDANDO_COTACAO', 'EM_COTACAO', 'FORNECEDOR_SELECIONADO',
  'PEDIDO_GERADO', 'AGUARDANDO_PAGAMENTO', 'PAGO',
  'EM_TRANSITO', 'ENTREGUE', 'REJEITADA', 'CANCELADA',
];

describe('isKanbanStatus', () => {
  it('returns true for all valid statuses', () => {
    VALID_STATUSES.forEach(status => {
      expect(isKanbanStatus(status)).toBe(true);
    });
  });

  it('returns false for unknown string', () => {
    expect(isKanbanStatus('UNKNOWN_STATUS')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isKanbanStatus(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isKanbanStatus(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isKanbanStatus('')).toBe(false);
  });

  it('returns false for number', () => {
    expect(isKanbanStatus(42)).toBe(false);
  });

  it('returns false for object', () => {
    expect(isKanbanStatus({})).toBe(false);
  });

  it('is case-sensitive — lowercase fails', () => {
    expect(isKanbanStatus('aguardando_cotacao')).toBe(false);
  });

  it('AGUARDANDO_COTACAO is valid', () => {
    expect(isKanbanStatus('AGUARDANDO_COTACAO')).toBe(true);
  });

  it('ENTREGUE is valid', () => {
    expect(isKanbanStatus('ENTREGUE')).toBe(true);
  });

  it('covers all 10 statuses', () => {
    expect(VALID_STATUSES).toHaveLength(10);
  });
});

// ─── isKanbanTipo ─────────────────────────────────────────────────────────────

const VALID_TIPOS = ['PE_LISO', 'FAB_LISO', 'FAB_PERSONALIZADO'];

describe('isKanbanTipo', () => {
  it('returns true for all valid tipos', () => {
    VALID_TIPOS.forEach(tipo => {
      expect(isKanbanTipo(tipo)).toBe(true);
    });
  });

  it('returns false for unknown string', () => {
    expect(isKanbanTipo('UNKNOWN_TIPO')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isKanbanTipo(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isKanbanTipo(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isKanbanTipo('')).toBe(false);
  });

  it('returns false for number', () => {
    expect(isKanbanTipo(0)).toBe(false);
  });

  it('is case-sensitive — lowercase fails', () => {
    expect(isKanbanTipo('pe_liso')).toBe(false);
  });

  it('PE_LISO is valid', () => {
    expect(isKanbanTipo('PE_LISO')).toBe(true);
  });

  it('FAB_PERSONALIZADO is valid', () => {
    expect(isKanbanTipo('FAB_PERSONALIZADO')).toBe(true);
  });

  it('covers all 3 tipos', () => {
    expect(VALID_TIPOS).toHaveLength(3);
  });
});
