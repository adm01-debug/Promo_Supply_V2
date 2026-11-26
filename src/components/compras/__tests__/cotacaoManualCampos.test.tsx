import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CotacaoManualModal, type ManualCotacaoData } from '../CotacaoManualModal';
import { toast } from '@/lib/feedbackToast';

/**
 * Etapa 118 (VAL-07) - o modal coletava condicao de pagamento, validade e
 * observacoes e jogava fora: o payload mandava so 'A vista'/'30 dias' (45 e 60
 * dias viravam "30 dias") e validade/observacoes nem saiam do formulario. O
 * chamador tambem nao repassava os campos para createCotacao, e a opcao
 * "+ Novo fornecedor" criava a cotacao sem fornecedor_id (o nome digitado nao
 * era salvo em lugar nenhum). As validacoes faziam `return` mudo.
 */

vi.mock('@/lib/feedbackToast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
}));

// Mock fino do select do Radix: expoe as opcoes reais montadas pelo componente.
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

const FORNECEDORES = [
  { id: 'forn-1', nomeFantasia: 'Alfa Insumos' },
  { id: 'forn-2', nomeFantasia: 'Papelaria Central' },
] as any;

let salvo: ManualCotacaoData | null = null;

const montar = (fornecedores: any = FORNECEDORES) => {
  const onSave = vi.fn((d: ManualCotacaoData) => { salvo = d; });
  render(<CotacaoManualModal open onOpenChange={() => {}} onSave={onSave} fornecedores={fornecedores} />);
  return onSave;
};

const selects = () => screen.getAllByTestId('opcoes') as HTMLSelectElement[];
const selectFornecedor = () => selects()[0];
const selectCondicao = () => selects()[1];
const opcoes = (indice = 0) =>
  Array.from(selects()[indice].querySelectorAll('option'))
    .map((o) => ({ valor: o.value, rotulo: o.textContent ?? '' }));

type Campos = {
  valor?: string; quantidade?: string; prazo?: string; frete?: string;
  fornecedor?: string; condicao?: string; validade?: string; observacoes?: string;
};

const preencher = (campos: Campos) => {
  fireEvent.change(screen.getByPlaceholderText('0,00'), { target: { value: campos.valor ?? '10.5' } });
  const zeros = screen.getAllByPlaceholderText('0');
  fireEvent.change(zeros[0], { target: { value: campos.quantidade ?? '5' } });
  fireEvent.change(zeros[1], { target: { value: campos.prazo ?? '3' } });
  if (campos.frete !== undefined) fireEvent.change(screen.getByPlaceholderText('0,00 (se incluso)'), { target: { value: campos.frete } });
  if (campos.fornecedor !== undefined) fireEvent.change(selectFornecedor(), { target: { value: campos.fornecedor } });
  if (campos.condicao !== undefined) fireEvent.change(selectCondicao(), { target: { value: campos.condicao } });
  if (campos.validade !== undefined) fireEvent.change(document.querySelector('input[type="date"]') as HTMLElement, { target: { value: campos.validade } });
  if (campos.observacoes !== undefined) fireEvent.change(screen.getByPlaceholderText('Informações adicionais...'), { target: { value: campos.observacoes } });
};

const salvar = () => fireEvent.submit(document.querySelector('form') as HTMLFormElement);

beforeEach(() => {
  salvo = null;
  vi.mocked(toast.error).mockClear();
});

describe('CotacaoManualModal entrega os campos que coleta', () => {
  it('grava a condicao escolhida por extenso, sem achatar 45 e 60 dias em "30 dias"', () => {
    montar();
    expect(opcoes(1).map((o) => o.valor)).toEqual(['a_vista', '30_dias', '45_dias', '60_dias']);
    expect(opcoes(1).map((o) => o.rotulo)).toEqual(['À vista', '30 dias', '45 dias', '60 dias']);

    preencher({ fornecedor: 'forn-1', condicao: '60_dias' });
    salvar();
    expect(salvo?.condicaoPagamento).toBe('60 dias');

    preencher({ fornecedor: 'forn-1', condicao: '45_dias' });
    salvar();
    expect(salvo?.condicaoPagamento).toBe('45 dias');

    preencher({ fornecedor: 'forn-1', condicao: 'a_vista' });
    salvar();
    expect(salvo?.condicaoPagamento).toBe('À vista');
  });

  it('leva validade e observacoes no payload, com o fornecedor do cadastro', () => {
    montar();
    preencher({ fornecedor: 'forn-2', condicao: '30_dias', validade: '2026-12-31', observacoes: '  Frete por conta do fornecedor  ' });
    salvar();
    expect(salvo).toMatchObject({
      fornecedor: 'Papelaria Central',
      fornecedor_id: 'forn-2',
      valorUnitario: 10.5,
      quantidadeDisponivel: 5,
      prazoEntrega: 3,
      condicaoPagamento: '30 dias',
      validadeProposta: '2026-12-31',
      observacoes: 'Frete por conta do fornecedor',
    });
  });

  it('nao manda string vazia de validade nem de observacoes', () => {
    montar();
    preencher({ fornecedor: 'forn-1', validade: '', observacoes: '   ' });
    salvar();
    expect(salvo?.validadeProposta).toBeUndefined();
    expect(salvo?.observacoes).toBeUndefined();
  });

  it('nao cria cotacao sem fornecedor do cadastro e avisa na tela', () => {
    const onSave = montar();
    preencher({});
    salvar();
    expect(onSave).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('fornecedor cadastrado'));
    expect(salvo).toBeNull();
  });

  it('avisa em vez de nao fazer nada quando um numero e invalido', () => {
    const onSave = montar();
    preencher({ fornecedor: 'forn-1', valor: '-5' });
    salvar();
    expect(onSave).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('valor unitario'));

    vi.mocked(toast.error).mockClear();
    preencher({ fornecedor: 'forn-1', quantidade: '3.7' });
    salvar();
    expect(onSave).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('quantidade'));
  });

  it('nao oferece fornecedor digitado a mao nem area de anexo decorativa', () => {
    montar();
    expect(opcoes(0).map((o) => o.valor)).not.toContain('novo');
    expect(screen.queryByPlaceholderText('Nome do novo fornecedor')).toBeNull();
    expect(screen.queryByText(/Clique para selecionar arquivo/i)).toBeNull();
    expect(screen.queryByText(/Anexar Cota/i)).toBeNull();
  });

  it('avisa quando nao ha fornecedor ativo cadastrado', () => {
    montar([]);
    expect(screen.getByText(/Nenhum fornecedor ativo cadastrado/)).toBeTruthy();
  });

  it('o chamador repassa condicao, validade e observacoes para createCotacao', () => {
    const fonte = readFileSync(resolve(process.cwd(), 'src/pages/cotacao/Cotacao.tsx'), 'utf8');
    const bloco = fonte.slice(fonte.indexOf('createCotacao({'), fonte.indexOf('},', fonte.indexOf('createCotacao({')));
    expect(bloco).toContain('condicao_pagamento: data.condicaoPagamento');
    expect(bloco).toContain('validade_proposta: data.validadeProposta');
    expect(bloco).toContain('observacoes: data.observacoes');
  });
});