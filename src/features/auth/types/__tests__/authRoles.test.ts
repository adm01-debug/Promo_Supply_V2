import { describe, it, expect } from 'vitest';
import { roleLabels, roleColors } from '../authRoles';
import type { AppRole } from '../authRoles';

// ─── authRoles ────────────────────────────────────────────────────────────────

const ALL_ROLES: AppRole[] = ['admin', 'coordinator', 'buyer', 'finance', 'viewer', 'supplier'];

describe('roleLabels', () => {
  it('covers all 6 roles', () => {
    ALL_ROLES.forEach(role => {
      expect(roleLabels[role]).toBeDefined();
    });
  });

  it('has exactly 6 entries', () => {
    expect(Object.keys(roleLabels)).toHaveLength(6);
  });

  it('all labels are non-empty strings', () => {
    ALL_ROLES.forEach(role => {
      expect(typeof roleLabels[role]).toBe('string');
      expect(roleLabels[role].length).toBeGreaterThan(0);
    });
  });

  it('admin label is "Administrador"', () => {
    expect(roleLabels.admin).toBe('Administrador');
  });

  it('coordinator label is "Coordenador"', () => {
    expect(roleLabels.coordinator).toBe('Coordenador');
  });

  it('buyer label is "Comprador"', () => {
    expect(roleLabels.buyer).toBe('Comprador');
  });

  it('finance label is "Financeiro"', () => {
    expect(roleLabels.finance).toBe('Financeiro');
  });

  it('viewer label is "Visualizador"', () => {
    expect(roleLabels.viewer).toBe('Visualizador');
  });

  it('supplier label is "Fornecedor"', () => {
    expect(roleLabels.supplier).toBe('Fornecedor');
  });
});

describe('roleColors', () => {
  it('covers all 6 roles', () => {
    ALL_ROLES.forEach(role => {
      expect(roleColors[role]).toBeDefined();
    });
  });

  it('has exactly 6 entries', () => {
    expect(Object.keys(roleColors)).toHaveLength(6);
  });

  it('all color values are non-empty strings', () => {
    ALL_ROLES.forEach(role => {
      expect(typeof roleColors[role]).toBe('string');
      expect(roleColors[role].length).toBeGreaterThan(0);
    });
  });

  it('admin color contains "destructive"', () => {
    expect(roleColors.admin).toContain('destructive');
  });

  it('coordinator color contains "purple"', () => {
    expect(roleColors.coordinator).toContain('purple');
  });

  it('buyer color contains "primary"', () => {
    expect(roleColors.buyer).toContain('primary');
  });

  it('finance color contains "emerald"', () => {
    expect(roleColors.finance).toContain('emerald');
  });

  it('viewer color contains "muted"', () => {
    expect(roleColors.viewer).toContain('muted');
  });

  it('supplier color contains "orange"', () => {
    expect(roleColors.supplier).toContain('orange');
  });

  it('every color value contains at least two CSS class segments', () => {
    ALL_ROLES.forEach(role => {
      expect(roleColors[role].split(' ').length).toBeGreaterThanOrEqual(2);
    });
  });
});
