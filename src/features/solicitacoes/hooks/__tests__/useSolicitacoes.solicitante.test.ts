import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const chamadas: { eq: [string, unknown][]; in: [string, unknown][] } = { eq: [], in: [] };

const criarBuilder = () => {
  const builder: Record<string, unknown> = {};
  const encadear = () => builder;
  builder.select = encadear;
  builder.order = encadear;
  builder.range = encadear;
  builder.gte = encadear;
  builder.lte = encadear;
  builder.or = encadear;
  builder.eq = (coluna: string, valor: unknown) => {
    chamadas.eq.push([coluna, valor]);
    return builder;
  };
  builder.in = (coluna: string, valor: unknown) => {
    chamadas.in.push([coluna, valor]);
    return builder;
  };
  builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null, count: 0 }).then(resolve);
  return builder;
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(() => criarBuilder()) },
}));

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, organizationId: 'org-1' }),
}));

import { fetchSolicitacoesData, solicitacoesQueryKey } from '../useSolicitacoes';

describe('filtro "Meus Itens" (recorte por solicitante)', () => {
  beforeEach(() => {
    chamadas.eq = [];
    chamadas.in = [];
  });

  it('a consulta filtra por solicitante_id e nao por status', async () => {
    await fetchSolicitacoesData('user-1', 'org-1', { solicitanteId: 'user-1' });
    expect(chamadas.eq).toContainEqual(['solicitante_id', 'user-1']);
    expect(chamadas.eq.map(([coluna]) => coluna)).not.toContain('status');
  });

  it('sem o recorte a consulta nao filtra solicitante_id', async () => {
    await fetchSolicitacoesData('user-1', 'org-1', { status: 'pendente' });
    expect(chamadas.eq).toEqual([
      ['organization_id', 'org-1'],
      ['status', 'pendente'],
    ]);
  });

  it('status e solicitante coexistem quando os dois vem preenchidos', async () => {
    await fetchSolicitacoesData('user-1', 'org-1', { status: 'em_cotacao', solicitanteId: 'user-1' });
    expect(chamadas.eq).toContainEqual(['status', 'em_cotacao']);
    expect(chamadas.eq).toContainEqual(['solicitante_id', 'user-1']);
  });

  it('a chave de cache separa "meus itens" da lista completa', () => {
    const todos = solicitacoesQueryKey('user-1', 'org-1', { status: undefined });
    const meus = solicitacoesQueryKey('user-1', 'org-1', { solicitanteId: 'user-1' });
    expect(todos).not.toEqual(meus);
    expect(meus).toContain('user-1');
    expect(meus.filter((p) => p === 'user-1')).toHaveLength(2);
  });
});

describe('a tela nao trata OWN como status', () => {
  const fonte = readFileSync(join(process.cwd(), 'src/pages/solicitacoes/Solicitacoes.tsx'), 'utf-8');

  it('nao mapeia OWN para status do banco', () => {
    expect(fonte).not.toContain("status: statusFilter !== 'todas' ? mapLegacyStatusToDb(statusFilter) : undefined");
    expect(fonte).toContain('!apenasMeus ? mapLegacyStatusToDb(statusFilter) : undefined');
  });

  it('manda o id do usuario como recorte e compara pelo solicitante da linha', () => {
    expect(fonte).toContain('solicitanteId: apenasMeus ? user?.id : undefined');
    expect(fonte).toContain('const apenasMeus = statusFilter === "OWN"');
    expect(fonte).toContain('solicitantePorId.get(s.id) === user?.id');
    const trecho = fonte.slice(fonte.indexOf('const matchesStatus'), fonte.indexOf('const matchesTipo'));
    expect(trecho).toContain('apenasMeus');
    expect(trecho).toContain('solicitantePorId.get(s.id) === user?.id');
  });
});
