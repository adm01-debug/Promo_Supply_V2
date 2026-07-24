import { describe, it, expect, vi } from 'vitest';

vi.mock('react', () => ({
  ...vi.importActual('react'),
  useState: vi.fn((v: unknown) => [v, vi.fn()]),
  forwardRef: (fn: unknown) => fn,
}));
vi.mock('@/stores/slaSettingsStore', () => ({
  useSLASettingsStore: vi.fn(() => ({ supplierConfigs: [], updateSupplierConfig: vi.fn() })),
}));
vi.mock('@/components/ui/dialog', () => ({ Dialog: {}, DialogContent: {}, DialogHeader: {}, DialogTitle: {}, DialogDescription: {}, DialogFooter: {} }));
vi.mock('@/components/ui/button', () => ({ Button: {} }));
vi.mock('@/components/ui/input', () => ({ Input: {} }));
vi.mock('@/components/ui/label', () => ({ Label: {} }));
vi.mock('@/components/ui/badge', () => ({ Badge: {} }));
vi.mock('@/components/ui/slider', () => ({ Slider: {} }));
vi.mock('@/components/ui/separator', () => ({ Separator: {} }));
vi.mock('lucide-react', () => ({
  Settings: { displayName: 'Settings' },
  Building2: { displayName: 'Building2' },
  AlertTriangle: { displayName: 'AlertTriangle' },
  ChevronDown: { displayName: 'ChevronDown' },
  ChevronUp: { displayName: 'ChevronUp' },
  Save: { displayName: 'Save' },
}));

import { KNOWN_SUPPLIERS } from '../SupplierThresholdConfig';

// ─── KNOWN_SUPPLIERS ──────────────────────────────────────────────────────────

describe('KNOWN_SUPPLIERS', () => {
  it('is an array', () => {
    expect(Array.isArray(KNOWN_SUPPLIERS)).toBe(true);
  });

  it('has 6 supplier entries', () => {
    expect(KNOWN_SUPPLIERS).toHaveLength(6);
  });

  it('every entry has id and name strings', () => {
    KNOWN_SUPPLIERS.forEach(supplier => {
      expect(typeof supplier.id).toBe('string');
      expect(typeof supplier.name).toBe('string');
      expect(supplier.id.length).toBeGreaterThan(0);
      expect(supplier.name.length).toBeGreaterThan(0);
    });
  });

  it('all ids are unique', () => {
    const ids = KNOWN_SUPPLIERS.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all names are unique', () => {
    const names = KNOWN_SUPPLIERS.map(s => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('includes XBZ Brindes supplier', () => {
    expect(KNOWN_SUPPLIERS.some(s => s.id === 'xbz' && s.name === 'XBZ Brindes')).toBe(true);
  });

  it('includes Stricker / Spot Gifts supplier', () => {
    expect(KNOWN_SUPPLIERS.some(s => s.id === 'stricker')).toBe(true);
  });

  it('includes Eco Brindes supplier', () => {
    expect(KNOWN_SUPPLIERS.some(s => s.id === 'eco' && s.name === 'Eco Brindes')).toBe(true);
  });
});
