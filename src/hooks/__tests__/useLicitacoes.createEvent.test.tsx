import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSourcingEvents } from '../useLicitacoes';

// Etapa QA 071 (VAL-01): sourcing_events.numero e sourcing_events.owner_id sao
// NOT NULL sem default e nenhum trigger preenche. Todo insert violava 23502.

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, tenantId: 't1', organizationId: 'org1' }),
}));

vi.mock('@/lib/feedbackToast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const rpc = vi.fn();
const insert = vi.fn();
const single = vi.fn();
const select = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    from: () => ({
      select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
      insert: (payload: Record<string, unknown>) => {
        insert(payload);
        return { select: () => ({ single }) };
      },
    }),
  },
}));

const wrapperComClient = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe('useSourcingEvents.createEvent (VAL-01)', () => {
  beforeEach(() => {
    rpc.mockReset();
    insert.mockReset();
    single.mockReset();
    select.mockReset();
    rpc.mockResolvedValue({ data: 'SRC-000001', error: null });
    single.mockResolvedValue({ data: { id: 'e1', numero: 'SRC-000001', owner_id: 'u1' }, error: null });
  });

  it('grava numero sequencial e owner_id junto do evento', async () => {
    const { result } = renderHook(() => useSourcingEvents(), { wrapper: wrapperComClient() });

    await result.current.createEvent.mutateAsync({
      title: 'Cotacao de parafusos',
      type: 'cotacao',
      status: 'rascunho',
    } as never);

    await waitFor(() => expect(insert).toHaveBeenCalledTimes(1));
    const payload = insert.mock.calls[0][0];

    expect(rpc).toHaveBeenCalledWith('generate_sequential_number', {
      prefix: 'SRC',
      table_name: 'sourcing_events',
    });
    expect(payload.numero).toBe('SRC-000001');
    expect(payload.owner_id).toBe('u1');
    expect(payload.organization_id).toBe('org1');
    expect(payload.tenant_id).toBe('t1');
  });

  it('usa fallback com prefixo SRC quando o RPC nao devolve numero', async () => {
    rpc.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useSourcingEvents(), { wrapper: wrapperComClient() });

    await result.current.createEvent.mutateAsync({ title: 'Sem RPC' } as never);

    await waitFor(() => expect(insert).toHaveBeenCalledTimes(1));
    expect(insert.mock.calls[0][0].numero).toMatch(/^SRC-\d+$/);
  });
});