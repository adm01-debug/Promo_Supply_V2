import { describe, it, expect, vi } from 'vitest';

vi.mock('@/components/ui/badge', () => ({ Badge: {} }));
vi.mock('lucide-react', () => ({
  Star: { displayName: 'Star' },
  CheckCircle2: { displayName: 'CheckCircle2' },
  AlertTriangle: { displayName: 'AlertTriangle' },
}));
vi.mock('@/hooks/usePurchaseHistory', () => ({}));

import { COLORS } from '../HistoricoHelpers';

// ─── COLORS ───────────────────────────────────────────────────────────────────

describe('COLORS', () => {
  it('is an array', () => {
    expect(Array.isArray(COLORS)).toBe(true);
  });

  it('has 5 color entries', () => {
    expect(COLORS).toHaveLength(5);
  });

  it('every entry is a non-empty string', () => {
    COLORS.forEach(color => {
      expect(typeof color).toBe('string');
      expect(color.length).toBeGreaterThan(0);
    });
  });

  it('all color strings reference hsl values', () => {
    COLORS.forEach(color => {
      expect(color).toMatch(/hsl\(/);
    });
  });

  it('first color uses CSS variable --primary', () => {
    expect(COLORS[0]).toBe('hsl(var(--primary))');
  });

  it('all color values are unique', () => {
    expect(new Set(COLORS).size).toBe(COLORS.length);
  });
});
