import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: vi.fn(), from: vi.fn() } }));
vi.mock('@/lib/logger', () => ({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/supabaseQuery', () => ({ escapeIlike: vi.fn((s: string) => s) }));

import {
  actionTypeLabels,
  entityTypeLabels,
  actionTypeColors,
} from '../auditService';
import type { AuditActionType, AuditEntityType } from '../auditService';

// ─── actionTypeLabels ─────────────────────────────────────────────────────────

const ACTION_TYPES: AuditActionType[] = [
  'create', 'update', 'delete', 'view', 'export',
  'login', 'logout', 'approve', 'reject', 'cancel',
];

describe('actionTypeLabels', () => {
  it('has exactly 10 action types', () => {
    expect(Object.keys(actionTypeLabels)).toHaveLength(10);
  });

  it('covers all 10 expected action types', () => {
    ACTION_TYPES.forEach(type => {
      expect(actionTypeLabels[type]).toBeDefined();
    });
  });

  it('every label is a non-empty string', () => {
    ACTION_TYPES.forEach(type => {
      expect(typeof actionTypeLabels[type]).toBe('string');
      expect(actionTypeLabels[type].length).toBeGreaterThan(0);
    });
  });

  it('create label is "Criação"', () => {
    expect(actionTypeLabels.create).toBe('Criação');
  });

  it('update label is "Atualização"', () => {
    expect(actionTypeLabels.update).toBe('Atualização');
  });

  it('delete label is "Exclusão"', () => {
    expect(actionTypeLabels.delete).toBe('Exclusão');
  });

  it('approve label is "Aprovação"', () => {
    expect(actionTypeLabels.approve).toBe('Aprovação');
  });

  it('reject label is "Rejeição"', () => {
    expect(actionTypeLabels.reject).toBe('Rejeição');
  });

  it('all labels are unique', () => {
    const values = Object.values(actionTypeLabels);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ─── entityTypeLabels ─────────────────────────────────────────────────────────

const ENTITY_TYPES: AuditEntityType[] = [
  'solicitacao', 'cotacao', 'pedido', 'pagamento',
  'fornecedor', 'usuario', 'configuracao', 'relatorio',
];

describe('entityTypeLabels', () => {
  it('has exactly 8 entity types', () => {
    expect(Object.keys(entityTypeLabels)).toHaveLength(8);
  });

  it('covers all 8 expected entity types', () => {
    ENTITY_TYPES.forEach(type => {
      expect(entityTypeLabels[type]).toBeDefined();
    });
  });

  it('every label is a non-empty string', () => {
    ENTITY_TYPES.forEach(type => {
      expect(typeof entityTypeLabels[type]).toBe('string');
      expect(entityTypeLabels[type].length).toBeGreaterThan(0);
    });
  });

  it('solicitacao label is "Solicitação"', () => {
    expect(entityTypeLabels.solicitacao).toBe('Solicitação');
  });

  it('fornecedor label is "Fornecedor"', () => {
    expect(entityTypeLabels.fornecedor).toBe('Fornecedor');
  });

  it('usuario label is "Usuário"', () => {
    expect(entityTypeLabels.usuario).toBe('Usuário');
  });

  it('all labels are unique', () => {
    const values = Object.values(entityTypeLabels);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ─── actionTypeColors ─────────────────────────────────────────────────────────

describe('actionTypeColors', () => {
  it('has exactly 10 action types', () => {
    expect(Object.keys(actionTypeColors)).toHaveLength(10);
  });

  it('covers all 10 expected action types', () => {
    ACTION_TYPES.forEach(type => {
      expect(actionTypeColors[type]).toBeDefined();
    });
  });

  it('every color string is non-empty', () => {
    ACTION_TYPES.forEach(type => {
      expect(typeof actionTypeColors[type]).toBe('string');
      expect(actionTypeColors[type].length).toBeGreaterThan(0);
    });
  });

  it('every color contains at least one CSS class (space-separated)', () => {
    ACTION_TYPES.forEach(type => {
      const classes = actionTypeColors[type].trim().split(/\s+/);
      expect(classes.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('create uses success color classes', () => {
    expect(actionTypeColors.create).toMatch(/success/);
  });

  it('delete uses destructive color classes', () => {
    expect(actionTypeColors.delete).toMatch(/destructive/);
  });

  it('update uses primary color classes', () => {
    expect(actionTypeColors.update).toMatch(/primary/);
  });

  it('all color strings are unique', () => {
    const values = Object.values(actionTypeColors);
    expect(new Set(values).size).toBe(values.length);
  });
});
