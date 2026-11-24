import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useNomesDeGestor } from '../useNomesDeGestor';

const { limitMock, inMock } = vi.hoisted(() => ({
  limitMock: vi.fn(),
  inMock: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        in: (coluna: string, ids: string[]) => {
          inMock(coluna, ids);
          return { limit: limitMock };
        },
      }),
    }),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useNomesDeGestor', () => {
  beforeEach(() => {
    inMock.mockClear();
    limitMock.mockReset();
  });

  it('resolve o nome do perfil por profiles.user_id', async () => {
    limitMock.mockResolvedValue({
      data: [{ user_id: 'user-9', full_name: 'Joao Silva', display_name: null, email: 'joao@acme.com' }],
      error: null,
    });

    const { result } = renderHook(() => useNomesDeGestor(['user-9']), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.get('user-9')).toBe('Joao Silva'));
    expect(inMock).toHaveBeenCalledWith('user_id', ['user-9']);
  });

  it('cai no e-mail quando o perfil nao tem nome nem display_name', async () => {
    limitMock.mockResolvedValue({
      data: [{ user_id: 'user-2', full_name: null, display_name: null, email: 'maria@acme.com' }],
      error: null,
    });

    const { result } = renderHook(() => useNomesDeGestor(['user-2']), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.get('user-2')).toBe('maria@acme.com'));
  });

  it('deduplica ids, descarta vazio e nao consulta sem id', async () => {
    limitMock.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(
      () => useNomesDeGestor(['user-9', 'user-9', '  ', null, undefined]),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(inMock).toHaveBeenCalledTimes(1));
    expect(inMock).toHaveBeenCalledWith('user_id', ['user-9']);

    const vazio = renderHook(() => useNomesDeGestor([]), { wrapper: createWrapper() });
    expect(vazio.result.current.size).toBe(0);
    expect(inMock).toHaveBeenCalledTimes(1);
    expect(result.current.size).toBe(0);
  });

  it('erro na leitura dos perfis nao quebra a lista: devolve mapa vazio', async () => {
    limitMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } });

    const { result } = renderHook(() => useNomesDeGestor(['user-9']), { wrapper: createWrapper() });

    await waitFor(() => expect(limitMock).toHaveBeenCalled());
    expect(result.current.size).toBe(0);
  });
});
