import { describe, it, expect, vi } from 'vitest';

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn(), useQueryClient: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/features/auth', () => ({ useAuth: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { moduleLabels, actionLabels } from '../usePermissions';

// ─── moduleLabels ──────────────────────────────────────────────────────────────

const EXPECTED_MODULES = [
  'solicitacoes', 'cotacoes', 'fornecedores', 'pedidos', 'pagamentos',
  'contratos', 'relatorios', 'auditoria', 'security', 'users', 'settings',
];

describe('moduleLabels', () => {
  it('has 11 module entries', () => {
    expect(Object.keys(moduleLabels)).toHaveLength(11);
  });

  it('covers all expected module keys', () => {
    EXPECTED_MODULES.forEach(mod => {
      expect(moduleLabels[mod]).toBeDefined();
    });
  });

  it('every label is a non-empty string', () => {
    EXPECTED_MODULES.forEach(mod => {
      expect(typeof moduleLabels[mod]).toBe('string');
      expect(moduleLabels[mod].length).toBeGreaterThan(0);
    });
  });

  it('solicitacoes label is "Solicitações"', () => {
    expect(moduleLabels.solicitacoes).toBe('Solicitações');
  });

  it('fornecedores label is "Fornecedores"', () => {
    expect(moduleLabels.fornecedores).toBe('Fornecedores');
  });

  it('relatorios label is "Relatórios"', () => {
    expect(moduleLabels.relatorios).toBe('Relatórios');
  });

  it('all labels are unique', () => {
    const values = Object.values(moduleLabels);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ─── actionLabels ──────────────────────────────────────────────────────────────

const EXPECTED_ACTIONS = [
  'view', 'create', 'edit', 'delete', 'approve', 'select',
  'export', 'manage_ips', 'view_logs', 'manage_sessions', 'manage_roles',
];

describe('actionLabels', () => {
  it('has 11 action entries', () => {
    expect(Object.keys(actionLabels)).toHaveLength(11);
  });

  it('covers all expected action keys', () => {
    EXPECTED_ACTIONS.forEach(action => {
      expect(actionLabels[action]).toBeDefined();
    });
  });

  it('every label is a non-empty string', () => {
    EXPECTED_ACTIONS.forEach(action => {
      expect(typeof actionLabels[action]).toBe('string');
      expect(actionLabels[action].length).toBeGreaterThan(0);
    });
  });

  it('view label is "Visualizar"', () => {
    expect(actionLabels.view).toBe('Visualizar');
  });

  it('create label is "Criar"', () => {
    expect(actionLabels.create).toBe('Criar');
  });

  it('delete label is "Excluir"', () => {
    expect(actionLabels.delete).toBe('Excluir');
  });

  it('approve label is "Aprovar"', () => {
    expect(actionLabels.approve).toBe('Aprovar');
  });

  it('all labels are unique', () => {
    const values = Object.values(actionLabels);
    expect(new Set(values).size).toBe(values.length);
  });
});
