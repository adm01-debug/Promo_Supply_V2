import { describe, it, expect, vi } from 'vitest';
import {
  getScoreColor,
  getScoreBg,
  getRiskBadge,
} from '../supplierScorecardData';

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/features/auth', () => ({ useAuth: vi.fn(() => ({ user: null })) }));

// ─── getScoreColor ────────────────────────────────────────────────────────────

describe('getScoreColor', () => {
  it('returns "text-success" for score >= 85', () => {
    expect(getScoreColor(85)).toBe('text-success');
    expect(getScoreColor(100)).toBe('text-success');
    expect(getScoreColor(90)).toBe('text-success');
  });

  it('returns "text-warning" for score in [70, 84]', () => {
    expect(getScoreColor(84)).toBe('text-warning');
    expect(getScoreColor(70)).toBe('text-warning');
    expect(getScoreColor(75)).toBe('text-warning');
  });

  it('returns "text-warning" for score in [50, 69] (same as 70-84 band)', () => {
    expect(getScoreColor(69)).toBe('text-warning');
    expect(getScoreColor(50)).toBe('text-warning');
    expect(getScoreColor(60)).toBe('text-warning');
  });

  it('returns "text-destructive" for score < 50', () => {
    expect(getScoreColor(49)).toBe('text-destructive');
    expect(getScoreColor(0)).toBe('text-destructive');
    expect(getScoreColor(25)).toBe('text-destructive');
  });

  it('returns a string type', () => {
    expect(typeof getScoreColor(80)).toBe('string');
  });

  it('boundary: 85 is success, 84 is warning', () => {
    expect(getScoreColor(85)).toBe('text-success');
    expect(getScoreColor(84)).toBe('text-warning');
  });

  it('boundary: 50 is warning, 49 is destructive', () => {
    expect(getScoreColor(50)).toBe('text-warning');
    expect(getScoreColor(49)).toBe('text-destructive');
  });
});

// ─── getScoreBg ───────────────────────────────────────────────────────────────

describe('getScoreBg', () => {
  it('returns "bg-success" for score >= 85', () => {
    expect(getScoreBg(85)).toBe('bg-success');
    expect(getScoreBg(100)).toBe('bg-success');
  });

  it('returns "bg-warning" for score in [70, 84]', () => {
    expect(getScoreBg(84)).toBe('bg-warning');
    expect(getScoreBg(70)).toBe('bg-warning');
  });

  it('returns "bg-warning" for score in [50, 69]', () => {
    expect(getScoreBg(69)).toBe('bg-warning');
    expect(getScoreBg(50)).toBe('bg-warning');
  });

  it('returns "bg-destructive" for score < 50', () => {
    expect(getScoreBg(49)).toBe('bg-destructive');
    expect(getScoreBg(0)).toBe('bg-destructive');
  });

  it('matches getScoreColor thresholds (bg- prefix instead of text-)', () => {
    const scores = [100, 84, 60, 30];
    scores.forEach(s => {
      const color = getScoreColor(s);
      const bg = getScoreBg(s);
      expect(bg).toBe(color.replace('text-', 'bg-'));
    });
  });

  it('boundary: 85 is bg-success, 84 is bg-warning', () => {
    expect(getScoreBg(85)).toBe('bg-success');
    expect(getScoreBg(84)).toBe('bg-warning');
  });

  it('boundary: 50 is bg-warning, 49 is bg-destructive', () => {
    expect(getScoreBg(50)).toBe('bg-warning');
    expect(getScoreBg(49)).toBe('bg-destructive');
  });
});

// ─── getRiskBadge ─────────────────────────────────────────────────────────────

describe('getRiskBadge', () => {
  it('returns label "Baixo" for low risk', () => {
    expect(getRiskBadge('low').label).toBe('Baixo');
  });

  it('returns success className for low risk', () => {
    expect(getRiskBadge('low').className).toContain('success');
  });

  it('returns label "Médio" for medium risk', () => {
    expect(getRiskBadge('medium').label).toBe('Médio');
  });

  it('returns warning className for medium risk', () => {
    expect(getRiskBadge('medium').className).toContain('warning');
  });

  it('returns label "Alto" for high risk', () => {
    expect(getRiskBadge('high').label).toBe('Alto');
  });

  it('returns warning className for high risk', () => {
    expect(getRiskBadge('high').className).toContain('warning');
  });

  it('returns label "Crítico" for critical risk', () => {
    expect(getRiskBadge('critical').label).toBe('Crítico');
  });

  it('returns destructive className for critical risk', () => {
    expect(getRiskBadge('critical').className).toContain('destructive');
  });

  it('returns object with label and className for each risk level', () => {
    (['low', 'medium', 'high', 'critical'] as const).forEach(risk => {
      const badge = getRiskBadge(risk);
      expect(typeof badge.label).toBe('string');
      expect(typeof badge.className).toBe('string');
    });
  });
});
