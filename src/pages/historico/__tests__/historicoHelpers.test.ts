import { describe, it, expect, vi } from 'vitest';

vi.mock('@/components/ui/badge', () => ({ Badge: {} }));
vi.mock('@/hooks/usePurchaseHistory', () => ({}));
vi.mock('lucide-react', () => ({
  Star: { displayName: 'Star' },
  CheckCircle2: { displayName: 'CheckCircle2' },
  AlertTriangle: { displayName: 'AlertTriangle' },
}));

import { COLORS } from '../HistoricoHelpers';

// ─── HistoricoHelpers ─────────────────────────────────────────────────────────

describe('COLORS', () => {
  it('has 5 color values', () => {
    expect(COLORS).toHaveLength(5);
  });

  it('all values are non-empty strings', () => {
    COLORS.forEach(color => {
      expect(typeof color).toBe('string');
      expect(color.length).toBeGreaterThan(0);
    });
  });

  it('first color uses CSS variable primary', () => {
    expect(COLORS[0]).toBe('hsl(var(--primary))');
  });

  it('remaining colors are hsl() values', () => {
    COLORS.slice(1).forEach(color => {
      expect(color).toMatch(/^hsl\(/);
    });
  });

  it('all colors are unique', () => {
    expect(new Set(COLORS).size).toBe(COLORS.length);
  });
});
