import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ContractModal } from '../ContractModal';
import { toast } from '@/lib/feedbackToast';

/**
 * Etapa 111 - o modal de contrato pedia o fornecedor como texto livre e
 * fabricava `supplier_id` a partir do nome (slug) ou de um placeholder
 * `supplier-<timestamp>`. `contracts.supplier_id` e `text NOT NULL` sem FK e o
 * painel executivo usa esse campo como id real de `fornecedores` para medir
 * `maverickSpend` - id inventado nunca casa e o gasto fora de contrato fica
 * subestimado. O campo agora e um seletor do cadastro ativo.
 */

const FORNECEDORES = [
  { id: 'forn-1', nome_fantasia: 'Alfa Insumos', razao_social: 'Alfa LTDA' },
  { id: 'forn-2', nome_fantasia: 'Papelaria Central', razao_social: 'Central SA' },
  { id: 'forn-3', nome_fantasia: null, razao_social: 'Beta Distribuidora' },
];

let fornecedoresData = FORNECEDORES;
let eqCalls: [string, string][] = [];
const inserts: { table: string; payload: any }[] = [];
const updates: { table: string; payload: any }[] = [];

vi.mock('@/integrations/supabase/client', () => {
  const builder = (table: string) => {
    const api: any = {
      select: () => api,
      eq: (col: string, val: string) => {
        eqCalls.push([col, val]);
        return api;
      },
      order: () => Promise.resolve({ data: table === 'fornecedores' ? fornecedoresData : [], error: null }),
      single: () => Promise.resolve({ data: { id: 'contrato-novo' }, error: null }),
      insert: (payload: any) => {
        inserts.push({ table, payload });
        return api;
      },
      update: (payload: any) => {
        updates.push({ table, payload });
        return api;
      },
      then: (res: any, rej: any) => Promise.resolve({ data: null, error: null }).then(res, rej),
    };
    return api;
  };
  return { supabase: { from: builder } };
});

vi.mock('@/lib/feedbackToast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onSelect }: any) => (
    <button type="button" data-testid="calendario" onClick={() => onSelect?.(new Date('2026-03-01T12:00:00Z'))}>
      dia
    </button>
  ),
}));

vi.mock('../contract/ContractSLASection', () => ({ ContractSLASection: () => null }));
vi.mock('../contract/ContractItemsEditor', () => ({ ContractItemsEditor: () => null }));
vi.mock('../contract/replaceContractItems', () => ({ replaceContractItems: vi.fn() }));

// Mock fino dos selects do Radix: expoe value/label reais que o componente
// monta, sem portais e pointer capture do jsdom.
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

const valoresDe = (indice: number): string[] =>
  Array.from(screen.getAllByTestId('opcoes')[indice].querySelectorAll('option')).map((o) => (o as HTMLOptionElement).value);

const rotulosDe = (indice: number): string[] =>
  Array.from(screen.getAllByTestId('opcoes')[indice].querySelectorAll('option')).map((o) => o.textContent ?? '');

const indiceDoSelectCom = (rotulo: string): number =>
  screen.getAllByTestId('opcoes').findIndex((sel) =>
    Array.from(sel.querySelectorAll('option')).some((o) => (o.textContent ?? '') === rotulo),
  );

const render = (ui: React.ReactElement) =>
  rtlRender(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

/** Preenche titulo + as duas datas e devolve o select de fornecedor. */
const preencherObrigatorios = async () => {
  fireEvent.change(screen.getByLabelText('Título *'), { target: { value: 'Contrato de insumos' } });
  const dias = screen.getAllByTestId('calendario');
  fireEvent.click(dias[0]);
  fireEvent.click(dias[1]);
  await waitFor(() => expect(screen.getAllByTestId('opcoes').length).toBeGreaterThan(1));
  await waitFor(() => expect(indiceDoSelectCom('Papelaria Central')).toBeGreaterThanOrEqual(0));
};

const contractsInserts = () => inserts.filter((i) => i.table === 'contracts');

beforeEach(() => {
  fornecedoresData = FORNECEDORES;
  eqCalls = [];
  inserts.length = 0;
  updates.length = 0;
});

describe('ContractModal grava o fornecedor do cadastro', () => {
  it('oferece so os fornecedores ativos, com id real e sem sufixo de status', async () => {
    render(<ContractModal open onOpenChange={() => {}} onSuccess={() => {}} />);
    await waitFor(() => expect(indiceDoSelectCom('Papelaria Central')).toBeGreaterThanOrEqual(0));
    const idx = indiceDoSelectCom('Papelaria Central');
    expect(valoresDe(idx)).toEqual(['forn-1', 'forn-2', 'forn-3']);
    expect(rotulosDe(idx)).toEqual(['Alfa Insumos', 'Papelaria Central', 'Beta Distribuidora']);
    expect(rotulosDe(idx).join(' ')).not.toContain('ativo');
    // O filtro de ativos vai na consulta, nao no rotulo.
    expect(eqCalls).toContainEqual(['status', 'ativo']);
  });

  it('sem fornecedor escolhido nao salva e avisa', async () => {
    render(<ContractModal open onOpenChange={() => {}} onSuccess={() => {}} />);
    await preencherObrigatorios();
    fireEvent.click(screen.getByRole('button', { name: 'Criar Contrato' }));
    await waitFor(() => expect(contractsInserts().length).toBe(0));
  });

  it('salva supplier_id com o id do cadastro e supplier_name como copia congelada', async () => {
    const onSuccess = vi.fn();
    render(<ContractModal open onOpenChange={() => {}} onSuccess={onSuccess} />);
    await preencherObrigatorios();
    const idx = indiceDoSelectCom('Papelaria Central');
    fireEvent.change(screen.getAllByTestId('opcoes')[idx], { target: { value: 'forn-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar Contrato' }));
    await waitFor(() => expect(contractsInserts().length).toBe(1));
    const payload = contractsInserts()[0].payload;
    expect(payload.supplier_id).toBe('forn-2');
    expect(payload.supplier_name).toBe('Papelaria Central');
    expect(payload.supplier_id).not.toMatch(/^supplier-/);
    // O que ficou selecionado na tela e o id do cadastro, nao o nome digitado.
    expect((screen.getAllByTestId('opcoes')[idx] as HTMLSelectElement).value).toBe('forn-2');
  });

  it('mantem contrato legado com supplier_id em slug, sem perder o vinculo', async () => {
    const legado: any = {
      id: 'contrato-antigo',
      contract_number: 'CTR-0001',
      title: 'Contrato antigo',
      description: null,
      supplier_id: 'papelaria-central',
      supplier_name: 'Papelaria Central Ltda',
      contract_type: 'service',
      status: 'active',
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      total_value: 1000,
      payment_terms: null,
      renewal_type: 'manual',
      renewal_notice_days: 30,
    };
    render(<ContractModal open onOpenChange={() => {}} onSuccess={() => {}} contract={legado} />);
    await waitFor(() => expect(indiceDoSelectCom('Papelaria Central Ltda')).toBeGreaterThanOrEqual(0));
    const idx = indiceDoSelectCom('Papelaria Central Ltda');
    expect(valoresDe(idx)).toContain('papelaria-central');
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    await waitFor(() => expect(updates.filter((u) => u.table === 'contracts').length).toBe(1));
    expect(updates.filter((u) => u.table === 'contracts')[0].payload.supplier_id).toBe('papelaria-central');
  });

  it('contrato legado com supplier_id vazio nao e salvo de volta com id vazio', async () => {
    const semId: any = {
      id: 'contrato-sem-id',
      contract_number: 'CTR-0002',
      title: 'Contrato sem vinculo',
      description: null,
      supplier_id: '',
      supplier_name: 'Papelaria Central Ltda',
      contract_type: 'service',
      status: 'active',
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      total_value: 1000,
      payment_terms: null,
      renewal_type: 'manual',
      renewal_notice_days: 30,
    };
    render(<ContractModal open onOpenChange={() => {}} onSuccess={() => {}} contract={semId} />);
    await waitFor(() => expect(indiceDoSelectCom('Papelaria Central')).toBeGreaterThanOrEqual(0));
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Preencha todos os campos obrigatórios'));
    expect(updates.filter((u) => u.table === 'contracts')).toHaveLength(0);
  });
});