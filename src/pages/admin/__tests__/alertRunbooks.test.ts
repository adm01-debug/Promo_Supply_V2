import { describe, it, expect } from 'vitest';
import { getRunbook } from '../alertRunbooks';

// ─── alertRunbooks ────────────────────────────────────────────────────────────

const KNOWN_ALERT_TYPES = [
  'xid_wraparound_warning',
  'replication_lag_critical',
  'deadlock_detected',
  'sequence_overflow_warning',
  'unused_indexes_detected',
  'fk_without_index',
  'long_running_transaction',
  'slack_webhook_down',
] as const;

describe('getRunbook', () => {
  it('returns generic runbook for null', () => {
    const result = getRunbook(null);
    expect(result.title).toBe('Runbook genérico');
  });

  it('returns generic runbook for undefined', () => {
    const result = getRunbook(undefined);
    expect(result.title).toBe('Runbook genérico');
  });

  it('returns generic runbook for empty string', () => {
    const result = getRunbook('');
    expect(result.title).toBe('Runbook genérico');
  });

  it('returns generic runbook for unknown alert type', () => {
    const result = getRunbook('totally_unknown_alert');
    expect(result.title).toBe('Runbook genérico');
  });

  it('returns dedicated runbook for xid_wraparound_warning', () => {
    const result = getRunbook('xid_wraparound_warning');
    expect(result.title).toBe('Aviso de XID Wraparound');
  });

  it('returns dedicated runbook for replication_lag_critical', () => {
    const result = getRunbook('replication_lag_critical');
    expect(result.title).toBe('Lag de replicação crítico');
  });

  it('returns dedicated runbook for deadlock_detected', () => {
    const result = getRunbook('deadlock_detected');
    expect(result.title).toBe('Deadlock detectado');
  });

  it('returns dedicated runbook for sequence_overflow_warning', () => {
    const result = getRunbook('sequence_overflow_warning');
    expect(result.title).toBe('Sequence próxima do overflow');
  });

  it('returns dedicated runbook for unused_indexes_detected', () => {
    const result = getRunbook('unused_indexes_detected');
    expect(result.title).toBe('Índices sem uso');
  });

  it('returns dedicated runbook for fk_without_index', () => {
    const result = getRunbook('fk_without_index');
    expect(result.title).toBe('FK sem índice de suporte');
  });

  it('returns dedicated runbook for long_running_transaction', () => {
    const result = getRunbook('long_running_transaction');
    expect(result.title).toBe('Transação de longa duração');
  });

  it('returns dedicated runbook for slack_webhook_down', () => {
    const result = getRunbook('slack_webhook_down');
    expect(result.title).toBe('Watchdog Slack falhando');
  });

  it('every known runbook has a non-empty symptom', () => {
    KNOWN_ALERT_TYPES.forEach(alertType => {
      expect(getRunbook(alertType).symptom.length).toBeGreaterThan(0);
    });
  });

  it('every known runbook has a non-empty impact', () => {
    KNOWN_ALERT_TYPES.forEach(alertType => {
      expect(getRunbook(alertType).impact.length).toBeGreaterThan(0);
    });
  });

  it('every known runbook has at least 2 steps', () => {
    KNOWN_ALERT_TYPES.forEach(alertType => {
      expect(getRunbook(alertType).steps.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('every step is a non-empty string', () => {
    KNOWN_ALERT_TYPES.forEach(alertType => {
      getRunbook(alertType).steps.forEach(step => {
        expect(typeof step).toBe('string');
        expect(step.length).toBeGreaterThan(0);
      });
    });
  });

  it('generic runbook has 4 steps', () => {
    expect(getRunbook(null).steps).toHaveLength(4);
  });

  it('generic runbook has symptom and impact', () => {
    const generic = getRunbook(null);
    expect(typeof generic.symptom).toBe('string');
    expect(typeof generic.impact).toBe('string');
  });
});
