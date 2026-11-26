import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DynamicApprovalMatrix } from '../DynamicApprovalMatrix';

/**
 * Etapa 110 - a matriz de alcada mostrava nomes de lista fixa ("João Silva",
 * "Material de Escritório") e a regra podia nascer com `aprovadores:
 * [{ user_id: '', ordem: 1 }]`, que passa no teste de length e quebra no banco.
 */

const PERFIS = [
  { user_id: 'auth-ana', full_name: 'Ana Oliveira', display_name: null, email: 'ana@empresa.com' },
  { user_id: 'auth-joao', full_name: 'João Silva', display_name: null, email: 'joao@empresa.com' },
];
let perfisAtuais = PERFIS;

vi.mock('@/integrations/supabase/client', () => {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.order = () => builder;
  builder.limit = () => Promise.resolve({ data: perfisAtuais, error: null });
  return { supabase: { from: () => builder } };
});

vi.mock('@/hooks/useProdutos', () => ({
  useProdutos: () => ({ categorias: [{ id: 'cat-real-1', nome: 'Papelaria' }], produtos: [] }),
}));

const saveRule = vi.fn();
const saveDelegation = vi.fn();
let regrasAtuais: any[] = [];
let delegacoesAtuais: any[] = [];

vi.mock('@/hooks/useApprovalWorkflow', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useApprovalWorkflow')>();
  return {
    ...actual,
    useApprovalWorkflow: () => ({
      rules: regrasAtuais,
      delegations: delegacoesAtuais,
      loading: false,
      saveRule,
      deleteRule: vi.fn(),
      saveDelegation,
      deleteDelegation: vi.fn(),
    }),
  };
});

const toastError = vi.fn();
vi.mock('@/lib/feedbackToast', () => ({ toast: { error: (m: string) => toastError(m), success: vi.fn() } }));

// Os modais reais usam Radix Select (portal + pointer capture); aqui basta um
// botao que dispara o onSave do dono da tela.
vi.mock('@/components/compras/approval/ApprovalRuleModal', () => ({
  ApprovalRuleModal: ({ open, onSave }: any) => (open ? <button onClick={onSave}>salvar-regra</button> : null),
}));
vi.mock('@/components/compras/approval/ApprovalDelegationModal', () => ({
  ApprovalDelegationModal: ({ open, onSave }: any) => (open ? <button onClick={onSave}>salvar-delegacao</button> : null),
}));

const renderMatriz = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DynamicApprovalMatrix />
    </QueryClientProvider>,
  );

const regraBase = {
  id: 'r1',
  nome: 'Compra padrão',
  descricao: '',
  valor_min: 0,
  valor_max: 10000,
  aprovadores: [{ user_id: 'auth-ana', ordem: 1 }],
  tempo_limite_horas: 24,
  escalacao_automatica: true,
  escalacao_para: 'auth-joao',
  categoria_id: 'cat-real-1',
  ativo: true,
  prioridade: 0,
};

beforeEach(() => {
  perfisAtuais = PERFIS;
  regrasAtuais = [regraBase];
  delegacoesAtuais = [];
  saveRule.mockClear();
  saveDelegation.mockClear();
  toastError.mockClear();
});

describe('DynamicApprovalMatrix mostra pessoas e categorias reais', () => {
  it('resolve aprovador, escalação e categoria pelos dados do banco', async () => {
    renderMatriz();
    expect(await screen.findAllByText('Ana Oliveira')).toBeTruthy();
    expect(screen.getAllByText(/João Silva/).length).toBeGreaterThan(0);
    expect(screen.getByText('Papelaria')).toBeTruthy();
    expect(screen.queryByText(/Material de Escritório/)).toBeNull();
    expect(screen.queryByText('user-1')).toBeNull();
  });

  it('id sem perfil aparece como nao encontrado, nao como uuid cru', async () => {
    regrasAtuais = [{ ...regraBase, aprovadores: [{ user_id: 'uuid-orfao', ordem: 1 }], escalacao_para: '' }];
    renderMatriz();
    expect(await screen.findByText('Usuário não encontrado')).toBeTruthy();
    expect(screen.queryByText(/uuid-orfao/)).toBeNull();
  });

  it('categoria ausente e dita removida; regra sem categoria vale para todas', async () => {
    regrasAtuais = [
      { ...regraBase, id: 'r1', categoria_id: 'cat-apagada' },
      { ...regraBase, id: 'r2', nome: 'Sem categoria', categoria_id: undefined, aprovadores: [] },
    ];
    renderMatriz();
    expect(await screen.findByText('Categoria removida')).toBeTruthy();
    expect(screen.getByText('Todas')).toBeTruthy();
  });

  it('delegacao mostra os nomes reais de quem delega e de quem recebe', async () => {
    delegacoesAtuais = [
      {
        id: 'd1',
        delegante_id: 'auth-ana',
        delegado_id: 'auth-joao',
        data_inicio: '2026-01-01',
        data_fim: '2026-12-31',
        motivo: 'Férias',
        ativo: true,
        categorias_permitidas: [],
      },
    ];
    renderMatriz();
    expect(await screen.findAllByText('Ana Oliveira')).toBeTruthy();
    expect(screen.getAllByText('João Silva').length).toBeGreaterThan(0);
  });
});

describe('DynamicApprovalMatrix recusa regra com aprovador vazio', () => {
  it('regra nova nasce com user_id vazio e o salvamento e barrado', async () => {
    regrasAtuais = [];
    renderMatriz();
    fireEvent.click(screen.getByRole('button', { name: /Nova Regra/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'salvar-regra' }));
    expect(saveRule).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/aprovador/i));
  });

  it('regra com aprovador real e salva', async () => {
    renderMatriz();
    const ocorrencias = await screen.findAllByText('Compra padrão');
    const linha = ocorrencias.map((el) => el.closest('tr')).find(Boolean) as HTMLTableRowElement;
    const botoes = linha.querySelectorAll('button');
    fireEvent.click(botoes[0]);
    fireEvent.click(await screen.findByRole('button', { name: 'salvar-regra' }));
    expect(toastError).not.toHaveBeenCalled();
    expect(saveRule).toHaveBeenCalledTimes(1);
    expect(saveRule.mock.calls[0][0].aprovadores[0].user_id).toBe('auth-ana');
  });
});
