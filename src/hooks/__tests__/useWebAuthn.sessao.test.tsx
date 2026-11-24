import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebAuthn } from '../useWebAuthn';
import { toast } from '@/lib/feedbackToast';

// Etapa QA 061 (SEC-11): `authenticateWithPasskey` considerava sucesso sempre que
// o `finish` nao lancasse erro - mesmo sem actionLink, sem token ou sem sessao.
// Auth.tsx navegava para '/' e o usuario ficava numa tela autenticada sem sessao.

const { invokeMock, verifyOtpMock, getSessionMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  verifyOtpMock: vi.fn(),
  getSessionMock: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: invokeMock },
    auth: { verifyOtp: verifyOtpMock, getSession: getSessionMock },
    from: () => {
      const q: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'order', 'delete', 'insert', 'update']) q[m] = () => q;
      q.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null });
      return q;
    },
  },
}));

vi.mock('@/lib/feedbackToast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

const START = {
  options: {
    challenge: 'AAAA',
    timeout: 60000,
    rpId: 'localhost',
    allowCredentials: [],
    userVerification: 'preferred',
  },
};

function arranjarCredencial() {
  Object.defineProperty(window.navigator, 'credentials', {
    configurable: true,
    value: {
      get: vi.fn().mockResolvedValue({
        id: 'cred-1',
        rawId: new ArrayBuffer(8),
        type: 'public-key',
        response: {
          authenticatorData: new ArrayBuffer(8),
          clientDataJSON: new ArrayBuffer(8),
          signature: new ArrayBuffer(8),
          userHandle: null,
        },
      }),
    },
  });
  vi.stubGlobal('PublicKeyCredential', function PublicKeyCredential() {});
}

const finalizarCom = (data: unknown) =>
  invokeMock.mockImplementation((_fn: string, args: { body: { action: string } }) =>
    Promise.resolve({
      data: args.body.action === 'start' ? START : data,
      error: null,
    }),
  );

describe('useWebAuthn / authenticateWithPasskey (SEC-11)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    arranjarCredencial();
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null });
    verifyOtpMock.mockResolvedValue({ data: {}, error: null });
  });

  it('nao anuncia sucesso quando o servidor nao devolve actionLink', async () => {
    finalizarCom({ userId: 'u1' });
    const { result } = renderHook(() => useWebAuthn());

    let retorno: Awaited<ReturnType<typeof result.current.authenticateWithPasskey>> | undefined;
    await act(async () => {
      retorno = await result.current.authenticateWithPasskey('a@b.c');
    });

    expect(retorno?.success).toBe(false);
    expect(toast.success).not.toHaveBeenCalled();
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it('nao anuncia sucesso quando o OTP falha', async () => {
    finalizarCom({ actionLink: 'https://app/auth/confirm?token=abc&type=magiclink', userId: 'u1' });
    verifyOtpMock.mockResolvedValue({ data: {}, error: { message: 'invalid token' } });
    const { result } = renderHook(() => useWebAuthn());

    let retorno: Awaited<ReturnType<typeof result.current.authenticateWithPasskey>> | undefined;
    await act(async () => {
      retorno = await result.current.authenticateWithPasskey('a@b.c');
    });

    expect(retorno?.success).toBe(false);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('nao anuncia sucesso quando o OTP passa mas nao ha sessao', async () => {
    finalizarCom({ actionLink: 'https://app/auth/confirm?token=abc&type=magiclink', userId: 'u1' });
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
    const { result } = renderHook(() => useWebAuthn());

    let retorno: Awaited<ReturnType<typeof result.current.authenticateWithPasskey>> | undefined;
    await act(async () => {
      retorno = await result.current.authenticateWithPasskey('a@b.c');
    });

    expect(retorno?.success).toBe(false);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('anuncia sucesso quando a sessao existe de verdade', async () => {
    finalizarCom({ actionLink: 'https://app/auth/confirm?token=abc&type=magiclink', userId: 'u1' });
    const { result } = renderHook(() => useWebAuthn());

    let retorno: Awaited<ReturnType<typeof result.current.authenticateWithPasskey>> | undefined;
    await act(async () => {
      retorno = await result.current.authenticateWithPasskey('a@b.c');
    });

    expect(retorno?.success).toBe(true);
    expect(toast.success).toHaveBeenCalled();
  });
});
