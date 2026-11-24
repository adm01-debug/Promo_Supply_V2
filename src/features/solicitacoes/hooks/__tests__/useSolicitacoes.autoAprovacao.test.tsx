import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const h = vi.hoisted(() => ({
  criarWorkflow: vi.fn(async () => ({ id: 'wf-1' })),
  inserir: vi.fn(),
  sucesso: vi.fn(),
  logCreate: vi.fn(async () => undefined),
}));

vi.mock('@/features/auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'compras@empresa.com' },
    organizationId: 'org-1',
    loading: false,
  }),
}));
vi.mock('@/hooks/useApprovalWorkflow', () => ({
  useApprovalWorkflow: () => ({ createWorkflow: h.criarWorkflow }),
}));
vi.mock('@/services/auditService', () => ({
  auditHelpers: { logCreate: h.logCreate },
}));
vi.mock('@/lib/feedbackToast', () => ({
  toast: { success: h.sucesso, error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/paginatedFetch', () => ({ fetchAllRows: vi.fn(async () => []) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(async () => ({ data: 'SOL-0001', error: null })),
    from: vi.fn(() => ({
      insert: () => ({ select: () => ({ single: async () => h.inserir() }) }),
      select: vi.fn(() => ({ eq: vi.fn(() => ({ data: [], error: null })) })),
    })),
  },
}));

import { useSolicitacoes } from '../useSolicitacoes';

const entrada = {
  titulo: 'Compra de teste',
  tipo: 'produto',
  prioridade: 'media' as const,
  valor_estimado: 500,
  quantidade: 1,
  unidade: 'un',
};

function criarWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

async function criar(entradaUsada: typeof entrada) {
  const { result } = renderHook(() => useSolicitacoes(), { wrapper: criarWrapper() });
  await act(async () => {
    await result.current.createSolicitacao(entradaUsada);
  });
}

beforeEach(() => {
  h.criarWorkflow.mockClear();
  h.inserir.mockReset();
  h.sucesso.mockClear();
  h.logCreate.mockClear();
});

afterEach(() => {
  cleanup();
});

describe('createSolicitacao com auto aprovacao do banco', () => {
  it('nao cria workflow quando o banco devolve a solicitacao ja aprovada', async () => {
    h.inserir.mockResolvedValue({
      data: { id: 'sol-1', numero: 'SOL-0001', status: 'aprovada' },
      error: null,
    });

    await criar(entrada);
    await waitFor(() => expect(h.sucesso).toHaveBeenCalled());

    expect(h.criarWorkflow).not.toHaveBeenCalled();
    expect(h.logCreate).toHaveBeenCalledTimes(1);
    expect(String(h.sucesso.mock.calls[0][0])).toContain('aprovada automaticamente');
  });

  it('cria o workflow quando o banco devolve a solicitacao pendente', async () => {
    h.inserir.mockResolvedValue({
      data: { id: 'sol-2', numero: 'SOL-0002', status: 'pendente' },
      error: null,
    });

    await criar(entrada);
    await waitFor(() => expect(h.sucesso).toHaveBeenCalled());

    expect(h.criarWorkflow).toHaveBeenCalledTimes(1);
    expect(h.criarWorkflow).toHaveBeenCalledWith('sol-2', 500, undefined);
    expect(String(h.sucesso.mock.calls[0][0])).toContain('enviada para aprova');
  });
});
