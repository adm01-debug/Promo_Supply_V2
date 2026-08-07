import { describe, it, expect, vi } from 'vitest';
import { adaptFornecedoresToLegacy, adaptCotacoesFromDB } from '../cotacaoHelpers';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

type FornecedorRow = {
  id: string;
  razao_social: string;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  tipo?: string | null;
  segmento?: string | null;
  email?: string | null;
  telefone?: string | null;
  integrado_api?: boolean | null;
  avaliacao?: number | null;
};

type CotacaoRow = {
  id: string;
  fornecedor?: { nome_fantasia?: string | null; razao_social?: string | null } | null;
  valor_unitario?: number | null;
  quantidade?: number | null;
  prazo_entrega?: number | null;
  valor_frete?: number | null;
  condicao_pagamento?: string | null;
  valor_total?: number | null;
  selecionada?: boolean | null;
  score_preco?: number | null;
  score_prazo?: number | null;
  score_qualidade?: number | null;
  score_total?: number | null;
};

const makeFornecedorRow = (overrides: Partial<FornecedorRow> = {}): FornecedorRow => ({
  id: 'f1',
  razao_social: 'Empresa XYZ Ltda',
  nome_fantasia: 'XYZ',
  cnpj: '11.111.111/0001-00',
  tipo: 'fabricante',
  segmento: 'Brindes',
  email: 'contato@xyz.com',
  telefone: '11999990000',
  integrado_api: false,
  avaliacao: 4.0,
  ...overrides,
});

const makeCotacaoRow = (overrides: Partial<CotacaoRow> = {}): CotacaoRow => ({
  id: 'c1',
  fornecedor: { nome_fantasia: 'FornA', razao_social: 'Fornecedor A Ltda' },
  valor_unitario: 25.5,
  quantidade: 100,
  prazo_entrega: 5,
  valor_frete: 150,
  condicao_pagamento: '30 dias',
  valor_total: 2700,
  selecionada: false,
  score_preco: 85,
  score_prazo: 90,
  score_qualidade: 80,
  score_total: 85,
  ...overrides,
});

describe('adaptFornecedoresToLegacy', () => {
  it('maps a basic fornecedor row correctly', () => {
    const [result] = adaptFornecedoresToLegacy([makeFornecedorRow()]);
    expect(result.id).toBe('f1');
    expect(result.razaoSocial).toBe('Empresa XYZ Ltda');
    expect(result.nomeFantasia).toBe('XYZ');
    expect(result.cnpj).toBe('11.111.111/0001-00');
  });

  it('returns empty array for empty input', () => {
    expect(adaptFornecedoresToLegacy([])).toEqual([]);
  });

  it('falls back to razao_social when nome_fantasia is null', () => {
    const [result] = adaptFornecedoresToLegacy([makeFornecedorRow({ nome_fantasia: null })]);
    expect(result.nomeFantasia).toBe('Empresa XYZ Ltda');
    expect(result.nome_fantasia).toBe('Empresa XYZ Ltda');
  });

  it('maps tipo internacional to IMPORTADORA', () => {
    const [result] = adaptFornecedoresToLegacy([makeFornecedorRow({ tipo: 'internacional' })]);
    expect(result.tipo).toBe('IMPORTADORA');
  });

  it('maps tipo local to DISTRIBUIDORA', () => {
    const [result] = adaptFornecedoresToLegacy([makeFornecedorRow({ tipo: 'local' })]);
    expect(result.tipo).toBe('DISTRIBUIDORA');
  });

  it('maps any other tipo to FABRICANTE', () => {
    const [result] = adaptFornecedoresToLegacy([makeFornecedorRow({ tipo: 'unknown' })]);
    expect(result.tipo).toBe('FABRICANTE');
  });

  it('maps email and telefone correctly', () => {
    const [result] = adaptFornecedoresToLegacy([
      makeFornecedorRow({ email: 'a@b.com', telefone: '11999991111' }),
    ]);
    expect(result.email).toBe('a@b.com');
    expect(result.telefone).toBe('11999991111');
    expect(result.whatsapp).toBe('11999991111');
  });

  it('returns empty strings for null contact fields', () => {
    const [result] = adaptFornecedoresToLegacy([
      makeFornecedorRow({ email: null, telefone: null, cnpj: null }),
    ]);
    expect(result.email).toBe('');
    expect(result.telefone).toBe('');
    expect(result.cnpj).toBe('');
  });

  it('sets apiIntegrada from integrado_api', () => {
    const [integrated] = adaptFornecedoresToLegacy([makeFornecedorRow({ integrado_api: true })]);
    const [notIntegrated] = adaptFornecedoresToLegacy([makeFornecedorRow({ integrado_api: null })]);
    expect(integrated.apiIntegrada).toBe(true);
    expect(notIntegrated.apiIntegrada).toBe(false);
  });

  it('rounds avaliacao for rating', () => {
    const [result] = adaptFornecedoresToLegacy([makeFornecedorRow({ avaliacao: 3.6 })]);
    expect(result.rating).toBe(4);
  });

  it('defaults rating to 0 when avaliacao is null', () => {
    const [result] = adaptFornecedoresToLegacy([makeFornecedorRow({ avaliacao: null })]);
    expect(result.rating).toBe(0);
  });

  it('puts segmento in ramos', () => {
    const [result] = adaptFornecedoresToLegacy([makeFornecedorRow({ segmento: 'Eletro' })]);
    expect(result.ramos).toEqual(['Eletro']);
  });

  it('empty ramos when segmento is null', () => {
    const [result] = adaptFornecedoresToLegacy([makeFornecedorRow({ segmento: null })]);
    expect(result.ramos).toEqual([]);
  });

  it('maps multiple rows', () => {
    const rows = [makeFornecedorRow({ id: 'f1' }), makeFornecedorRow({ id: 'f2' })];
    const result = adaptFornecedoresToLegacy(rows);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('f1');
    expect(result[1].id).toBe('f2');
  });
});

describe('adaptCotacoesFromDB', () => {
  it('maps basic cotacao row', () => {
    const [result] = adaptCotacoesFromDB([makeCotacaoRow()]);
    expect(result.id).toBe('c1');
    expect(result.valorUnitario).toBe(25.5);
    expect(result.quantidadeDisponivel).toBe(100);
    expect(result.prazoEntrega).toBe(5);
    expect(result.frete).toBe(150);
    expect(result.total).toBe(2700);
  });

  it('returns empty array for empty input', () => {
    expect(adaptCotacoesFromDB([])).toEqual([]);
  });

  it('sets status to encontrado', () => {
    const [result] = adaptCotacoesFromDB([makeCotacaoRow()]);
    expect(result.status).toBe('encontrado');
  });

  it('uses fornecedor.nome_fantasia for fornecedor field', () => {
    const [result] = adaptCotacoesFromDB([makeCotacaoRow()]);
    expect(result.fornecedor).toBe('FornA');
  });

  it('falls back to razao_social when nome_fantasia is null', () => {
    const row = makeCotacaoRow({
      fornecedor: { nome_fantasia: null, razao_social: 'Fornecedor A Ltda' },
    });
    const [result] = adaptCotacoesFromDB([row]);
    expect(result.fornecedor).toBe('Fornecedor A Ltda');
  });

  it('falls back to "Fornecedor" when both names are null', () => {
    const row = makeCotacaoRow({ fornecedor: null });
    const [result] = adaptCotacoesFromDB([row]);
    expect(result.fornecedor).toBe('Fornecedor');
  });

  it('sets freteInfo to "+R$ N" when frete > 0', () => {
    const [result] = adaptCotacoesFromDB([makeCotacaoRow({ valor_frete: 200 })]);
    expect(result.freteInfo).toBe('+R$ 200');
  });

  it('sets freteInfo to "Incluso" when frete is 0', () => {
    const [result] = adaptCotacoesFromDB([makeCotacaoRow({ valor_frete: 0 })]);
    expect(result.freteInfo).toBe('Incluso');
  });

  it('uses "À vista" when condicao_pagamento is null', () => {
    const [result] = adaptCotacoesFromDB([makeCotacaoRow({ condicao_pagamento: null })]);
    expect(result.condicaoPagamento).toBe('À vista');
  });

  it('maps condicao_pagamento when present', () => {
    const [result] = adaptCotacoesFromDB([makeCotacaoRow({ condicao_pagamento: '30/60 dias' })]);
    expect(result.condicaoPagamento).toBe('30/60 dias');
  });

  it('maps selecionada flag', () => {
    const [selected] = adaptCotacoesFromDB([makeCotacaoRow({ selecionada: true })]);
    expect(selected.selecionada).toBe(true);
  });

  it('defaults numeric fields to 0 when null', () => {
    const row = makeCotacaoRow({
      valor_unitario: null,
      quantidade: null,
      prazo_entrega: null,
      valor_frete: null,
      valor_total: null,
    });
    const [result] = adaptCotacoesFromDB([row]);
    expect(result.valorUnitario).toBe(0);
    expect(result.quantidadeDisponivel).toBe(0);
    expect(result.prazoEntrega).toBe(0);
    expect(result.frete).toBe(0);
    expect(result.total).toBe(0);
  });

  it('maps score fields', () => {
    const [result] = adaptCotacoesFromDB([makeCotacaoRow()]);
    expect(result.score_preco).toBe(85);
    expect(result.score_prazo).toBe(90);
    expect(result.score_qualidade).toBe(80);
    expect(result.score_total).toBe(85);
  });

  it('maps multiple rows', () => {
    const rows = [makeCotacaoRow({ id: 'c1' }), makeCotacaoRow({ id: 'c2' })];
    const result = adaptCotacoesFromDB(rows);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('c1');
    expect(result[1].id).toBe('c2');
  });
});
