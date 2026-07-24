import { describe, it, expect } from 'vitest';
import { DEFAULT_TRANSITION, ROUTE_OVERRIDES } from '../config';

// ─── transitions/config ───────────────────────────────────────────────────────

describe('DEFAULT_TRANSITION', () => {
  it('is "blur-scale"', () => {
    expect(DEFAULT_TRANSITION).toBe('blur-scale');
  });

  it('is a string', () => {
    expect(typeof DEFAULT_TRANSITION).toBe('string');
  });
});

describe('ROUTE_OVERRIDES', () => {
  it('has 3 override entries', () => {
    expect(ROUTE_OVERRIDES).toHaveLength(3);
  });

  it('every entry has a pattern (RegExp) and a preset (string)', () => {
    ROUTE_OVERRIDES.forEach(override => {
      expect(override.pattern).toBeInstanceOf(RegExp);
      expect(typeof override.preset).toBe('string');
      expect(override.preset.length).toBeGreaterThan(0);
    });
  });

  it('first override matches /compras/wizard routes with preset "slide-left"', () => {
    const first = ROUTE_OVERRIDES[0];
    expect(first.pattern.test('/compras/wizard')).toBe(true);
    expect(first.pattern.test('/compras/wizard/step-1')).toBe(true);
    expect(first.preset).toBe('slide-left');
  });

  it('first override does not match /compras (without wizard)', () => {
    expect(ROUTE_OVERRIDES[0].pattern.test('/compras')).toBe(false);
    expect(ROUTE_OVERRIDES[0].pattern.test('/compras/list')).toBe(false);
  });

  it('second override matches /admin routes with preset "fade"', () => {
    const second = ROUTE_OVERRIDES[1];
    expect(second.pattern.test('/admin')).toBe(true);
    expect(second.pattern.test('/admin/users')).toBe(true);
    expect(second.preset).toBe('fade');
  });

  it('second override matches /administrator (prefix match)', () => {
    expect(ROUTE_OVERRIDES[1].pattern.test('/administrator')).toBe(true);
  });

  it('third override matches /auth routes with preset "zoom-in" and duration 0.35', () => {
    const third = ROUTE_OVERRIDES[2];
    expect(third.pattern.test('/auth')).toBe(true);
    expect(third.pattern.test('/auth/login')).toBe(true);
    expect(third.preset).toBe('zoom-in');
    expect(third.duration).toBe(0.35);
  });

  it('third override matches /authentication (prefix match)', () => {
    expect(ROUTE_OVERRIDES[2].pattern.test('/authentication')).toBe(true);
  });

  it('first and second overrides have no duration override', () => {
    expect(ROUTE_OVERRIDES[0].duration).toBeUndefined();
    expect(ROUTE_OVERRIDES[1].duration).toBeUndefined();
  });
});
