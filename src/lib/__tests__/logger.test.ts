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

        // SEC-07 (etapas 054/055): dados pessoais saem redigidos do contexto.
        it('redacts personal data keys', () => {
          const result = loggerAny.sanitizeContext({
            email: 'alice@example.com',
            cpf: '12345678901',
            cnpj: '12345678000190',
            telefone: '11999998888',
            phone: '+5511999998888',
            endereco: 'Rua X, 1',
            address: 'Street Y, 2',
            name: 'Alice',
          });
          for (const key of ['email', 'cpf', 'cnpj', 'telefone', 'phone', 'endereco', 'address']) {
            expect(result![key]).toBe('[REDACTED]');
          }
          expect(result!.name).toBe('Alice');
        });

        it('redacts sensitive keys nested one level deep', () => {
          const result = loggerAny.sanitizeContext({
            input: { cnpj: '12345678000190', razaoSocial: 'ACME' },
          });
          expect((result!.input as Record<string, unknown>).cnpj).toBe('[REDACTED]');
          expect((result!.input as Record<string, unknown>).razaoSocial).toBe('ACME');
        });

        it('redacts sensitive keys nested inside arrays', () => {
          const result = loggerAny.sanitizeContext({
            items: [{ email: 'a@b.com' }, { email: 'c@d.com' }],
          });
          const items = result!.items as Array<Record<string, unknown>>;
          expect(items[0].email).toBe('[REDACTED]');
          expect(items[1].email).toBe('[REDACTED]');
        });

        it('stops recursing at the depth limit', () => {
          let deep: Record<string, unknown> = { email: 'deep@example.com' };
          for (let i = 0; i < 8; i++) deep = { nested: deep };
          const result = loggerAny.sanitizeContext(deep);
          expect(JSON.stringify(result)).not.toContain('deep@example.com');
        });

        it('does not mutate nested originals', () => {
          const nested = { cnpj: '12345678000190' };
          loggerAny.sanitizeContext({ input: nested });
          expect(nested.cnpj).toBe('12345678000190');
        });

        it('keeps non plain values (Date, Error) intact', () => {
          const when = new Date('2026-01-01T00:00:00.000Z');
          const err = new Error('boom');
          const result = loggerAny.sanitizeContext({ when, err });
          expect(result!.when).toBe(when);
          expect(result!.err).toBe(err);
        });
  });
});
