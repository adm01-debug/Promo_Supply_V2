import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const chamadas: { or: string[] } = { or: [] };

const criarBuilder = () => {
  const builder: Record<string, unknown> = {};
  const encadear = () => builder;
  builder.select = encadear;
  builder.order = encadear;
  builder.range = encadear;
  builder.gte = encadear;
  builder.lte = encadear;
  builder.eq = encadear;
  builder.in = encadear;
  builder.or = (expressao: string) => {
    chamadas.or.push(expressao);
    return builder;
  };
  builder.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: [], error: null, count: 0 }).then(resolve);
  return builder;
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(() => criarBuilder()) },
}));

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, organizationId: 'org-1' }),
}));

import { fetchSolicitacoesData } from '../useSolicitacoes';

// Etapa 213: a busca saiu do cliente e passou a ser 100% do servidor. Como o
// `matchesSearch` local casava apenas id/empresa/produto, procurar por numero
// devolvia zero mesmo com a linha certa na resposta. Para nao perder a busca
// por "empresa" (coluna `departamento`), ela entrou no `.or`.
describe('busca de solicitacoes no servidor (etapa 213)', () => {
  beforeEach(() => {
    chamadas.or = [];
  });

  it('procura por titulo, numero, descricao e departamento', async () => {
    await fetchSolicitacoesData('user-1', 'org-1', { search: 'grafica' });

    expect(chamadas.or).toHaveLength(1);
    const expressao = chamadas.or[0];
    expect(expressao).toContain('titulo.ilike.%grafica%');
    expect(expressao).toContain('numero.ilike.%grafica%');
    expect(expressao).toContain('descricao.ilike.%grafica%');
    expect(expressao).toContain('departamento.ilike.%grafica%');
  });

  it('sem termo de busca nao monta o or', async () => {
    await fetchSolicitacoesData('user-1', 'org-1', { status: 'pendente' });
    expect(chamadas.or).toHaveLength(0);
  });

  it('escapa curingas do termo para nao virar coringa do ilike', async () => {
    await fetchSolicitacoesData('user-1', 'org-1', { search: '50%_' });
    expect(chamadas.or[0]).not.toContain('%50%_%');
  });
});

// A tela nao pode voltar a refiltrar a busca em JS: era isso que zerava o
// resultado ao procurar por numero de solicitacao (o numero nao casa com id).
describe('a tela nao refiltra a busca sobre a pagina', () => {
  const fonte = readFileSync(join(process.cwd(), 'src/pages/solicitacoes/Solicitacoes.tsx'), 'utf-8');

  it('nao tem mais o filtro local de busca', () => {
    expect(fonte).not.toContain('matchesSearch');
  });

  it('mantem a busca no hook', () => {
    expect(fonte).toContain('search: searchTerm || undefined');
  });
});
