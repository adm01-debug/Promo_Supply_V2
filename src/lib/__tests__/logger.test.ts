import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../logger';

// ─── logger ───────────────────────────────────────────────────────────────────

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
}));

// Access private methods via any cast for sanitization testing
const loggerAny = logger as unknown as {
  sanitizeContext: (ctx?: Record<string, unknown>) => Record<string, unknown> | undefined;
  tenantId: string | null;
};

describe('logger', () => {
  // ── singleton ────────────────────────────────────────────────────────────────

  it('is a singleton (same instance on re-import)', async () => {
    const { logger: logger2 } = await import('../logger');
    expect(logger2).toBe(logger);
  });

  // ── getRequestId ──────────────────────────────────────────────────────────────

  it('getRequestId() returns a non-empty string', () => {
    expect(typeof logger.getRequestId()).toBe('string');
    expect(logger.getRequestId().length).toBeGreaterThan(0);
  });

  it('getRequestId() returns the same value on repeated calls', () => {
    expect(logger.getRequestId()).toBe(logger.getRequestId());
  });

  it('getRequestId() looks like a UUID (32 hex chars + 4 dashes)', () => {
    const id = logger.getRequestId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  // ── setTenantId ───────────────────────────────────────────────────────────────

  it('setTenantId() does not throw', () => {
    expect(() => logger.setTenantId('tenant-1')).not.toThrow();
  });

  it('setTenantId(null) does not throw', () => {
    expect(() => logger.setTenantId(null)).not.toThrow();
  });

  it('setTenantId() updates the tenantId field', () => {
    logger.setTenantId('my-tenant');
    expect(loggerAny.tenantId).toBe('my-tenant');
    logger.setTenantId(null);
  });

  // ── public log methods ─────────────────────────────────────────────────────────

  it('info() does not throw', () => {
    expect(() => logger.info('hello')).not.toThrow();
  });

  it('warn() does not throw', () => {
    expect(() => logger.warn('careful')).not.toThrow();
  });

  it('error() does not throw', () => {
    expect(() => logger.error('oops')).not.toThrow();
  });

  it('debug() does not throw', () => {
    expect(() => logger.debug('debugging')).not.toThrow();
  });

  it('all log methods accept an optional context object', () => {
    const ctx = { userId: 'u1', action: 'save' };
    expect(() => logger.info('msg', ctx)).not.toThrow();
    expect(() => logger.warn('msg', ctx)).not.toThrow();
    expect(() => logger.error('msg', ctx)).not.toThrow();
    expect(() => logger.debug('msg', ctx)).not.toThrow();
  });

  // ── sanitizeContext (private, accessed via any) ────────────────────────────────

  describe('sanitizeContext', () => {
    it('returns undefined when no context provided', () => {
      expect(loggerAny.sanitizeContext(undefined)).toBeUndefined();
    });

    it('passes through non-sensitive keys unchanged', () => {
      const result = loggerAny.sanitizeContext({ userId: 'u1', action: 'save' });
      expect(result).toEqual({ userId: 'u1', action: 'save' });
    });

    it('redacts keys containing "password"', () => {
      const result = loggerAny.sanitizeContext({ password: 'hunter2', username: 'alice' });
      expect(result!.password).toBe('[REDACTED]');
      expect(result!.username).toBe('alice');
    });

    it('redacts keys containing "token"', () => {
      const result = loggerAny.sanitizeContext({ accessToken: 'abc123', page: 1 });
      expect(result!.accessToken).toBe('[REDACTED]');
    });

    it('redacts keys containing "secret"', () => {
      const result = loggerAny.sanitizeContext({ apiSecret: 'shhh', name: 'test' });
      expect(result!.apiSecret).toBe('[REDACTED]');
    });

    it('redacts keys containing "key" (case-insensitive)', () => {
      const result = loggerAny.sanitizeContext({ apiKey: 'xyz', label: 'ok' });
      expect(result!.apiKey).toBe('[REDACTED]');
    });

    it('redacts keys containing "auth"', () => {
      const result = loggerAny.sanitizeContext({ authHeader: 'Bearer x', id: 1 });
      expect(result!.authHeader).toBe('[REDACTED]');
    });

    it('redacts keys containing "cvv"', () => {
      const result = loggerAny.sanitizeContext({ cvv: '123', amount: 100 });
      expect(result!.cvv).toBe('[REDACTED]');
    });

    it('is case-insensitive: "PASSWORD" is also redacted', () => {
      const result = loggerAny.sanitizeContext({ PASSWORD: 'secret' });
      expect(result!.PASSWORD).toBe('[REDACTED]');
    });

    it('does not mutate the original context object', () => {
      const ctx = { password: 'pw', name: 'Alice' };
      loggerAny.sanitizeContext(ctx);
      expect(ctx.password).toBe('pw'); // original unchanged
    });

    it('handles empty context object', () => {
      expect(loggerAny.sanitizeContext({})).toEqual({});
    });

    it('redacts multiple sensitive keys in one call', () => {
      const result = loggerAny.sanitizeContext({
        password: 'pw',
        token: 'tok',
        name: 'Alice',
      });
      expect(result!.password).toBe('[REDACTED]');
      expect(result!.token).toBe('[REDACTED]');
      expect(result!.name).toBe('Alice');
    });
  });
});
