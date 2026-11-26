import { describe, it, expect } from 'vitest';
import { PRESETS, resolvePreset } from '../presets';
import type { TransitionName } from '../presets';

// ─── presets ─────────────────────────────────────────────────────────────────

const ALL_PRESETS: TransitionName[] = [
  'fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down',
  'zoom-in', 'zoom-out', 'flip-x', 'flip-y', 'parallax', 'blur-scale', 'none',
];

describe('PRESETS', () => {
  it('has exactly 12 entries', () => {
    expect(Object.keys(PRESETS)).toHaveLength(12);
  });

  it('covers all TransitionName values', () => {
    ALL_PRESETS.forEach(name => {
      expect(PRESETS[name]).toBeDefined();
    });
  });

  it('every preset has initial, animate, exit, and transition', () => {
    ALL_PRESETS.forEach(name => {
      const preset = PRESETS[name];
      expect(preset.initial).toBeDefined();
      expect(preset.animate).toBeDefined();
      expect(preset.exit).toBeDefined();
      expect(preset.transition).toBeDefined();
    });
  });

  it('every non-none preset has opacity 0 in initial and 1 in animate', () => {
    ALL_PRESETS.filter(n => n !== 'none').forEach(name => {
      expect((PRESETS[name].initial as { opacity: number }).opacity).toBe(0);
      expect((PRESETS[name].animate as { opacity: number }).opacity).toBe(1);
    });
  });

  it('"none" preset has empty initial, animate, exit and zero duration', () => {
    const none = PRESETS.none;
    expect(none.initial).toEqual({});
    expect(none.animate).toEqual({});
    expect(none.exit).toEqual({});
    expect((none.transition as { duration: number }).duration).toBe(0);
  });

  it('"fade" initial/exit have only opacity (no x/y)', () => {
    expect(PRESETS.fade.initial).toEqual({ opacity: 0 });
    expect(PRESETS.fade.exit).toEqual({ opacity: 0 });
  });

  it('"slide-left" enters from positive x and exits to negative x', () => {
    const sl = PRESETS['slide-left'];
    expect((sl.initial as { x: number }).x).toBeGreaterThan(0);
    expect((sl.exit as { x: number }).x).toBeLessThan(0);
  });

  it('"slide-right" enters from negative x and exits to positive x', () => {
    const sr = PRESETS['slide-right'];
    expect((sr.initial as { x: number }).x).toBeLessThan(0);
    expect((sr.exit as { x: number }).x).toBeGreaterThan(0);
  });

  it('"slide-up" enters from positive y and exits to negative y', () => {
    const su = PRESETS['slide-up'];
    expect((su.initial as { y: number }).y).toBeGreaterThan(0);
    expect((su.exit as { y: number }).y).toBeLessThan(0);
  });

  it('"slide-down" enters from negative y and exits to positive y', () => {
    const sd = PRESETS['slide-down'];
    expect((sd.initial as { y: number }).y).toBeLessThan(0);
    expect((sd.exit as { y: number }).y).toBeGreaterThan(0);
  });

  it('"zoom-in" initial scale is less than 1', () => {
    expect((PRESETS['zoom-in'].initial as { scale: number }).scale).toBeLessThan(1);
  });

  it('"zoom-out" initial scale is greater than 1', () => {
    expect((PRESETS['zoom-out'].initial as { scale: number }).scale).toBeGreaterThan(1);
  });

  it('"flip-x" has rotateX in initial/exit, 0 in animate', () => {
    const fx = PRESETS['flip-x'];
    expect((fx.initial as { rotateX: number }).rotateX).toBeGreaterThan(0);
    expect((fx.animate as { rotateX: number }).rotateX).toBe(0);
    expect((fx.exit as { rotateX: number }).rotateX).toBeLessThan(0);
  });

  it('"flip-y" has rotateY in initial/exit, 0 in animate', () => {
    const fy = PRESETS['flip-y'];
    expect((fy.initial as { rotateY: number }).rotateY).toBeGreaterThan(0);
    expect((fy.animate as { rotateY: number }).rotateY).toBe(0);
    expect((fy.exit as { rotateY: number }).rotateY).toBeLessThan(0);
  });

  it('"parallax" has larger y offset than slide-up', () => {
    const parallaxY = (PRESETS.parallax.initial as { y: number }).y;
    const slideUpY = (PRESETS['slide-up'].initial as { y: number }).y;
    expect(Math.abs(parallaxY)).toBeGreaterThan(Math.abs(slideUpY));
  });

  it('"blur-scale" initial has filter with blur and scale below 1', () => {
    const bs = PRESETS['blur-scale'];
    expect((bs.initial as { filter: string }).filter).toContain('blur');
    expect((bs.initial as { scale: number }).scale).toBeLessThan(1);
  });

  it('"blur-scale" animate removes blur (blur(0px))', () => {
    expect((PRESETS['blur-scale'].animate as { filter: string }).filter).toContain('0px');
  });

  it('base transition duration is 0.4 for most presets', () => {
    const presetsWithBase: TransitionName[] = [
      'fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down',
      'zoom-in', 'zoom-out', 'blur-scale',
    ];
    presetsWithBase.forEach(name => {
      expect((PRESETS[name].transition as { duration: number }).duration).toBe(0.4);
    });
  });

  it('"flip-x" and "flip-y" have duration 0.45', () => {
    expect((PRESETS['flip-x'].transition as { duration: number }).duration).toBe(0.45);
    expect((PRESETS['flip-y'].transition as { duration: number }).duration).toBe(0.45);
  });

  it('"parallax" has duration 0.55', () => {
    expect((PRESETS.parallax.transition as { duration: number }).duration).toBe(0.55);
  });
});

// ─── resolvePreset ────────────────────────────────────────────────────────────

describe('resolvePreset', () => {
  it('returns the preset object unchanged when no overrides provided', () => {
    const result = resolvePreset('fade');
    expect(result).toBe(PRESETS.fade);
  });

  it('returns the preset when overrides is undefined', () => {
    const result = resolvePreset('slide-up', undefined);
    expect(result).toBe(PRESETS['slide-up']);
  });

  it('overrides duration in transition', () => {
    const result = resolvePreset('fade', { duration: 1.5 });
    expect((result.transition as { duration: number }).duration).toBe(1.5);
  });

  it('overrides ease in transition', () => {
    const customEase = [0.1, 0.2, 0.3, 0.4] as [number, number, number, number];
    const result = resolvePreset('zoom-in', { ease: customEase });
    expect((result.transition as { ease: unknown }).ease).toEqual(customEase);
  });

  it('overrides delay in transition', () => {
    const result = resolvePreset('slide-left', { delay: 0.3 });
    expect((result.transition as { delay: number }).delay).toBe(0.3);
  });

  it('applies multiple overrides simultaneously', () => {
    const result = resolvePreset('fade', { duration: 0.2, delay: 0.1 });
    const t = result.transition as { duration: number; delay: number };
    expect(t.duration).toBe(0.2);
    expect(t.delay).toBe(0.1);
  });

  it('preserves initial/animate/exit from base preset when overriding', () => {
    const result = resolvePreset('slide-up', { duration: 0.5 });
    expect(result.initial).toEqual(PRESETS['slide-up'].initial);
    expect(result.animate).toEqual(PRESETS['slide-up'].animate);
    expect(result.exit).toEqual(PRESETS['slide-up'].exit);
  });

  it('does not mutate the original PRESET', () => {
    const originalDuration = (PRESETS.fade.transition as { duration: number }).duration;
    resolvePreset('fade', { duration: 99 });
    expect((PRESETS.fade.transition as { duration: number }).duration).toBe(originalDuration);
  });

  it('does not add delay key when delay not in overrides', () => {
    const result = resolvePreset('fade', { duration: 0.5 });
    expect('delay' in (result.transition as object)).toBe(false);
  });
});
