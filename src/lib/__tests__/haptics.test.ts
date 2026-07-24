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
});
