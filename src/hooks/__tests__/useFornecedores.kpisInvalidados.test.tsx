/**
 * HK-05 / etapa 191: os cartoes de fornecedor viviam em `['fornecedores-kpis', ...]`,
 * namespace IRMAO do `['fornecedores']` que as mutacoes (`useFornecedores.ts:180,205,264`)
 * e o realtime (`:276`, `queryKeysToInvalidate: [['fornecedores']]`) invalidam. Chave
 * irma, match posicional: o invalidate nunca alcancava os cartoes, que so se atualizavam
 * quando o `staleTime` de 60 s expirava.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const h = vi.hoisted(() => ({
  rpc: vi.fn(async () => ({ data: { total: 8, ativos: 7, integradosApi: 2, mediaAvaliacao: 4.5 }, error: null })),
}));

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'u@x.com' }, organizationId: 'org-1' }),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: h.rpc } }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('@/lib/feedbackToast', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }));
vi.mock('@/services/auditService', () => ({ auditHelpers: { logCreate: vi.fn(), logUpdate: vi.fn(), logDelete: vi.fn() } }));
vi.mock('@/hooks/useRealtimeSubscription', () => ({ useRealtimeSubscription: () => undefined }));
vi.mock('@/lib/supabaseQuery', () => ({ escapeIlike: (v: string) => v }));

import { useFornecedoresKPIs } from '@/hooks/useFornecedores';

describe('useFornecedoresKPIs - alcance do invalidate (etapa 191)', () => {
  it('invalidar o prefixo [fornecedores] refaz a consulta dos cartoes', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useFornecedoresKPIs(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    const chamadasIniciais = h.rpc.mock.calls.length;
    expect(chamadasIniciais).toBeGreaterThan(0);

    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
    });

    await waitFor(() => expect(h.rpc.mock.calls.length).toBe(chamadasIniciais + 1));
  });
});