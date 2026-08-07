import { describe, it, expect, vi } from 'vitest';

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
vi.mock('lucide-react', () => ({
  CheckCircle2: { displayName: 'CheckCircle2' },
  Clock: { displayName: 'Clock' },
  AlertTriangle: { displayName: 'AlertTriangle' },
  XCircle: { displayName: 'XCircle' },
  Loader2: { displayName: 'Loader2' },
  Zap: { displayName: 'Zap' },
  Minus: { displayName: 'Minus' },
}));

import { statusConfigs } from '../StatusIndicator';
import type { StatusType } from '../StatusIndicator';

// ─── statusConfigs ────────────────────────────────────────────────────────────

const STATUS_TYPES: StatusType[] = [
  'pending', 'processing', 'approved', 'completed', 'cancelled',
  'error', 'warning', 'info', 'draft', 'active', 'inactive',
  'success', 'neutral',
];

describe('statusConfigs', () => {
  it('has 13 status entries', () => {
    expect(Object.keys(statusConfigs)).toHaveLength(13);
  });

  it('covers all expected StatusType values', () => {
    STATUS_TYPES.forEach(status => {
      expect(statusConfigs[status]).toBeDefined();
    });
  });

  it('every entry has a non-empty label string', () => {
    STATUS_TYPES.forEach(status => {
      expect(typeof statusConfigs[status].label).toBe('string');
      expect(statusConfigs[status].label.length).toBeGreaterThan(0);
    });
  });

  it('every entry has a non-empty color string', () => {
    STATUS_TYPES.forEach(status => {
      expect(typeof statusConfigs[status].color).toBe('string');
      expect(statusConfigs[status].color.length).toBeGreaterThan(0);
    });
  });

  it('every entry has a non-empty bgColor string', () => {
    STATUS_TYPES.forEach(status => {
      expect(typeof statusConfigs[status].bgColor).toBe('string');
      expect(statusConfigs[status].bgColor.length).toBeGreaterThan(0);
    });
  });

  it('every entry has a non-empty textColor string', () => {
    STATUS_TYPES.forEach(status => {
      expect(typeof statusConfigs[status].textColor).toBe('string');
      expect(statusConfigs[status].textColor.length).toBeGreaterThan(0);
    });
  });

  it('all color classes start with "bg-"', () => {
    STATUS_TYPES.forEach(status => {
      expect(statusConfigs[status].color).toMatch(/^bg-/);
    });
  });

  it('all bgColor classes start with "bg-"', () => {
    STATUS_TYPES.forEach(status => {
      expect(statusConfigs[status].bgColor).toMatch(/^bg-/);
    });
  });

  it('all textColor classes start with "text-"', () => {
    STATUS_TYPES.forEach(status => {
      expect(statusConfigs[status].textColor).toMatch(/^text-/);
    });
  });

  it('pending label is "Pendente"', () => {
    expect(statusConfigs.pending.label).toBe('Pendente');
  });

  it('approved label is "Aprovado"', () => {
    expect(statusConfigs.approved.label).toBe('Aprovado');
  });

  it('cancelled label is "Cancelado"', () => {
    expect(statusConfigs.cancelled.label).toBe('Cancelado');
  });

  it('error uses destructive color', () => {
    expect(statusConfigs.error.color).toContain('destructive');
  });

  it('cancelled uses destructive color', () => {
    expect(statusConfigs.cancelled.color).toContain('destructive');
  });

  it('approved uses success color', () => {
    expect(statusConfigs.approved.color).toContain('success');
  });

  it('completed uses success color', () => {
    expect(statusConfigs.completed.color).toContain('success');
  });

  it('pending has a pulseColor', () => {
    expect(statusConfigs.pending.pulseColor).toBeDefined();
    expect(typeof statusConfigs.pending.pulseColor).toBe('string');
  });

  it('processing has a pulseColor', () => {
    expect(statusConfigs.processing.pulseColor).toBeDefined();
  });

  it('all labels are unique', () => {
    const labels = STATUS_TYPES.map(s => statusConfigs[s].label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
