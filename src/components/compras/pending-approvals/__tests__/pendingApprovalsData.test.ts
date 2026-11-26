import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  mockPendingApprovals,
  getTimeStatus,
  getTimeProgress,
} from '../pendingApprovalsData';

// ─── mockPendingApprovals ─────────────────────────────────────────────────────

describe('mockPendingApprovals', () => {
  it('has 3 items', () => {
    expect(mockPendingApprovals).toHaveLength(3);
  });

  it('each item has required string fields', () => {
    mockPendingApprovals.forEach(item => {
      expect(typeof item.id).toBe('string');
      expect(typeof item.solicitacao_numero).toBe('string');
      expect(typeof item.descricao).toBe('string');
      expect(typeof item.solicitante).toBe('string');
      expect(typeof item.categoria).toBe('string');
    });
  });

  it('each item has numeric fields', () => {
    mockPendingApprovals.forEach(item => {
      expect(typeof item.valor).toBe('number');
      expect(typeof item.etapa_atual).toBe('number');
      expect(typeof item.total_etapas).toBe('number');
    });
  });

  it('second item (index 1) is urgente', () => {
    expect(mockPendingApprovals[1].urgente).toBe(true);
  });

  it('third item (index 2) is escalado', () => {
    expect(mockPendingApprovals[2].escalado).toBe(true);
  });

  it('first item is neither urgente nor escalado', () => {
    expect(mockPendingApprovals[0].urgente).toBe(false);
    expect(mockPendingApprovals[0].escalado).toBe(false);
  });

  it('third item has multiple aprovadores_anteriores', () => {
    expect(mockPendingApprovals[2].aprovadores_anteriores.length).toBeGreaterThan(1);
  });

  it('each item has valid ISO timestamps', () => {
    mockPendingApprovals.forEach(item => {
      expect(() => new Date(item.data_solicitacao)).not.toThrow();
      expect(() => new Date(item.prazo_limite)).not.toThrow();
    });
  });
});

// ─── getTimeStatus ────────────────────────────────────────────────────────────

describe('getTimeStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "overdue" status when deadline is in the past', () => {
    const pastDeadline = new Date('2024-06-15T06:00:00Z').toISOString(); // 6h ago
    const result = getTimeStatus(pastDeadline);
    expect(result.status).toBe('overdue');
  });

  it('returns text-destructive color for overdue', () => {
    const past = new Date('2024-06-15T06:00:00Z').toISOString();
    expect(getTimeStatus(past).color).toBe('text-destructive');
  });

  it('returns bg-destructive bgColor for overdue', () => {
    const past = new Date('2024-06-15T06:00:00Z').toISOString();
    expect(getTimeStatus(past).bgColor).toBe('bg-destructive');
  });

  it('includes hours in label for overdue', () => {
    const past = new Date('2024-06-15T06:00:00Z').toISOString(); // 6h ago
    const result = getTimeStatus(past);
    expect(result.label).toContain('Atrasado');
    expect(result.label).toContain('6h');
  });

  it('returns "critical" status when deadline is within 4 hours', () => {
    const soonDeadline = new Date('2024-06-15T14:00:00Z').toISOString(); // 2h from now
    const result = getTimeStatus(soonDeadline);
    expect(result.status).toBe('critical');
  });

  it('returns text-warning color for critical', () => {
    const soon = new Date('2024-06-15T14:00:00Z').toISOString();
    expect(getTimeStatus(soon).color).toBe('text-warning');
  });

  it('returns bg-warning bgColor for critical', () => {
    const soon = new Date('2024-06-15T14:00:00Z').toISOString();
    expect(getTimeStatus(soon).bgColor).toBe('bg-warning');
  });

  it('label includes remaining hours for critical', () => {
    const soon = new Date('2024-06-15T14:00:00Z').toISOString(); // 2h
    const result = getTimeStatus(soon);
    expect(result.label).toContain('2h');
    expect(result.label).toContain('restantes');
  });

  it('returns "normal" status when deadline is more than 4 hours away', () => {
    const farDeadline = new Date('2024-06-16T00:00:00Z').toISOString(); // 12h from now
    const result = getTimeStatus(farDeadline);
    expect(result.status).toBe('normal');
  });

  it('returns text-info color for normal', () => {
    const far = new Date('2024-06-16T00:00:00Z').toISOString();
    expect(getTimeStatus(far).color).toBe('text-info');
  });

  it('returns bg-info bgColor for normal', () => {
    const far = new Date('2024-06-16T00:00:00Z').toISOString();
    expect(getTimeStatus(far).bgColor).toBe('bg-info');
  });

  it('label includes remaining hours for normal', () => {
    const far = new Date('2024-06-16T00:00:00Z').toISOString(); // 12h
    const result = getTimeStatus(far);
    expect(result.label).toContain('12h');
    expect(result.label).toContain('restantes');
  });

  it('exactly 4 hours remaining is critical (boundary)', () => {
    const exactly4h = new Date('2024-06-15T16:00:00Z').toISOString();
    expect(getTimeStatus(exactly4h).status).toBe('critical');
  });

  it('result has status, color, bgColor, label properties', () => {
    const deadline = new Date('2024-06-16T00:00:00Z').toISOString();
    const result = getTimeStatus(deadline);
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('color');
    expect(result).toHaveProperty('bgColor');
    expect(result).toHaveProperty('label');
  });
});

// ─── getTimeProgress ──────────────────────────────────────────────────────────

describe('getTimeProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns approximately 50 when halfway between start and deadline', () => {
    const start = new Date('2024-06-15T00:00:00Z').toISOString(); // 12h ago
    const end = new Date('2024-06-16T00:00:00Z').toISOString();   // 12h from now
    const result = getTimeProgress(start, end);
    expect(result).toBeCloseTo(50, 0);
  });

  it('returns 100 when current time is past the deadline', () => {
    const start = new Date('2024-06-14T00:00:00Z').toISOString();
    const end = new Date('2024-06-15T06:00:00Z').toISOString(); // 6h ago
    expect(getTimeProgress(start, end)).toBe(100);
  });

  it('returns 0 when current time is before the start', () => {
    const start = new Date('2024-06-16T00:00:00Z').toISOString(); // future start
    const end = new Date('2024-06-17T00:00:00Z').toISOString();
    expect(getTimeProgress(start, end)).toBe(0);
  });

  it('returns value between 0 and 100', () => {
    const start = new Date('2024-06-15T06:00:00Z').toISOString();
    const end = new Date('2024-06-15T18:00:00Z').toISOString();
    const result = getTimeProgress(start, end);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it('returns a number', () => {
    const start = new Date('2024-06-15T00:00:00Z').toISOString();
    const end = new Date('2024-06-16T00:00:00Z').toISOString();
    expect(typeof getTimeProgress(start, end)).toBe('number');
  });
});
