import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useApprovalWorkflow } from '../useApprovalWorkflow';

// Etapa QA 082 (HK-04): a escalacao inseria a etapa do aprovador escalado SEM
// organization_id, e fetchPendingSteps filtra por organization_id — a etapa nascia
// invisivel para quem deveria aprovar. O UPDATE tambem era cego: dois navegadores
// com a tela aberta criavam duas etapas para o mesmo workflow.

const ORG = 'df60b900-ede4-45db-8573-da40d13bf767';
const APROVADOR = 'u-escalado';

// Referencia estavel: um objeto novo a cada chamada mudaria `fetchPendingWorkflows`
// a cada render e o efeito de bootstrap entraria em loop de fetch.
const auth = vi.hoisted(() => ({
  user: { id: 'u1' },
  organizationId: 'df60b900-ede4-45db-8573-da40d13bf767',
}));

vi.mock('@/features/auth/hooks/useAuthContext', () => ({
  useAuth: () => auth,
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Os hooks internos fazem seus proprios fetches e alimentam estado a cada render;
// aqui so a escalacao importa, entao eles entram estaveis e sem rede.
vi.mock('../useApprovalRules', () => ({
  useApprovalRules: () => ({
    rules: [], delegations: [], loading: false,
    fetchRules: async () => {},
    fetchDelegations: async () => {},
    findApplicableRule: () => null,
    findApplicableRuleRPC: async () => null,
    getEffectiveApprover: async () => [],
    saveRule: async () => {},
    deleteRule: async () => {},
    saveDelegation: async () => {},
  }),
}));

vi.mock('../useApprovalHistory', () => ({
  useApprovalHistory: () => ({ allHistory: [], fetchAllHistory: async () => {} }),
}));

vi.mock('../useWorkflowDLQ', () => ({
  useWorkflowDLQ: () => ({
    pushToDLQ: () => {},
    dlqEntries: [],
    retryableEntries: [],
    retryEntry: async () => false,
    removeEntry: () => {},
    clearDLQ: () => {},
  }),
}));

const stepsInseridos: Record<string, unknown>[] = [];
const workflowsAtualizados: Record<string, unknown>[] = [];
let linhasEscaladas = 1;

const workflowVencido = {
  id: 'wf1',
  etapa_atual: 1,
  solicitacao_id: 's1',
  status: 'pending',
  approval_rules: {
    escalacao_automatica: true,
    escalacao_para: APROVADOR,
    tempo_limite_horas: 2,
  },
};

function criarBuilder(resultado: unknown) {
  const builder: Record<string, unknown> = {};
  for (const metodo of ['select', 'eq', 'lt', 'is', 'order', 'or', 'in', 'limit']) {
    builder[metodo] = () => builder;
  }
  builder.insert = (payload: Record<string, unknown>) => {
    if (payload && 'workflow_id' in payload && 'aprovador_id' in payload) stepsInseridos.push(payload);
    return { then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }) };
  };
  builder.update = (payload: Record<string, unknown>) => {
    workflowsAtualizados.push(payload);
    return builder;
  };
  builder.then = (resolve: (v: unknown) => unknown) => resolve({ data: resultado, error: null });
  return builder;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (tabela: string) => {
      if (tabela === 'approval_workflows') {
        const builder = criarBuilder([workflowVencido]);
        builder.update = (payload: Record<string, unknown>) => {
          workflowsAtualizados.push(payload);
          return criarBuilder(Array.from({ length: linhasEscaladas }, (_, i) => ({ id: `wf${i + 1}` })));
        };
        return builder;
      }
      return criarBuilder([]);
    },
  },
}));

describe('useApprovalWorkflow · checkEscalations (HK-04)', () => {
  beforeEach(() => {
    stepsInseridos.length = 0;
    workflowsAtualizados.length = 0;
    linhasEscaladas = 1;
  });

  it('grava organization_id na etapa do aprovador escalado', async () => {
    const { result } = renderHook(() => useApprovalWorkflow());

    act(() => {
      void result.current.checkEscalations();
    });

    await vi.waitFor(() => expect(stepsInseridos).toHaveLength(1), { timeout: 3000 });
    expect(workflowsAtualizados).toHaveLength(1);
    expect(workflowsAtualizados[0].status).toBe('escalated');
    expect(stepsInseridos).toHaveLength(1);
    expect(stepsInseridos[0].organization_id).toBe(ORG);
    expect(stepsInseridos[0].aprovador_id).toBe(APROVADOR);
  });

  it('nao cria etapa quando outro navegador ja escalou o mesmo workflow', async () => {
    linhasEscaladas = 0;

    const { result } = renderHook(() => useApprovalWorkflow());

    await act(async () => {
      await result.current.checkEscalations();
    });

    expect(workflowsAtualizados).toHaveLength(1);
    expect(stepsInseridos).toHaveLength(0);
  });
});