import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useFornecedores } from '../useFornecedores';

// Etapa QA 079 (VAL-12): createFornecedor gravava o id do TENANT na coluna
// organization_id, que e FK para organizations(id) — os dois ids sao de tabelas
// diferentes em producao (org df60b900..., tenant 39838251...), entao o insert
// violava a FK e o fornecedor nunca era cadastrado.

const ORG = 'df60b900-ede4-45db-8573-da40d13bf767';
const TENANT = '39838251-a1d7-4437-b47a-7329efe8f68f';

const inseridos: Array<Record<string, unknown>> = [];

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, organizationId: ORG, tenantId: TENANT }),
}));

vi.mock('@/lib/feedbackToast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/hooks/useRealtimeSubscription', () => ({
  useRealtimeSubscription: () => undefined,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: () => Promise.resolve({ data: 'FOR-011', error: null }),
    from: (table: string) => ({
      select: () => ({
        order: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
      }),
      insert: (payload: Record<string, unknown>) => {
        // audit_logs também passa por .insert(); só o de fornecedores importa aqui
        if (table === 'fornecedores') inseridos.push(payload);
        return {
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'f1', ...payload }, error: null }),
          }),
          then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }),
        };
      },
    }),
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useFornecedores · createFornecedor (VAL-12)', () => {
  beforeEach(() => { inseridos.length = 0; });

  it('grava organization_id com o id da ORGANIZACAO, nao o do tenant', async () => {
    const { result } = renderHook(() => useFornecedores(), { wrapper });

    await act(async () => {
      await result.current.createFornecedor({ razao_social: 'Fornecedor QA', tipo: 'nacional' });
    });

    expect(inseridos).toHaveLength(1);
    expect(inseridos[0].organization_id).toBe(ORG);
    expect(inseridos[0].organization_id).not.toBe(TENANT);
    expect(inseridos[0].tenant_id).toBe(TENANT);
  });
});