/**
 * TST-06 (etapa 281): o caminho de ESCRITA de useApprovalWorkflow nunca era
 * exercitado. O RLS do Postgres filtra a linha em silencio -- o PostgREST
 * devolve 0 linhas e nenhum erro --, entao approveStep/rejectStep anunciavam
 * "Aprovacao registrada" e a solicitacao continuava parada na etapa.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const h = vi.hoisted(() => {
  const estado = {
    single: {} as Record<string, { data: unknown; error: unknown }>,
    lista: {} as Record<string, { data: unknown; error: unknown }>,
    atualizado: {} as Record<string, { data: unknown; error: unknown }>,
  };
  const semEfeito = async () => {};
  return {
    estado,
    toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
    auth: { user: { id: 'u1', email: 'u1@x.com' }, organizationId: 'org-1' },
    dlq: {
      pushToDLQ: vi.fn(async () => 'dlq-1'),
      entries: [], isLoading: false, retryEntry: semEfeito,
      dismissEntry: vi.fn(), refresh: semEfeito,
    },
    rules: {
      rules: [], delegations: [], loading: false,
      fetchRules: semEfeito, fetchDelegations: semEfeito,
      findApplicableRule: () => null, findApplicableRuleRPC: async () => null,
      getEffectiveApprover: async () => [], saveRule: semEfeito,
      deleteRule: semEfeito, saveDelegation: semEfeito,
    },
    history: { allHistory: [], fetchAllHistory: semEfeito },
  };
});

// Referencia estavel: um objeto novo a cada chamada mudaria as dependencias de
// fetchPendingSteps/fetchPendingWorkflows a cada render e o efeito de bootstrap
// entraria em loop de fetch (act nunca assenta) — mesmo cuidado do teste de escalacao.
vi.mock('@/features/auth', () => ({ useAuth: () => h.auth }));
vi.mock('@/lib/feedbackToast', () => ({ toast: h.toast }));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
// Os hooks internos alimentam estado a cada render; entram estaveis e sem rede,
// senao o loop de fetch acima reaparece por outro caminho.
vi.mock('../useWorkflowDLQ', () => ({ useWorkflowDLQ: () => h.dlq }));
vi.mock('../useApprovalRules', () => ({ useApprovalRules: () => h.rules }));
vi.mock('../useApprovalHistory', () => ({ useApprovalHistory: () => h.history }));

vi.mock('@/integrations/supabase/client', () => {
  const estado = h.estado;
  const criarChain = (tabela: string) => {
    let mutando = false;
    const chain: Record<string, unknown> = {};
    const resultado = () => {
      const fonte = mutando ? estado.atualizado : estado.lista;
      return fonte[tabela] ?? { data: [], error: null };
    };
    chain['update'] = vi.fn(() => { mutando = true; return chain; });
    chain['insert'] = vi.fn(() => { mutando = true; return chain; });
    chain['delete'] = vi.fn(() => { mutando = true; return chain; });
    for (const metodo of ['eq', 'in', 'neq', 'order', 'range', 'limit', 'or', 'filter', 'match', 'is', 'gte', 'lte', 'contains']) {
      chain[metodo] = vi.fn(() => chain);
    }
    chain['select'] = vi.fn(() => (mutando ? Promise.resolve(resultado()) : chain));
    chain['single'] = vi.fn(async () => estado.single[tabela] ?? { data: null, error: null });
    chain['maybeSingle'] = vi.fn(async () => estado.single[tabela] ?? { data: null, error: null });
    chain['then'] = (ok: (v: unknown) => unknown, falha?: (e: unknown) => unknown) =>
      Promise.resolve(resultado()).then(ok, falha);
    return chain;
  };
  return {
    supabase: {
      from: vi.fn((tabela: string) => criarChain(tabela)),
      rpc: vi.fn(async () => ({ data: null, error: null })),
      channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    },
  };
});

import { useApprovalWorkflow } from '../useApprovalWorkflow';

// Client criado uma vez por teste: um client novo a cada render derruba o cache e
// re-dispara as queries dentro do act, em loop.
function criarWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
}

const etapaPendente = {
  id: 'step-1',
  workflow_id: 'wf-1',
  etapa: 1,
  status: 'pending',
  approval_workflows: { id: 'wf-1', status: 'pending', rule_id: null, total_etapas: 1 },
};

describe('useApprovalWorkflow - escrita negada pelo RLS nao vira sucesso', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.estado.single = {};
    h.estado.lista = {};
    h.estado.atualizado = {};
    h.estado.single['approval_steps'] = { data: etapaPendente, error: null };
    h.estado.single['approval_workflows'] = { data: { status: 'pending', solicitacao_id: 'sol-1' }, error: null };
  });

  it('approveStep com 0 linhas afetadas retorna false e nao comemora', async () => {
    h.estado.atualizado['approval_steps'] = { data: [], error: null };
    const { result } = renderHook(() => useApprovalWorkflow(), { wrapper: criarWrapper() });

    let ok = true;
    await act(async () => { ok = await result.current.approveStep('step-1', 'ok'); });

    expect(ok).toBe(false);
    expect(h.toast.success).not.toHaveBeenCalled();
    expect(h.toast.error).toHaveBeenCalledWith(expect.stringContaining('não tem permissão para aprovar'));
    expect(h.dlq.pushToDLQ).not.toHaveBeenCalled();
  });

  it('approveStep com linha afetada registra a aprovacao', async () => {
    h.estado.atualizado['approval_steps'] = { data: [{ id: 'step-1' }], error: null };
    h.estado.lista['approval_steps'] = { data: [{ id: 'step-1', status: 'approved', etapa: 1 }], error: null };
    const { result } = renderHook(() => useApprovalWorkflow(), { wrapper: criarWrapper() });

    let ok = false;
    await act(async () => { ok = await result.current.approveStep('step-1'); });

    expect(ok).toBe(true);
    expect(h.toast.success).toHaveBeenCalledWith('Aprovação registrada com sucesso');
    expect(h.toast.error).not.toHaveBeenCalled();
  });

  it('rejectStep com 0 linhas afetadas retorna false e nao comemora', async () => {
    h.estado.atualizado['approval_steps'] = { data: [], error: null };
    const { result } = renderHook(() => useApprovalWorkflow(), { wrapper: criarWrapper() });

    let ok = true;
    await act(async () => { ok = await result.current.rejectStep('step-1', 'sem verba'); });

    expect(ok).toBe(false);
    expect(h.toast.success).not.toHaveBeenCalled();
    expect(h.toast.error).toHaveBeenCalledWith(expect.stringContaining('não tem permissão para rejeitar'));
  });
});