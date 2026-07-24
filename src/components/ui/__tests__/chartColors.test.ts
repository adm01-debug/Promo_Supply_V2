import { describe, it, expect, vi } from 'vitest';

vi.mock('react', () => ({
  ...vi.importActual('react'),
  forwardRef: (fn: unknown) => fn,
  createContext: vi.fn(() => ({ Provider: {}, Consumer: {} })),
  useContext: vi.fn(),
  useId: vi.fn(() => ':r0:'),
}));
vi.mock('recharts', () => ({
  ResponsiveContainer: {},
  Legend: {},
  Tooltip: {},
}));
vi.mock('@/lib/utils', () => ({ cn: (...a: string[]) => a.filter(Boolean).join(' ') }));

import { chartPalette, darkModeChartColors, lightModeChartColors } from '../chart';

// ─── chartPalette ─────────────────────────────────────────────────────────────

const PALETTE_KEYS = ['primary', 'success', 'warning', 'danger', 'purple', 'blue', 'cyan', 'pink'] as const;

describe('chartPalette', () => {
  it('has 8 color entries', () => {
    expect(Object.keys(chartPalette)).toHaveLength(8);
  });

  it('covers all expected palette keys', () => {
    PALETTE_KEYS.forEach(key => {
      expect(chartPalette[key]).toBeDefined();
    });
  });

  it('every entry has light and dark variants', () => {
    PALETTE_KEYS.forEach(key => {
      expect(typeof chartPalette[key].light).toBe('string');
      expect(typeof chartPalette[key].dark).toBe('string');
      expect(chartPalette[key].light.length).toBeGreaterThan(0);
      expect(chartPalette[key].dark.length).toBeGreaterThan(0);
    });
  });

  it('all color values are hsl strings', () => {
    PALETTE_KEYS.forEach(key => {
      expect(chartPalette[key].light).toMatch(/^hsl\(/);
      expect(chartPalette[key].dark).toMatch(/^hsl\(/);
    });
  });

  it('light and dark variants differ for each color', () => {
    PALETTE_KEYS.forEach(key => {
      expect(chartPalette[key].light).not.toBe(chartPalette[key].dark);
    });
  });

  it('primary light color uses blue hue range', () => {
    expect(chartPalette.primary.light).toContain('221.2');
  });

  it('success uses green hue (around 142)', () => {
    expect(chartPalette.success.light).toContain('142.1');
  });

  it('warning uses yellow hue (around 45)', () => {
    expect(chartPalette.warning.light).toContain('45.4');
  });

  it('danger uses red hue (hue 0)', () => {
    expect(chartPalette.danger.light).toMatch(/^hsl\(0 /);
  });

  it('each palette entry has exactly 2 keys: light and dark', () => {
    PALETTE_KEYS.forEach(key => {
      expect(Object.keys(chartPalette[key]).sort()).toEqual(['dark', 'light']);
    });
  });
});

// ─── darkModeChartColors ──────────────────────────────────────────────────────

describe('darkModeChartColors', () => {
  it('is an array', () => {
    expect(Array.isArray(darkModeChartColors)).toBe(true);
  });

  it('has 8 color entries', () => {
    expect(darkModeChartColors).toHaveLength(8);
  });

  it('every entry is a non-empty hsl string', () => {
    darkModeChartColors.forEach(color => {
      expect(typeof color).toBe('string');
      expect(color).toMatch(/^hsl\(/);
    });
  });

  it('all colors are unique', () => {
    expect(new Set(darkModeChartColors).size).toBe(darkModeChartColors.length);
  });
});

// ─── lightModeChartColors ─────────────────────────────────────────────────────

describe('lightModeChartColors', () => {
  it('is an array', () => {
    expect(Array.isArray(lightModeChartColors)).toBe(true);
  });

  it('has 8 color entries', () => {
    expect(lightModeChartColors).toHaveLength(8);
  });

  it('every entry is a non-empty hsl string', () => {
    lightModeChartColors.forEach(color => {
      expect(typeof color).toBe('string');
      expect(color).toMatch(/^hsl\(/);
    });
  });

  it('all colors are unique', () => {
    expect(new Set(lightModeChartColors).size).toBe(lightModeChartColors.length);
  });
});

// ─── cross-mode consistency ───────────────────────────────────────────────────

describe('dark vs light mode chart colors', () => {
  it('both arrays have the same length', () => {
    expect(darkModeChartColors.length).toBe(lightModeChartColors.length);
  });

  it('dark and light colors differ at each position', () => {
    darkModeChartColors.forEach((darkColor, i) => {
      expect(darkColor).not.toBe(lightModeChartColors[i]);
    });
  });
});
