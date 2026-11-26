import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useApprovalWorkflow } from '../useApprovalWorkflow';

// Etapa QA 117 (NEG-15, parte 2): a escolha da alcada existia duas vezes - a RPC
// find_approval_rule (SECURITY DEFINER, com escopo de tenant a partir da etapa 116)
// e findApplicableRule em JS. As duas podiam divergir; a RPC passou a ser a unica
// fonte, e o id devolvido por ela so vale se estiver na lista ja filtrada pela
// empresa (approval_rules e lida com .eq('organization_id', organizationId)).

const ORG = 'df60b900-ede4-45db-8573-da40d13bf767';
const GESTOR_CC = 'u-gestor-cc';
const APROVADOR = 'u-aprovador';

const auth = vi.hoisted(() => ({
  user: { id: 'u1', email: 'u1@empresa-a.test' },
  organizationId: 'df60b900-ede4-45db-8573-da40d13bf767',
}));

const cenario = vi.hoisted(() => ({
  rpcRetorna: null as string | null,
  regras: [] as Record<string, unknown>[],
}));

const inseridos = vi.hoisted(() => ({
  approval_workflows: [] as Record<string, unknown>[],
  approval_steps: [] as Record<string, unknown>[],
  approval_history: [] as Record<string, unknown>[],
}));

const regraDaEmpresa = {
  id: 'r-local',
  nome: 'Faixa baixa',
  ativo: true,
  valor_min: 0,
  valor_max: 10000,
  categoria_id: null,
  tempo_limite_horas: 24,
  aprovadores: [{ user_id: APROVADOR, ordem: 1 }],
};

vi.mock('@/features/auth/hooks/useAuthContext', () => ({ useAuth: () => auth }));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Sem `findApplicableRule`: se o codigo voltar a chamar a duplicata em JS, o teste
// falha com TypeError em vez de passar em silencio.
vi.mock('../useApprovalRules', () => ({
  useApprovalRules: () => ({
    rules: cenario.regras, delegations: [], loading: false,
    fetchRules: async () => {},
    fetchDelegations: async () => {},
    findApplicableRuleRPC: async () => cenario.rpcRetorna,
    getEffectiveApprover: async () => [],
    saveRule: async () => {},
    deleteRule: async () => {},
    saveDelegation: async () => {},
    deleteDelegation: async () => {},
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

type TabelaGravavel = keyof typeof inseridos;

function criarBuilder(tabela: string, resposta: () => { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  for (const metodo of ['select', 'eq', 'lt', 'is', 'order', 'or', 'in', 'limit']) {
    builder[metodo] = () => builder;
  }
  builder.single = () => Promise.resolve(resposta());
  builder.insert = (payload: unknown) => {
    if (tabela in inseridos) {
      const destino = inseridos[tabela as TabelaGravavel];
      if (Array.isArray(payload)) destino.push(...(payload as Record<string, unknown>[]));
      else destino.push(payload as Record<string, unknown>);
    }
    return builder;
  };
  builder.update = () => builder;
  builder.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null });
  return builder;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (tabela: string) => {
      if (tabela === 'solicitacoes') {
        return criarBuilder(tabela, () => ({ data: { id: 's1', cost_center: { manager_id: GESTOR_CC } }, error: null }));
      }
      if (tabela === 'approval_workflows') {
        return criarBuilder(tabela, () => ({
          data: { id: 'wf-novo', etapa_atual: 1, solicitacao_id: 's1', status: 'pending' },
          error: null,
        }));
      }
      return criarBuilder(tabela, () => ({ data: null, error: null }));
    },
  },
}));

async function criarWorkflowDeTeste() {
  const { result } = renderHook(() => useApprovalWorkflow());
  await act(async () => {
    await result.current.createWorkflow('s1', 5000, undefined);
  });
}

describe('useApprovalWorkflow · escolha de alcada (NEG-15)', () => {
  beforeEach(() => {
    cenario.rpcRetorna = null;
    cenario.regras = [regraDaEmpresa];
    inseridos.approval_workflows.length = 0;
    inseridos.approval_steps.length = 0;
    inseridos.approval_history.length = 0;
  });

  it('usa a regra devolvida pela RPC quando ela e da empresa do usuario', async () => {
    cenario.rpcRetorna = 'r-local';

    await criarWorkflowDeTeste();

    expect(inseridos.approval_workflows).toHaveLength(1);
    expect(inseridos.approval_workflows[0].rule_id).toBe('r-local');
    expect(inseridos.approval_workflows[0].organization_id).toBe(ORG);
    expect(inseridos.approval_workflows[0].total_etapas).toBe(2);
    expect(inseridos.approval_steps.map(s => s.aprovador_id)).toEqual([GESTOR_CC, APROVADOR]);
  });

  it('ignora id devolvido pela RPC que nao esta na lista da empresa do usuario', async () => {
    cenario.rpcRetorna = 'r-de-outra-empresa';

    await criarWorkflowDeTeste();

    expect(inseridos.approval_workflows).toHaveLength(1);
    expect(inseridos.approval_workflows[0].rule_id).toBeNull();
    expect(inseridos.approval_steps.map(s => s.aprovador_id)).toEqual([GESTOR_CC]);
  });

  it('nao escolhe regra por conta propria quando a RPC nao devolve nada', async () => {
    cenario.rpcRetorna = null;

    await criarWorkflowDeTeste();

    expect(inseridos.approval_workflows).toHaveLength(1);
    expect(inseridos.approval_workflows[0].rule_id).toBeNull();
    expect(inseridos.approval_steps.map(s => s.aprovador_id)).toEqual([GESTOR_CC]);
  });
});