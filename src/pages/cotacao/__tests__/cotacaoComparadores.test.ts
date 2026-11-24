import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fetchRegisteredQuotes, unirCotacoesPorId, type CotacaoAPI } from '../cotacaoHelpers';

/**
 * Etapa 249 (UI-14) - os comparadores recebiam apenas `cotacoesAPI`, que so a
 * busca manual preenche: quando a solicitacao ja tinha cotacoes registradas os
 * dois botoes de comparacao simplesmente nao existiam. E `fetchRegisteredQuotes`
 * consultava `cotacoes` sem o recorte de organizacao que o hook `useCotacoes`
 * aplica, entao a busca devolvia linhas que o hook nunca carrega: o fornecedor
 * aparecia marcado na tela e nada era gravado.
 */

const estado = vi.hoisted(() => ({
  chamadas: [] as Array<{ metodo: string; args: unknown[] }>,
  resposta: { data: [] as unknown[] | null, error: null as unknown },
}));

vi.mock('@/integrations/supabase/client', () => {
  const criarConstrutor = () => {
    const api: Record<string, unknown> = {};
    const registrar = (metodo: string) => (...args: unknown[]) => {
      estado.chamadas.push({ metodo, args });
      return api;
    };
    api.select = registrar('select');
    api.eq = registrar('eq');
    api.not = registrar('not');
    api.then = (ok: (v: unknown) => unknown, falha?: (e: unknown) => unknown) =>
      Promise.resolve(estado.resposta).then(ok, falha);
    return api;
  };
  return {
    supabase: {
      from: (tabela: string) => {
        estado.chamadas.push({ metodo: 'from', args: [tabela] });
        return criarConstrutor();
      },
    },
  };
});

const cotacaoApi = (id: string): CotacaoAPI => ({
  id,
  fornecedor: `Fornecedor ${id}`,
  fornecedor_id: `forn-${id}`,
  status: 'encontrado',
  valorUnitario: 10,
  quantidadeDisponivel: 5,
  prazoEntrega: 3,
  frete: 0,
  freteInfo: 'Incluso',
  condicaoPagamento: 'A vista',
  total: 50,
});

const linhaDoBanco = (id: string) => ({
  id,
  fornecedor_id: `forn-${id}`,
  valor_unitario: 10,
  quantidade: 5,
  valor_frete: 0,
  prazo_entrega: 3,
  condicao_pagamento: 'A vista',
  valor_total: 50,
  selecionada: false,
  fornecedor: { nome_fantasia: `Fornecedor ${id}`, razao_social: `Fornecedor ${id} LTDA` },
});

describe('fetchRegisteredQuotes', () => {
  beforeEach(() => {
    estado.chamadas = [];
    estado.resposta = { data: [], error: null };
  });

  it('usa o mesmo recorte do hook: solicitacao + organizacao do usuario', async () => {
    estado.resposta = { data: [linhaDoBanco('a'), linhaDoBanco('b')], error: null };

    const cotacoes = await fetchRegisteredQuotes('sol-1', 7, 'org-1');

    expect(cotacoes.map((c) => c.id)).toEqual(['a', 'b']);
    expect(estado.chamadas).toContainEqual({ metodo: 'from', args: ['cotacoes'] });
    expect(estado.chamadas).toContainEqual({ metodo: 'eq', args: ['solicitacao_id', 'sol-1'] });
    expect(estado.chamadas).toContainEqual({ metodo: 'eq', args: ['organization_id', 'org-1'] });
  });

  it('sem organizacao nao consulta o banco, como o hook desabilitado', async () => {
    const semOrganizacao = await fetchRegisteredQuotes('sol-1', 7, null);
    const indefinida = await fetchRegisteredQuotes('sol-1', 7, undefined);

    expect(semOrganizacao).toEqual([]);
    expect(indefinida).toEqual([]);
    expect(estado.chamadas).toEqual([]);
  });
});

describe('unirCotacoesPorId', () => {
  it('nao repete a cotacao presente nos dois conjuntos e mantem a ordem', () => {
    const doHook = [cotacaoApi('a'), cotacaoApi('b')];
    const daBusca = [cotacaoApi('b'), cotacaoApi('c')];

    const uniao = unirCotacoesPorId(doHook, daBusca);

    expect(uniao.map((c) => c.id)).toEqual(['a', 'b', 'c']);
    expect(uniao[1]).toBe(doHook[1]);
  });

  it('sem resultado na busca devolve exatamente o conjunto do hook', () => {
    const doHook = [cotacaoApi('a')];

    expect(unirCotacoesPorId(doHook, [])).toEqual(doHook);
  });
});

describe('Cotacao.tsx', () => {
  const fonte = () => readFileSync(resolve(process.cwd(), 'src/pages/cotacao/Cotacao.tsx'), 'utf8');

  it('entrega o conjunto completo (hook + busca) aos dois comparadores', () => {
    const linhas = fonte()
      .split('\n')
      .filter((linha) => linha.includes('<ComparadorCotacoes') || linha.includes('<VisualComparadorCotacoes'));

    expect(linhas).toHaveLength(2);
    linhas.forEach((linha) => expect(linha).toContain('cotacoes={allCotacoes}'));
  });

  it('busca as cotacoes registradas com a organizacao da sessao', () => {
    expect(fonte()).toContain('fetchRegisteredQuotes(solicitacaoId, solicitacao?.quantidade || 100, organizationId)');
  });
});
