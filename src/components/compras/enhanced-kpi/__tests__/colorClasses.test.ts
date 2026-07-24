import { describe, it, expect, vi } from 'vitest';

vi.mock('lucide-react', () => ({
  TrendingUp: { displayName: 'TrendingUp' },
  TrendingDown: { displayName: 'TrendingDown' },
  Minus: { displayName: 'Minus' },
}));
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => 'div' }),
  AnimatePresence: ({ children }: { children: unknown }) => children,
}));
vi.mock('@/lib/utils', () => ({ cn: (...a: string[]) => a.filter(Boolean).join(' ') }));
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: unknown }) => children,
  TooltipContent: ({ children }: { children: unknown }) => children,
  TooltipTrigger: ({ children }: { children: unknown }) => children,
}));

import { colorClasses } from '../EnhancedKpiHelpers';
import type { KpiColor } from '../EnhancedKpiHelpers';

// ─── colorClasses ─────────────────────────────────────────────────────────────

const KPI_COLORS: KpiColor[] = [
  'emerald', 'orange', 'blue', 'purple', 'green',
  'cyan', 'red', 'indigo', 'teal', 'violet', 'fuchsia',
];

describe('colorClasses', () => {
  it('has 11 color entries', () => {
    expect(Object.keys(colorClasses)).toHaveLength(11);
  });

  it('covers all KpiColor values', () => {
    KPI_COLORS.forEach(color => {
      expect(colorClasses[color]).toBeDefined();
    });
  });

  it('every entry has bg, text, border, gradient strings', () => {
    KPI_COLORS.forEach(color => {
      const entry = colorClasses[color];
      expect(typeof entry.bg).toBe('string');
      expect(typeof entry.text).toBe('string');
      expect(typeof entry.border).toBe('string');
      expect(typeof entry.gradient).toBe('string');
      expect(entry.bg.length).toBeGreaterThan(0);
      expect(entry.text.length).toBeGreaterThan(0);
      expect(entry.border.length).toBeGreaterThan(0);
      expect(entry.gradient.length).toBeGreaterThan(0);
    });
  });

  it('all bg classes start with bg-', () => {
    KPI_COLORS.forEach(color => {
      expect(colorClasses[color].bg).toMatch(/^bg-/);
    });
  });

  it('all text classes start with text-', () => {
    KPI_COLORS.forEach(color => {
      expect(colorClasses[color].text).toMatch(/^text-/);
    });
  });

  it('all border classes start with border-', () => {
    KPI_COLORS.forEach(color => {
      expect(colorClasses[color].border).toMatch(/^border-/);
    });
  });

  it('all gradient classes contain "from-" and "to-"', () => {
    KPI_COLORS.forEach(color => {
      expect(colorClasses[color].gradient).toMatch(/from-/);
      expect(colorClasses[color].gradient).toMatch(/to-/);
    });
  });

  it('emerald uses emerald color palette', () => {
    expect(colorClasses.emerald.bg).toContain('emerald');
    expect(colorClasses.emerald.text).toContain('emerald');
  });

  it('orange uses orange color palette', () => {
    expect(colorClasses.orange.bg).toContain('orange');
    expect(colorClasses.orange.text).toContain('orange');
  });

  it('all bg classes are unique', () => {
    const bgs = KPI_COLORS.map(c => colorClasses[c].bg);
    expect(new Set(bgs).size).toBe(bgs.length);
  });

  it('all text classes are unique', () => {
    const texts = KPI_COLORS.map(c => colorClasses[c].text);
    expect(new Set(texts).size).toBe(texts.length);
  });
});
