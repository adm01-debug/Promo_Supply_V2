import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ApprovalRuleModal } from '../ApprovalRuleModal';
import { ApprovalDelegationModal } from '../ApprovalDelegationModal';

/**
 * Etapa 109 - as telas de alcada ofereciam listas ficticias ("João Silva",
 * "user-1", categorias inventadas). O que vai para `approval_rules.aprovadores`,
 * `escalacao_para` e `approval_delegations.delegante_id` precisa ser o
 * `profiles.user_id` real, senao a RLS (`auth.uid() = aprovador_id`) e
 * `get_effective_approver` nunca casam.
 */

const PERFIS = [
  { user_id: 'auth-ana', full_name: 'Ana Oliveira', display_name: null, email: 'ana@empresa.com' },
  { user_id: 'auth-joao', full_name: 'João Silva', display_name: null, email: 'joao@empresa.com' },
  // Linha duplicada e linha sem `user_id`: `montarPessoas` descarta.
  { user_id: 'auth-ana', full_name: 'Ana Oliveira', display_name: null, email: 'ana@empresa.com' },
  { user_id: null, full_name: 'Sem Vinculo', display_name: null, email: 'x@empresa.com' },
];

let perfisAtuais = PERFIS;

vi.mock('@/integrations/supabase/client', () => {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.order = () => builder;
  builder.limit = () => Promise.resolve({ data: perfisAtuais, error: null });
  return { supabase: { from: () => builder } };
});

vi.mock('@/features/solicitacoes', () => ({
  useSolicitacoes: () => ({
    costCenters: [{ id: 'cc-1', name: 'Operações', code: 'CC1' }],
  }),
}));

vi.mock('@/hooks/useProdutos', () => ({
  useProdutos: () => ({ categorias: [{ id: 'cat-real-1', nome: 'Papelaria' }], produtos: [] }),
}));

// Mock fino dos selects do Radix: expõe value/label reais que o componente
// monta, sem depender de portais e pointer capture do jsdom.
vi.mock('@/components/ui/select', () => {
  const Ctx = React.createContext<{ valor: string; aoTrocar?: (v: string) => void }>({ valor: '' });
  const Select = ({ value, onValueChange, children }: any) => (
    <Ctx.Provider value={{ valor: value ?? '', aoTrocar: onValueChange }}>{children}</Ctx.Provider>
  );
  const SelectTrigger = () => null;
  const SelectValue = ({ placeholder }: any) => {
    const { valor } = React.useContext(Ctx);
    return <span data-testid="valor-atual">{valor || placeholder}</span>;
  };
  const SelectContent = ({ children }: any) => {
    const { valor, aoTrocar } = React.useContext(Ctx);
    return (
      <select data-testid="opcoes" value={valor} onChange={(e) => aoTrocar?.(e.target.value)}>
        {children}
      </select>
    );
  };
  const SelectItem = ({ value, children }: any) => <option value={value}>{children}</option>;
  return { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
});

/** Valores oferecidos por um <select> do mock. */
const valoresDe = (indice: number): string[] =>
  Array.from(screen.getAllByTestId('opcoes')[indice].querySelectorAll('option')).map((o) => (o as HTMLOptionElement).value);

const rotulosDe = (indice: number): string[] =>
  Array.from(screen.getAllByTestId('opcoes')[indice].querySelectorAll('option')).map((o) => o.textContent ?? '');

/** Indice do <select> que oferece o valor pedido - evita depender da ordem dos campos. */
const indiceDoSelectCom = (valor: string): number =>
  screen.getAllByTestId('opcoes').findIndex((sel) =>
    Array.from(sel.querySelectorAll('option')).some((o) => (o as HTMLOptionElement).value === valor),
  );

const render = (ui: React.ReactElement) =>
  rtlRender(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

beforeEach(() => {
  perfisAtuais = PERFIS;
});

describe('ApprovalRuleModal usa pessoas e categorias reais', () => {
  it('oferece profiles.user_id e nomes do banco, sem id ficticio', async () => {
    const regra: any = {
      id: 'regra-1',
      nome: 'Compra padrão',
      prioridade: 1,
      aprovadores: [{ user_id: '', ordem: 1 }],
      tempo_limite_horas: 24,
    };
    render(
      <ApprovalRuleModal
        open
        onOpenChange={() => {}}
        editingRule={regra}
        setEditingRule={() => {}}
        onSave={() => {}}
        loading={false}
      />,
    );
    await screen.findAllByText('Ana Oliveira');
    const aprovadores = indiceDoSelectCom('auth-ana');
    expect(aprovadores).toBeGreaterThanOrEqual(0);
    expect(valoresDe(aprovadores)).toEqual(['auth-ana', 'auth-joao']);
    expect(valoresDe(aprovadores)).not.toContain('user-1');
    expect(rotulosDe(aprovadores)).toEqual(['Ana Oliveira', 'João Silva']);
    const categorias = indiceDoSelectCom('cat-real-1');
    expect(valoresDe(categorias)).toEqual(['all', 'cat-real-1']);
    expect(rotulosDe(categorias)).toEqual(['Todas as categorias', 'Papelaria']);
  });

  it('grava o user_id escolhido no aprovador da regra', async () => {
    const setEditingRule = vi.fn();
    render(
      <ApprovalRuleModal
        open
        onOpenChange={() => {}}
        editingRule={{ id: 'regra-1', aprovadores: [{ user_id: '', ordem: 1 }] } as any}
        setEditingRule={setEditingRule}
        onSave={() => {}}
        loading={false}
      />,
    );
    await screen.findAllByText('Ana Oliveira');
    fireEvent.change(screen.getAllByTestId('opcoes')[indiceDoSelectCom('auth-ana')], { target: { value: 'auth-joao' } });
    const chamadas = setEditingRule.mock.calls;
    const atualizado = chamadas[chamadas.length - 1]?.[0];
    expect(atualizado.aprovadores[0].user_id).toBe('auth-joao');
  });

  it('sem pessoas visiveis avisa em vez de mostrar lista ficticia', async () => {
    perfisAtuais = [];
    render(
      <ApprovalRuleModal
        open
        onOpenChange={() => {}}
        editingRule={{ id: 'regra-1', aprovadores: [] } as any}
        setEditingRule={() => {}}
        onSave={() => {}}
        loading={false}
      />,
    );
    expect(await screen.findByText(/Nenhum usuário visível/)).toBeTruthy();
  });
});

const delegacaoBase = {
  id: 'deleg-1',
  delegante_id: '',
  delegado_id: '',
  data_inicio: '2026-01-10',
  data_fim: '2026-01-20',
};

const DelegacaoControlada = ({ inicial }: { inicial: any }) => {
  const [delegacao, setDelegacao] = React.useState<any>(inicial);
  return (
    <ApprovalDelegationModal
      open
      onOpenChange={() => {}}
      editingDelegation={delegacao}
      setEditingDelegation={setDelegacao}
      onSave={() => {}}
      loading={false}
    />
  );
};

describe('ApprovalDelegationModal usa pessoas reais e recusa data invertida', () => {
  it('oferece os profiles.user_id reais e remove o delegante da lista de delegado', async () => {
    render(<DelegacaoControlada inicial={delegacaoBase} />);
    await screen.findAllByText('Ana Oliveira');
    expect(valoresDe(0)).toEqual(['auth-ana', 'auth-joao']);

    fireEvent.change(screen.getAllByTestId('opcoes')[0], { target: { value: 'auth-ana' } });
    await screen.findByText(/Editar Delegação/);
    const delegados = screen.getAllByTestId('opcoes')[1].querySelectorAll('option');
    expect(Array.from(delegados).map((o) => (o as HTMLOptionElement).value)).toEqual(['auth-joao']);
  });

  it('bloqueia salvar quando a data final nao e depois da inicial', async () => {
    render(<DelegacaoControlada inicial={{ ...delegacaoBase, data_fim: '2026-01-10' }} />);
    expect(await screen.findByText(/precisa ser depois da data inicial/)).toBeTruthy();
    const botao = screen.getByRole('button', { name: /Salvar Alterações/ }) as HTMLButtonElement;
    expect(botao.disabled).toBe(true);
  });

  it('libera salvar com data final depois da inicial', async () => {
    render(<DelegacaoControlada inicial={delegacaoBase} />);
    const botao = (await screen.findByRole('button', { name: /Salvar Alterações/ })) as HTMLButtonElement;
    expect(botao.disabled).toBe(false);
    expect(screen.queryByText(/precisa ser depois da data inicial/)).toBeNull();
  });
});

describe('nenhuma lista ficticia sobrou nas telas de alcada', () => {
  const raiz = join(__dirname, '..');
  const arquivos = [
    join(raiz, 'ApprovalRuleModal.tsx'),
    join(raiz, 'ApprovalDelegationModal.tsx'),
  ];

  it.each(arquivos)('%s nao tem mockUsers nem mockCategories', (arquivo) => {
    const fonte = readFileSync(arquivo, 'utf8');
    expect(fonte).not.toMatch(/mockUsers|mockCategories/);
    expect(fonte).not.toMatch(/user-\d/);
  });
});
