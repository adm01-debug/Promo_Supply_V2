/**
 * HK-05 / etapa 191: os cartoes de solicitacao viviam em `['solicitacoes-kpis', ...]`,
 * namespace IRMAO do `['solicitacoes']` que as mutacoes (`useSolicitacoes.ts:173`) e o
 * realtime (`Solicitacoes.tsx:131`, `queryKeysToInvalidate: [['solicitacoes']]`) invalidam.
 * Como o match de chave do TanStack e posicional, o cartao ficava com o numero anterior
 * ate o `staleTime` de 60 s expirar.
 *
 * O teste monta o hook de KPI real, invalida o prefixo da entidade (o que as mutacoes
 * fazem) e exige o RPC chamado de novo. Contra o codigo anterior falha, porque a chave do
 * KPI nao comeca por `['solicitacoes']`.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const h = vi.hoisted(() => ({
  rpc: vi.fn(async () => ({ data: { total: 4, pendentes: 2, emCotacao: 1, aprovadas: 1, concluidas: 0, valorTotal: 50 }, error: null })),
}));

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'u@x.com' }, organizationId: 'org-1' }),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: h.rpc } }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('@/lib/feedbackToast', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }));
vi.mock('@/services/auditService', () => ({ auditHelpers: { logCreate: vi.fn(), logUpdate: vi.fn(), logDelete: vi.fn() } }));
vi.mock('@/hooks/useApprovalWorkflow', () => ({ useApprovalWorkflow: () => ({ criarWorkflow: vi.fn() }) }));
vi.mock('@/lib/paginatedFetch', () => ({ fetchAllRows: vi.fn(async () => []) }));
vi.mock('@/lib/supabaseQuery', () => ({ escapeIlike: (v: string) => v }));
vi.mock('@/features/solicitacoes', () => ({ CreateSolicitacaoSchema: { parse: (v: unknown) => v } }));

import { useSolicitacoesKPIs } from '@/features/solicitacoes/hooks/useSolicitacoes';

describe('useSolicitacoesKPIs - alcance do invalidate (etapa 191)', () => {
  it('invalidar o prefixo [solicitacoes] refaz a consulta dos cartoes', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSolicitacoesKPIs(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    const chamadasIniciais = h.rpc.mock.calls.length;
    expect(chamadasIniciais).toBeGreaterThan(0);

    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
    });

    await waitFor(() => expect(h.rpc.mock.calls.length).toBe(chamadasIniciais + 1));
  });
});