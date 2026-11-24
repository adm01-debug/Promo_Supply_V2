import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const thenable = (value: unknown) => ({
  then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(value).then(resolve, reject),
});

let updateResult: { data: unknown; error: unknown };
let insertResult: { data: unknown; error: unknown };
let deleteResult: { data: unknown; error: unknown };
const insertPayloads: Array<Record<string, unknown>> = [];
const deleteEqArgs: unknown[][] = [];

const updateBuilder = {
  eq: vi.fn(() => updateBuilder),
  select: vi.fn(() => thenable(updateResult)),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => updateBuilder),
      insert: vi.fn((payload: Record<string, unknown>) => {
        insertPayloads.push(payload);
        return {
          select: vi.fn(() => ({ single: vi.fn(() => thenable(insertResult)) })),
        };
      }),
      delete: vi.fn(() => {
        const builder: Record<string, unknown> = {};
        builder.eq = vi.fn((...args: unknown[]) => {
          deleteEqArgs.push(args);
          return builder;
        });
        builder.lt = vi.fn(() => thenable(deleteResult));
        builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(deleteResult).then(resolve);
        return builder;
      }),
    })),
  },
}));

vi.mock('@/lib/storageFiles', () => ({
  getStorageTenantId: vi.fn(() => Promise.resolve('tenant-1')),
}));

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), setTenantId: vi.fn() },
}));

vi.mock('@/lib/query-client', () => ({ queryClient: { clear: vi.fn(), invalidateQueries: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { warning: vi.fn(), error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

import { registerActiveSession, unregisterActiveSession, ACTIVE_SESSION_STORAGE_KEY } from '../hooks/useAuth';
import { logger } from '@/lib/logger';

const session = { expires_at: 1900000000 } as Session;
const USER_ID = '11111111-2222-3333-4444-555555555555';

beforeEach(() => {
  window.localStorage.clear();
  insertPayloads.length = 0;
  deleteEqArgs.length = 0;
  updateResult = { data: [], error: null };
  insertResult = { data: { id: 'sessao-1' }, error: null };
  deleteResult = { data: null, error: null };
  vi.mocked(logger.warn).mockClear();
});

describe('registerActiveSession (QA 038)', () => {
  it('grava o token curto que o trigger sanitize_session_token nao trunca e guarda o id', async () => {
    await registerActiveSession(USER_ID, session);

    expect(insertPayloads).toHaveLength(1);
    const payload = insertPayloads[0];
    expect(payload.user_id).toBe(USER_ID);
    expect(payload.tenant_id).toBe('tenant-1');
    expect(String(payload.session_token)).toMatch(/^[a-f0-9]{12}$/);
    expect(payload.expires_at).toBe(new Date(1900000000 * 1000).toISOString());
    expect(window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY)).toBe('sessao-1');
  });

  it('atualiza a linha existente em vez de criar outra sessao', async () => {
    window.localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, 'sessao-existente');
    updateResult = { data: [{ id: 'sessao-existente' }], error: null };

    await registerActiveSession(USER_ID, session);

    expect(insertPayloads).toHaveLength(0);
    expect(window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY)).toBe('sessao-existente');
  });

  it('cria linha nova quando a guardada nao pertence mais ao usuario', async () => {
    window.localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, 'sessao-de-outro');

    await registerActiveSession(USER_ID, session);

    expect(deleteEqArgs).toContainEqual(['user_id', USER_ID]);
    expect(insertPayloads).toHaveLength(1);
    expect(window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY)).toBe('sessao-1');
  });

  it('nao propaga erro de RLS: o login continua mesmo sem registrar a sessao', async () => {
    insertResult = { data: null, error: { message: 'new row violates row-level security policy' } };

    await expect(registerActiveSession(USER_ID, session)).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalled();
    expect(window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY)).toBeNull();
  });

  it('remove a linha desta sessao no logout', async () => {
    window.localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, 'sessao-1');

    await unregisterActiveSession();

    expect(deleteEqArgs).toContainEqual(['id', 'sessao-1']);
    expect(window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY)).toBeNull();
  });
});

describe('fiacao em useAuth (QA 038)', () => {
  const source = readFileSync(join(process.cwd(), 'src/features/auth/hooks/useAuth.tsx'), 'utf-8');

  it('registra a sessao no evento SIGNED_IN', () => {
    expect(source).toContain(
      "if (event === 'SIGNED_IN') void registerActiveSession(session.user.id, session);"
    );
  });

  it('remove a linha desta sessao antes do signOut do GoTrue', () => {
    const unregister = source.indexOf('await unregisterActiveSession();');
    const signOut = source.indexOf('await supabase.auth.signOut();');
    expect(unregister).toBeGreaterThan(-1);
    expect(signOut).toBeGreaterThan(-1);
    expect(unregister).toBeLessThan(signOut);
  });
});
