import { describe, it, expect, vi, beforeEach } from 'vitest';
import { haptics } from '../haptics';

// ─── haptics ─────────────────────────────────────────────────────────────────

describe('haptics', () => {
  let vibrateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vibrateSpy = vi.fn();
    Object.defineProperty(window.navigator, 'vibrate', {
      value: vibrateSpy,
      writable: true,
      configurable: true,
    });
  });

  it('light() calls navigator.vibrate(10)', () => {
    haptics.light();
    expect(vibrateSpy).toHaveBeenCalledWith(10);
  });

  it('medium() calls navigator.vibrate(25)', () => {
    haptics.medium();
    expect(vibrateSpy).toHaveBeenCalledWith(25);
  });

  it('success() calls navigator.vibrate([10, 50, 10])', () => {
    haptics.success();
    expect(vibrateSpy).toHaveBeenCalledWith([10, 50, 10]);
  });

  it('error() calls navigator.vibrate([50, 100, 50, 100, 50])', () => {
    haptics.error();
    expect(vibrateSpy).toHaveBeenCalledWith([50, 100, 50, 100, 50]);
  });

  it('warning() calls navigator.vibrate([30, 40, 30])', () => {
    haptics.warning();
    expect(vibrateSpy).toHaveBeenCalledWith([30, 40, 30]);
  });

  it('does not throw when navigator.vibrate is unavailable', () => {
    Object.defineProperty(window.navigator, 'vibrate', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(() => haptics.light()).not.toThrow();
    expect(() => haptics.medium()).not.toThrow();
    expect(() => haptics.success()).not.toThrow();
    expect(() => haptics.error()).not.toThrow();
    expect(() => haptics.warning()).not.toThrow();
  });

  it('each method returns undefined', () => {
    expect(haptics.light()).toBeUndefined();
    expect(haptics.medium()).toBeUndefined();
    expect(haptics.success()).toBeUndefined();
    expect(haptics.error()).toBeUndefined();
    expect(haptics.warning()).toBeUndefined();
  });

  it('light() vibrates with a shorter duration than medium()', () => {
    haptics.light();
    const lightDuration = vibrateSpy.mock.calls[0][0] as number;
    haptics.medium();
    const mediumDuration = vibrateSpy.mock.calls[1][0] as number;
    expect(lightDuration).toBeLessThan(mediumDuration);
  });

  it('success() uses an array pattern (double tap)', () => {
    haptics.success();
    const arg = vibrateSpy.mock.calls[0][0];
    expect(Array.isArray(arg)).toBe(true);
    expect((arg as number[]).length).toBeGreaterThan(1);
  });

  it('error() pattern is longer than success() pattern', () => {
    haptics.success();
    const successLen = (vibrateSpy.mock.calls[0][0] as number[]).length;
    haptics.error();
    const errorLen = (vibrateSpy.mock.calls[1][0] as number[]).length;
    expect(errorLen).toBeGreaterThan(successLen);
  });

  it('warning() uses an odd-length pattern (vibrate-pause-vibrate)', () => {
    haptics.warning();
    const pattern = vibrateSpy.mock.calls[0][0] as number[];
    expect(Array.isArray(pattern)).toBe(true);
    expect(pattern.length % 2).toBe(1);
  });

  it('haptics object has exactly 5 methods', () => {
    expect(Object.keys(haptics)).toHaveLength(5);
  });

  it('all haptics methods are functions', () => {
    Object.values(haptics).forEach(fn => {
      expect(typeof fn).toBe('function');
    });
  });
});
