import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePagamentos } from '../usePagamentos';

// Etapa QA 076/077 (UI-01): bulkUpdateStatus gravava o status sem validar a
// maquina de estados, permitindo levar 'pendente' direto para 'agendado' e
// pular a aprovacao do pagamento.

const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, organizationId: 'org1', tenantId: 'org1' }),
}));

vi.mock('@/lib/feedbackToast', () => ({
  toast: { error: (...a: unknown[]) => toastError(...a), success: (...a: unknown[]) => toastSuccess(...a) },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/hooks/useRealtimeSubscription', () => ({
  useRealtimeSubscription: () => undefined,
}));

const pagamentos = [
  { id: 'p1', numero: 'PAG-1', status: 'pendente', valor: 100, valor_pago: 0, organization_id: 'org1', tenant_id: 'org1' },
  { id: 'p2', numero: 'PAG-2', status: 'aprovado', valor: 200, valor_pago: 0, organization_id: 'org1', tenant_id: 'org1' },
];

const updatesAplicados: Array<{ updates: Record<string, unknown>; ids: string[] }> = [];

function cadeiaDeLeitura() {
  const resultado = Promise.resolve({ data: pagamentos, error: null, count: pagamentos.length });
  const eq = vi.fn(() => resultado);
  const order = vi.fn(() => ({ eq }));
  return { order, eq };
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => cadeiaDeLeitura(),
      update: (updates: Record<string, unknown>) => ({
        in: (_col: string, ids: string[]) => {
          updatesAplicados.push({ updates, ids });
          // O hook confere as linhas realmente gravadas (RLS pode devolver 0
          // linhas sem erro), entao o mock devolve uma linha por id enviado.
          const gravadas = Promise.resolve({ data: ids.map((id) => ({ id })), error: null }) as unknown as Record<string, unknown>;
          gravadas.select = () => gravadas;
          return gravadas;
        },
      }),
    }),
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('usePagamentos · bulkUpdateStatus (UI-01)', () => {
  beforeEach(() => {
    toastError.mockClear();
    toastSuccess.mockClear();
    updatesAplicados.length = 0;
  });

  it('nao agenda pagamento pendente: recusa o lote e nao grava nada', async () => {
    const { result } = renderHook(() => usePagamentos(), { wrapper });
    await waitFor(() => expect(result.current.pagamentos).toHaveLength(2));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.bulkUpdateStatus(['p1'], 'agendado');
    });

    expect(ok).toBe(false);
    expect(updatesAplicados).toHaveLength(0);
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('Nenhum pagamento pode ir para agendado'));
  });

  it('agenda apenas os aprovados e reporta os bloqueados', async () => {
    const { result } = renderHook(() => usePagamentos(), { wrapper });
    await waitFor(() => expect(result.current.pagamentos).toHaveLength(2));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.bulkUpdateStatus(['p1', 'p2'], 'agendado');
    });

    expect(ok).toBe(true);
    expect(updatesAplicados).toHaveLength(1);
    expect(updatesAplicados[0].ids).toEqual(['p2']);
    expect(updatesAplicados[0].updates.status).toBe('agendado');
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('PAG-1'));
  });

      // Etapa 247 (UI-12): a data escolhida no calendario era descartada.
      it('grava a data escolhida quando o agendamento tem data', async () => {
        const { result } = renderHook(() => usePagamentos(), { wrapper });
        await waitFor(() => expect(result.current.pagamentos).toHaveLength(2));

        await act(async () => {
          await result.current.bulkUpdateStatus(['p2'], 'agendado', '2026-12-15');
        });

        expect(updatesAplicados).toHaveLength(1);
        expect(updatesAplicados[0].updates).toMatchObject({
          status: 'agendado',
          data_agendamento: '2026-12-15',
        });
      });

      it('nao inventa data de agendamento quando nenhuma foi escolhida', async () => {
        const { result } = renderHook(() => usePagamentos(), { wrapper });
        await waitFor(() => expect(result.current.pagamentos).toHaveLength(2));

        await act(async () => {
          await result.current.bulkUpdateStatus(['p2'], 'agendado');
        });

        expect(updatesAplicados).toHaveLength(1);
        expect(updatesAplicados[0].updates).not.toHaveProperty('data_agendamento');
      });
});