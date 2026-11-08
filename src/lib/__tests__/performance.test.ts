import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { performanceMonitor } from '../performance';

// ─── performanceMonitor ───────────────────────────────────────────────────────

describe('performanceMonitor', () => {
  it('is defined and is an object', () => {
    expect(performanceMonitor).toBeDefined();
    expect(typeof performanceMonitor).toBe('object');
  });

  it('exposes mark, measure, trackLCP, trackCLS, trackFID, trackFCP, initAll', () => {
    expect(typeof performanceMonitor.mark).toBe('function');
    expect(typeof performanceMonitor.measure).toBe('function');
    expect(typeof performanceMonitor.trackLCP).toBe('function');
    expect(typeof performanceMonitor.trackCLS).toBe('function');
    expect(typeof performanceMonitor.trackFID).toBe('function');
    expect(typeof performanceMonitor.trackFCP).toBe('function');
    expect(typeof performanceMonitor.initAll).toBe('function');
  });

  it('has exactly 7 methods (structural completeness)', () => {
    expect(Object.keys(performanceMonitor)).toHaveLength(7);
  });

  it('all exported values are functions', () => {
    Object.values(performanceMonitor).forEach(v => {
      expect(typeof v).toBe('function');
    });
  });
});

describe('performanceMonitor.mark', () => {
  beforeEach(() => {
    vi.spyOn(window.performance, 'mark').mockImplementation(() => ({}) as PerformanceMark);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not throw for any string', () => {
    expect(() => performanceMonitor.mark('app-start')).not.toThrow();
    expect(() => performanceMonitor.mark('')).not.toThrow();
  });

  it('calls window.performance.mark with the name', () => {
    performanceMonitor.mark('test-mark');
    expect(window.performance.mark).toHaveBeenCalledWith('test-mark');
  });
});

describe('performanceMonitor.measure', () => {
  beforeEach(() => {
    vi.spyOn(window.performance, 'getEntriesByName').mockReturnValue([]);
    vi.spyOn(window.performance, 'measure').mockImplementation(() => ({}) as PerformanceMeasure);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 0 when startMark does not exist', () => {
    vi.spyOn(window.performance, 'getEntriesByName').mockReturnValue([]);
    const result = performanceMonitor.measure('test', 'start', 'end');
    expect(result).toBe(0);
  });

  it('does not throw when marks are missing', () => {
    expect(() => performanceMonitor.measure('name', 'no-start', 'no-end')).not.toThrow();
  });

  it('always returns a number', () => {
    const result = performanceMonitor.measure('name', 'no-start', 'no-end');
    expect(typeof result).toBe('number');
  });

  it('returns 0 when window is undefined (SSR)', () => {
    const originalWindow = global.window;
    // @ts-ignore
    delete global.window;
    const result = performanceMonitor.measure('name', 'start', 'end');
    expect(result).toBe(0);
    global.window = originalWindow;
  });
});

describe('performanceMonitor.trackLCP', () => {
  it('does not throw', () => {
    expect(() => performanceMonitor.trackLCP()).not.toThrow();
  });
});

describe('performanceMonitor.trackCLS', () => {
  it('does not throw', () => {
    expect(() => performanceMonitor.trackCLS()).not.toThrow();
  });
});

describe('performanceMonitor.trackFID', () => {
  it('does not throw', () => {
    expect(() => performanceMonitor.trackFID()).not.toThrow();
  });
});

describe('performanceMonitor.trackFCP', () => {
  it('does not throw', () => {
    expect(() => performanceMonitor.trackFCP()).not.toThrow();
  });
});

describe('performanceMonitor.initAll', () => {
  it('does not throw', () => {
    expect(() => performanceMonitor.initAll()).not.toThrow();
  });

  it('returns a cleanup function', () => {
    const cleanup = performanceMonitor.initAll();
    expect(typeof cleanup).toBe('function');
  });

  it('cleanup function does not throw', () => {
    const cleanup = performanceMonitor.initAll();
    expect(() => cleanup()).not.toThrow();
  });

  it('can be called multiple times without throwing', () => {
    expect(() => {
      const c1 = performanceMonitor.initAll();
      const c2 = performanceMonitor.initAll();
      c1();
      c2();
    }).not.toThrow();
  });

  it('cleanup can be called multiple times without throwing', () => {
    const cleanup = performanceMonitor.initAll();
    expect(() => {
      cleanup();
      cleanup();
    }).not.toThrow();
  });
});
