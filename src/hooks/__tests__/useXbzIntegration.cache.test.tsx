import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Onda 141 — garante que a camada de rede da XBZ:
 *  1) coalesce chamadas idempotentes simultâneas (1 request para N chamadores);
 *  2) serve tabelas estáticas do cache TTL sem tocar no portal;
 *  3) NUNCA coalesce/cacheia escritas (itemLancar, gerarPedidos…).
 */

const invoke = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

vi.mock('@/lib/feedbackToast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { useXbzIntegration, clearXbzStaticCache } from '../useXbzIntegration';

/** Resposta no formato do envelope do `xbz-proxy`. */
function ok<T>(data: T) {
  return Promise.resolve({ data: { data }, error: null });
}

describe('useXbzIntegration — coalescing e cache', () => {
  beforeEach(() => {
    invoke.mockReset();
    clearXbzStaticCache();
  });

  it('coalesce chamadas idempotentes concorrentes em uma única requisição', async () => {
    let resolveCall: ((v: unknown) => void) | undefined;
    invoke.mockImplementation(
      () => new Promise((resolve) => { resolveCall = resolve; }),
    );

    const { result } = renderHook(() => useXbzIntegration());

    let pending: Promise<unknown> | undefined;
    await act(async () => {
      pending = Promise.all([
        result.current.getCores(),
        result.current.getCores(),
        result.current.getCores(),
      ]);
      await Promise.resolve();
      resolveCall?.({ data: { data: [{ Id: 1, NomeCor: 'Azul', SiglaCor: 'AZ' }] }, error: null });
      await pending;
    });

    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('serve tabelas estáticas do cache na segunda chamada', async () => {
    invoke.mockImplementation(() => ok([{ id: 1, nome: 'Sedex' }]));

    const { result } = renderHook(() => useXbzIntegration());

    await act(async () => { await result.current.getEntregaTipos(); });
    await act(async () => { await result.current.getEntregaTipos(); });

    expect(invoke).toHaveBeenCalledTimes(1);

    clearXbzStaticCache();
    await act(async () => { await result.current.getEntregaTipos(); });
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it('não cacheia nem coalesce ações de escrita', async () => {
    invoke.mockImplementation(() => ok({ ok: true }));

    const { result } = renderHook(() => useXbzIntegration());

    await act(async () => { await result.current.adicionarItem(10, 1); });
    await act(async () => { await result.current.adicionarItem(10, 1); });

    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it('propaga erro sem envenenar o cache estático', async () => {
    invoke.mockImplementationOnce(() =>
      Promise.resolve({ data: null, error: { message: 'boom', context: { status: 400 } } }),
    );
    invoke.mockImplementation(() => ok([{ id: 2, nome: 'Boleto' }]));

    const { result } = renderHook(() => useXbzIntegration());

    await act(async () => { await result.current.getPagamentoTipos(); });
    await waitFor(() => expect(result.current.error).toBeTruthy());

    await act(async () => { await result.current.getPagamentoTipos(); });
    expect(invoke).toHaveBeenCalledTimes(2);
  });
});
