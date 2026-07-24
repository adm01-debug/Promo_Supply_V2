import { describe, it, expect, vi } from 'vitest';

vi.mock('lucide-react', () => ({
  Package: { displayName: 'Package' },
  FileText: { displayName: 'FileText' },
  CreditCard: { displayName: 'CreditCard' },
  Building2: { displayName: 'Building2' },
}));

import { entityConfig } from '../bulkOperationsTypes';

// ─── bulkOperationsTypes ──────────────────────────────────────────────────────

type EntityType = keyof typeof entityConfig;
const ALL_ENTITY_TYPES: EntityType[] = ['solicitacoes', 'pedidos', 'pagamentos', 'fornecedores'];

describe('entityConfig', () => {
  it('has exactly 4 entity types', () => {
    expect(Object.keys(entityConfig)).toHaveLength(4);
  });

  it('covers all required entity types', () => {
    ALL_ENTITY_TYPES.forEach(type => {
      expect(entityConfig[type]).toBeDefined();
    });
  });

  it('each entity has a non-empty label', () => {
    ALL_ENTITY_TYPES.forEach(type => {
      expect(typeof entityConfig[type].label).toBe('string');
      expect(entityConfig[type].label.length).toBeGreaterThan(0);
    });
  });

  it('each entity has an icon', () => {
    ALL_ENTITY_TYPES.forEach(type => {
      expect(entityConfig[type].icon).toBeTruthy();
    });
  });

  it('each entity has a non-empty color CSS class', () => {
    ALL_ENTITY_TYPES.forEach(type => {
      expect(typeof entityConfig[type].color).toBe('string');
      expect(entityConfig[type].color.length).toBeGreaterThan(0);
    });
  });

  it('solicitacoes label is "Solicitações"', () => {
    expect(entityConfig.solicitacoes.label).toBe('Solicitações');
  });

  it('pedidos label is "Pedidos"', () => {
    expect(entityConfig.pedidos.label).toBe('Pedidos');
  });

  it('pagamentos label is "Pagamentos"', () => {
    expect(entityConfig.pagamentos.label).toBe('Pagamentos');
  });

  it('fornecedores label is "Fornecedores"', () => {
    expect(entityConfig.fornecedores.label).toBe('Fornecedores');
  });

  it('solicitacoes color is "text-info"', () => {
    expect(entityConfig.solicitacoes.color).toBe('text-info');
  });

  it('pedidos color contains "purple"', () => {
    expect(entityConfig.pedidos.color).toContain('purple');
  });

  it('pagamentos color is "text-success"', () => {
    expect(entityConfig.pagamentos.color).toBe('text-success');
  });

  it('fornecedores color is "text-warning"', () => {
    expect(entityConfig.fornecedores.color).toBe('text-warning');
  });
});
