import { describe, it, expect, vi } from 'vitest';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => 'div' }),
  AnimatePresence: ({ children }: { children: unknown }) => children,
}));
vi.mock('@/lib/utils', () => ({ cn: (...a: string[]) => a.filter(Boolean).join(' ') }));
vi.mock('lucide-react', () => ({
  Sparkles: { displayName: 'Sparkles' },
  Heart: { displayName: 'Heart' },
  Star: { displayName: 'Star' },
  CheckCircle2: { displayName: 'CheckCircle2' },
  Trophy: { displayName: 'Trophy' },
  Target: { displayName: 'Target' },
  Flame: { displayName: 'Flame' },
  Crown: { displayName: 'Crown' },
  Gift: { displayName: 'Gift' },
  TrendingUp: { displayName: 'TrendingUp' },
  Medal: { displayName: 'Medal' },
  Rocket: { displayName: 'Rocket' },
}));

import { celebrationConfigs } from '../celebration-particles';
import type { CelebrationType } from '../celebration-particles';

// ─── celebrationConfigs ───────────────────────────────────────────────────────

const CELEBRATION_TYPES: CelebrationType[] = [
  'success', 'achievement', 'milestone', 'streak',
  'level-up', 'purchase', 'savings', 'record', 'first-time',
];

describe('celebrationConfigs', () => {
  it('has 9 celebration type entries', () => {
    expect(Object.keys(celebrationConfigs)).toHaveLength(9);
  });

  it('covers all expected CelebrationType values', () => {
    CELEBRATION_TYPES.forEach(type => {
      expect(celebrationConfigs[type]).toBeDefined();
    });
  });

  it('every entry has a defined icon', () => {
    CELEBRATION_TYPES.forEach(type => {
      expect(celebrationConfigs[type].icon).toBeDefined();
    });
  });

  it('every entry has a non-empty colors array', () => {
    CELEBRATION_TYPES.forEach(type => {
      const { colors } = celebrationConfigs[type];
      expect(Array.isArray(colors)).toBe(true);
      expect(colors.length).toBeGreaterThan(0);
    });
  });

  it('every color string starts with "bg-"', () => {
    CELEBRATION_TYPES.forEach(type => {
      celebrationConfigs[type].colors.forEach(color => {
        expect(color).toMatch(/^bg-/);
      });
    });
  });

  it('every entry has a non-empty bgGradient string', () => {
    CELEBRATION_TYPES.forEach(type => {
      const { bgGradient } = celebrationConfigs[type];
      expect(typeof bgGradient).toBe('string');
      expect(bgGradient.length).toBeGreaterThan(0);
    });
  });

  it('all bgGradient strings start with "from-"', () => {
    CELEBRATION_TYPES.forEach(type => {
      expect(celebrationConfigs[type].bgGradient).toMatch(/^from-/);
    });
  });

  it('every entry has a valid particles value', () => {
    const validParticles = new Set(['confetti', 'hearts', 'stars', 'mixed']);
    CELEBRATION_TYPES.forEach(type => {
      expect(validParticles.has(celebrationConfigs[type].particles)).toBe(true);
    });
  });

  it('success uses confetti particles', () => {
    expect(celebrationConfigs.success.particles).toBe('confetti');
  });

  it('achievement uses stars particles', () => {
    expect(celebrationConfigs.achievement.particles).toBe('stars');
  });

  it('streak uses mixed particles', () => {
    expect(celebrationConfigs.streak.particles).toBe('mixed');
  });

  it('first-time uses mixed particles', () => {
    expect(celebrationConfigs['first-time'].particles).toBe('mixed');
  });

  it('level-up uses stars particles', () => {
    expect(celebrationConfigs['level-up'].particles).toBe('stars');
  });

  it('success bgGradient references success color', () => {
    expect(celebrationConfigs.success.bgGradient).toContain('success');
  });

  it('achievement bgGradient references warning color', () => {
    expect(celebrationConfigs.achievement.bgGradient).toContain('warning');
  });

  it('success has at least 4 colors', () => {
    expect(celebrationConfigs.success.colors.length).toBeGreaterThanOrEqual(4);
  });

  it('purchase, savings, record all use confetti or stars', () => {
    const confettiOrStars = new Set(['confetti', 'stars']);
    expect(confettiOrStars.has(celebrationConfigs.purchase.particles)).toBe(true);
    expect(confettiOrStars.has(celebrationConfigs.savings.particles)).toBe(true);
    expect(confettiOrStars.has(celebrationConfigs.record.particles)).toBe(true);
  });

  it('covers all 9 types', () => {
    expect(CELEBRATION_TYPES).toHaveLength(9);
  });
});
