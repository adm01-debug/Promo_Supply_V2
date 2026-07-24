import { describe, it, expect } from 'vitest';
import {
  fadeInVariants,
  scaleVariants,
  slideInLeftVariants,
  slideInRightVariants,
  staggerContainerVariants,
  staggerItemVariants,
  buttonTapVariants,
  cardHoverVariants,
  pulseVariants,
  springConfig,
  smoothSpringConfig,
} from '../motionVariants';

// ─── motionVariants ───────────────────────────────────────────────────────────

describe('fadeInVariants', () => {
  it('has hidden state with opacity 0 and y offset', () => {
    expect(fadeInVariants.hidden).toMatchObject({ opacity: 0, y: 20 });
  });

  it('has visible state with opacity 1 and y 0', () => {
    expect(fadeInVariants.visible).toMatchObject({ opacity: 1, y: 0 });
  });
});

describe('scaleVariants', () => {
  it('has hidden state with opacity 0 and scale < 1', () => {
    expect(scaleVariants.hidden).toMatchObject({ opacity: 0, scale: 0.9 });
  });

  it('has visible state with opacity 1 and scale 1', () => {
    expect(scaleVariants.visible).toMatchObject({ opacity: 1, scale: 1 });
  });
});

describe('slideInLeftVariants', () => {
  it('has hidden state with negative x offset', () => {
    expect((slideInLeftVariants.hidden as { x: number }).x).toBeLessThan(0);
  });

  it('has visible state with x 0', () => {
    expect((slideInLeftVariants.visible as { x: number }).x).toBe(0);
  });
});

describe('slideInRightVariants', () => {
  it('has hidden state with positive x offset', () => {
    expect((slideInRightVariants.hidden as { x: number }).x).toBeGreaterThan(0);
  });

  it('has visible state with x 0', () => {
    expect((slideInRightVariants.visible as { x: number }).x).toBe(0);
  });

  it('slides from opposite direction to slideInLeftVariants', () => {
    const leftX = (slideInLeftVariants.hidden as { x: number }).x;
    const rightX = (slideInRightVariants.hidden as { x: number }).x;
    expect(rightX).toBe(-leftX);
  });
});

describe('staggerContainerVariants', () => {
  it('has hidden and visible states', () => {
    expect(staggerContainerVariants.hidden).toBeDefined();
    expect(staggerContainerVariants.visible).toBeDefined();
  });

  it('staggerChildren is defined in visible transition', () => {
    const visible = staggerContainerVariants.visible as { transition: { staggerChildren: number } };
    expect(typeof visible.transition.staggerChildren).toBe('number');
    expect(visible.transition.staggerChildren).toBeGreaterThan(0);
  });
});

describe('staggerItemVariants', () => {
  it('has hidden state with opacity 0', () => {
    expect(staggerItemVariants.hidden).toMatchObject({ opacity: 0 });
  });

  it('has visible state with opacity 1', () => {
    expect(staggerItemVariants.visible).toMatchObject({ opacity: 1 });
  });
});

describe('buttonTapVariants', () => {
  it('has tap scale below 1 (shrinks on press)', () => {
    expect(buttonTapVariants.tap.scale).toBeLessThan(1);
  });

  it('has hover scale above 1 (expands on hover)', () => {
    expect(buttonTapVariants.hover.scale).toBeGreaterThan(1);
  });
});

describe('cardHoverVariants', () => {
  it('has rest state with scale 1', () => {
    expect(cardHoverVariants.rest.scale).toBe(1);
  });

  it('has hover state with scale > 1', () => {
    expect(cardHoverVariants.hover.scale).toBeGreaterThan(1);
  });

  it('has boxShadow defined in both rest and hover', () => {
    expect(typeof cardHoverVariants.rest.boxShadow).toBe('string');
    expect(typeof cardHoverVariants.hover.boxShadow).toBe('string');
  });
});

describe('pulseVariants', () => {
  it('has initial and pulse states', () => {
    expect(pulseVariants.initial).toBeDefined();
    expect(pulseVariants.pulse).toBeDefined();
  });

  it('initial state has scale 1', () => {
    expect((pulseVariants.initial as { scale: number }).scale).toBe(1);
  });

  it('pulse scale is an array (keyframe animation)', () => {
    const pulse = pulseVariants.pulse as { scale: number[] };
    expect(Array.isArray(pulse.scale)).toBe(true);
  });
});

describe('springConfig', () => {
  it('has type "spring"', () => {
    expect(springConfig.type).toBe('spring');
  });

  it('has stiffness value', () => {
    expect(typeof springConfig.stiffness).toBe('number');
    expect(springConfig.stiffness).toBe(300);
  });

  it('has damping value', () => {
    expect(typeof springConfig.damping).toBe('number');
    expect(springConfig.damping).toBe(30);
  });
});

describe('smoothSpringConfig', () => {
  it('has type "spring"', () => {
    expect(smoothSpringConfig.type).toBe('spring');
  });

  it('has lower stiffness than springConfig (smoother feel)', () => {
    expect(smoothSpringConfig.stiffness).toBeLessThan(springConfig.stiffness);
  });

  it('has lower damping than springConfig', () => {
    expect(smoothSpringConfig.damping).toBeLessThan(springConfig.damping);
  });

  it('stiffness is 200 and damping is 25', () => {
    expect(smoothSpringConfig.stiffness).toBe(200);
    expect(smoothSpringConfig.damping).toBe(25);
  });
});
