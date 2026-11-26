/**
 * HK-05 (etapa 190): os cartoes de KPI viviam em `['pagamentos-kpis', ...]`, um namespace
 * IRMAO do `['pagamentos']` que as mutacoes (`usePagamentos.ts`) e o realtime
 * (`queryKeysToInvalidate: [['pagamentos']]`) invalidam. O match do TanStack e posicional,
 * entao `invalidateQueries` nunca alcancava os cartoes: a tela gravava e os indicadores
 * seguiam com o numero antigo ate o `staleTime` de 60 s expirar.
 *
 * O teste monta o hook de KPI real, invalida o prefixo da entidade (o que as mutacoes
 * fazem) e prova que a consulta e refeita. Contra o codigo anterior falha, porque a chave
 * do KPI nao comeca por `['pagamentos']`.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const h = vi.hoisted(() => ({
  rpc: vi.fn(async () => ({ data: { total: 7, pendentes: 1, atrasados: 0, pagos: 6, valorPendente: 10, valorPago: 20 }, error: null })),
}));

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'u@x.com' }, organizationId: 'org-1' }),
}));
vi.mock('@/hooks/useRealtimeSubscription', () => ({ useRealtimeSubscription: () => undefined }));
vi.mock('@/lib/feedbackToast', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('@/services/auditService', () => ({ auditHelpers: { logCreate: vi.fn(), logUpdate: vi.fn(), logDelete: vi.fn() } }));
vi.mock('@/lib/supabaseQuery', () => ({ escapeIlike: (v: string) => v }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: h.rpc } }));

import { usePagamentosKPIs } from '@/hooks/usePagamentos';

function criarCliente() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
}

describe('usePagamentosKPIs - alcance do invalidate (etapa 190)', () => {
  it('invalidar o prefixo [pagamentos] refaz a consulta dos cartoes', async () => {
    const queryClient = criarCliente();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => usePagamentosKPIs(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    const chamadasIniciais = h.rpc.mock.calls.length;
    expect(chamadasIniciais).toBeGreaterThan(0);

    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['pagamentos'] });
    });

    await waitFor(() => expect(h.rpc.mock.calls.length).toBe(chamadasIniciais + 1));
  });
});