import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  mapDbStatusToLegacy,
  mapLegacyStatusToDb,
  adaptToLegacyFormat,
  statusConfig,
  posicoesDaMatriz,
  nomeDoGestor,
  SEM_GESTOR,
  GESTOR_SEM_NOME,
} from '../solicitacoesHelpers';
import type { Solicitacao } from '@/features/solicitacoes';

type DbStatus = Solicitacao['status'];

const makeSolicitacao = (overrides: Partial<Solicitacao> = {}): Solicitacao => ({
  id: 'sol-1',
  numero: 'SOL-001',
  titulo: 'Camisetas Personalizadas',
  quantidade: 100,
  tipo: 'produto',
  status: 'pendente',
  departamento: 'Marketing',
  observacoes: 'Urgente',
  data_necessidade: '2024-06-01',
  valor_estimado: 5000,
  tenant_id: 'tenant-1',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  organization: { name: 'Acme Corp' },
  cost_center: { name: 'Marketing Center', code: 'MKT001' },
  ...overrides,
} as Solicitacao);

describe('mapDbStatusToLegacy', () => {
  const cases: Array<[DbStatus, string]> = [
    ['pendente', 'AGUARDANDO_COTACAO'],
    ['em_cotacao', 'EM_COTACAO'],
    ['aprovada', 'FORNECEDOR_SELECIONADO'],
    ['em_andamento', 'AGUARDANDO_PAGAMENTO'],
    ['concluida', 'ENTREGUE'],
    ['rejeitada', 'REJEITADA'],
    ['cancelada', 'CANCELADA'],
  ];

  it.each(cases)('maps %s → %s', (db, legacy) => {
    expect(mapDbStatusToLegacy(db)).toBe(legacy);
  });
});

describe('mapLegacyStatusToDb', () => {
  const cases: Array<[string, DbStatus]> = [
    ['AGUARDANDO_COTACAO', 'pendente'],
    ['EM_COTACAO', 'em_cotacao'],
    ['FORNECEDOR_SELECIONADO', 'aprovada'],
    ['AGUARDANDO_PAGAMENTO', 'em_andamento'],
    ['PAGO', 'concluida'],
    ['EM_TRANSITO', 'concluida'],
    ['ENTREGUE', 'concluida'],
    ['PEDIDO_GERADO', 'em_andamento'],
    ['REJEITADA', 'rejeitada'],
    ['CANCELADA', 'cancelada'],
  ];

  it.each(cases)('maps %s → %s', (legacy, db) => {
    expect(mapLegacyStatusToDb(legacy)).toBe(db);
  });

  it('defaults to pendente for unknown legacy status', () => {
    expect(mapLegacyStatusToDb('UNKNOWN_STATUS')).toBe('pendente');
  });
});

describe('adaptToLegacyFormat', () => {
  it('maps id correctly', () => {
    const result = adaptToLegacyFormat(makeSolicitacao({ id: 'test-id' }));
    expect(result.id).toBe('test-id');
  });

  it('uses numero as itemNumber', () => {
    const result = adaptToLegacyFormat(makeSolicitacao({ numero: 'SOL-999' }));
    expect(result.itemNumber).toBe('SOL-999');
  });

  it('uses first 8 chars of id as itemNumber when numero is null', () => {
    const sol = makeSolicitacao({ id: 'abcdefgh-1234', numero: undefined });
    const result = adaptToLegacyFormat(sol);
    expect(result.itemNumber).toBe('abcdefgh');
  });

  it('maps departamento to empresa', () => {
    const result = adaptToLegacyFormat(makeSolicitacao({ departamento: 'Financeiro' }));
    expect(result.empresa).toBe('Financeiro');
  });

  it('defaults empresa to "Empresa" when departamento is null', () => {
    const result = adaptToLegacyFormat(makeSolicitacao({ departamento: null }));
    expect(result.empresa).toBe('Empresa');
  });

  it('maps titulo to produto', () => {
    const result = adaptToLegacyFormat(makeSolicitacao({ titulo: 'Canetas Personalizadas' }));
    expect(result.produto).toBe('Canetas Personalizadas');
  });

  it('maps quantidade', () => {
    const result = adaptToLegacyFormat(makeSolicitacao({ quantidade: 250 }));
    expect(result.quantidade).toBe(250);
  });

  it('computes quantidadeReal as ceil(quantidade * 1.02)', () => {
    const result = adaptToLegacyFormat(makeSolicitacao({ quantidade: 100 }));
    expect(result.quantidadeReal).toBe(102);
  });

  it('maps tipo material to PE_LISO', () => {
    const result = adaptToLegacyFormat(makeSolicitacao({ tipo: 'material' }));
    expect(result.tipo).toBe('PE_LISO');
  });

  it('maps tipo servico to FAB_LISO', () => {
    const result = adaptToLegacyFormat(makeSolicitacao({ tipo: 'servico' }));
    expect(result.tipo).toBe('FAB_LISO');
  });

  it('maps other tipo to FAB_PERSONALIZADO', () => {
    const result = adaptToLegacyFormat(makeSolicitacao({ tipo: 'produto' }));
    expect(result.tipo).toBe('FAB_PERSONALIZADO');
  });

  it('maps status via mapDbStatusToLegacy', () => {
    const result = adaptToLegacyFormat(makeSolicitacao({ status: 'concluida' }));
    expect(result.status).toBe('ENTREGUE');
  });

  it('nao le mais observacoes: texto livre nao vira nome de gestor', () => {
    const result = adaptToLegacyFormat(makeSolicitacao({ aprovador_id: null, observacoes: 'João Silva' }));
    expect(result.vendedor).toBe(SEM_GESTOR);
  });

  it('solicitacao sem aprovador_id (legado) mostra "Sem gestor"', () => {
    const result = adaptToLegacyFormat(makeSolicitacao({ aprovador_id: null }));
    expect(result.vendedor).toBe(SEM_GESTOR);
  });

  it('vendedor e o nome do gestor gravado em aprovador_id', () => {
    const nomes = new Map([['user-9', 'João Silva']]);
    const result = adaptToLegacyFormat(makeSolicitacao({ aprovador_id: 'user-9' }), nomes);
    expect(result.vendedor).toBe('João Silva');
  });

  it('id gravado com espacos em volta ainda encontra o nome', () => {
    const nomes = new Map([['user-9', 'João Silva']]);
    const result = adaptToLegacyFormat(makeSolicitacao({ aprovador_id: '  user-9  ' }), nomes);
    expect(result.vendedor).toBe('João Silva');
  });

  it('id sem nome carregado nao vira "Sem gestor": o gestor existe', () => {
    const nomes = new Map([['user-9', 'João Silva']]);
    const result = adaptToLegacyFormat(makeSolicitacao({ aprovador_id: 'user-fora-do-mapa' }), nomes);
    expect(result.vendedor).toBe(GESTOR_SEM_NOME);
    expect(result.vendedor).not.toBe(SEM_GESTOR);
  });

  it('nome em branco no mapa cai em "Gestor nao identificado"', () => {
    const nomes = new Map([['user-9', '   ']]);
    const result = adaptToLegacyFormat(makeSolicitacao({ aprovador_id: 'user-9' }), nomes);
    expect(result.vendedor).toBe(GESTOR_SEM_NOME);
  });

  it('sem o mapa (perfis ainda nao carregados) nao inventa nome', () => {
    const result = adaptToLegacyFormat(makeSolicitacao({ aprovador_id: 'user-9' }));
    expect(result.vendedor).toBe(GESTOR_SEM_NOME);
  });

  it('nomeDoGestor aceita a solicitacao crua do banco', () => {
    const nomes = new Map([['user-9', 'João Silva']]);
    expect(nomeDoGestor({ aprovador_id: 'user-9' }, nomes)).toBe('João Silva');
    expect(nomeDoGestor({ aprovador_id: null }, nomes)).toBe(SEM_GESTOR);
  });

  it('uses data_necessidade as prazoEntrega', () => {
    const result = adaptToLegacyFormat(makeSolicitacao({ data_necessidade: '2024-12-31' }));
    expect(result.prazoEntrega).toBe('2024-12-31');
  });

  it('falls back to created_at when data_necessidade is null', () => {
    const result = adaptToLegacyFormat(
      makeSolicitacao({ data_necessidade: null, created_at: '2024-01-15T10:00:00Z' })
    );
    expect(result.prazoEntrega).toBe('2024-01-15T10:00:00Z');
  });

  it('maps valor_estimado to valorTotal', () => {
    const result = adaptToLegacyFormat(makeSolicitacao({ valor_estimado: 12500 }));
    expect(result.valorTotal).toBe(12500);
  });

  it('defaults valorTotal to 0 when valor_estimado is null', () => {
    const result = adaptToLegacyFormat(makeSolicitacao({ valor_estimado: null }));
    expect(result.valorTotal).toBe(0);
  });

  it('maps createdAt', () => {
    const result = adaptToLegacyFormat(makeSolicitacao({ created_at: '2024-03-01T09:00:00Z' }));
    expect(result.createdAt).toBe('2024-03-01T09:00:00Z');
  });

  it('includes organizationName from nested organization', () => {
    const result = adaptToLegacyFormat(makeSolicitacao({ organization: { name: 'PromoBrindes' } }));
    expect(result.organizationName).toBe('PromoBrindes');
  });

  it('includes costCenterName and costCenterCode', () => {
    const result = adaptToLegacyFormat(
      makeSolicitacao({ cost_center: { name: 'TI', code: 'TI001' } })
    );
    expect(result.costCenterName).toBe('TI');
    expect(result.costCenterCode).toBe('TI001');
  });
});

describe('statusConfig', () => {
  it('has entries for all legacy statuses', () => {
    const expectedKeys = [
      'AGUARDANDO_COTACAO', 'EM_COTACAO', 'FORNECEDOR_SELECIONADO',
      'AGUARDANDO_PAGAMENTO', 'ENTREGUE', 'REJEITADA', 'CANCELADA',
    ];
    expectedKeys.forEach(key => {
      expect(statusConfig).toHaveProperty(key);
    });
  });

  it('each entry has label, color, and indicatorStatus', () => {
    Object.values(statusConfig).forEach(cfg => {
      expect(typeof cfg.label).toBe('string');
      expect(typeof cfg.color).toBe('string');
      expect(['pending', 'processing', 'approved', 'completed', 'warning', 'info', 'error']).toContain(cfg.indicatorStatus);
    });
  });
});

describe('posicoesDaMatriz', () => {
  const agora = new Date('2026-06-10T12:00:00Z');
  const emDias = (dias: number) => new Date(agora.getTime() + dias * 86_400_000).toISOString();

  const item = (id: string, valorTotal: number, prazoEntrega: string | null) =>
    ({ id, valorTotal, prazoEntrega }) as { id: string; valorTotal: number; prazoEntrega: string | null };

  it('eixo X vem do valor relativo ao maior da lista', () => {
    const pontos = posicoesDaMatriz([
      item('a', 1000, emDias(10)),
      item('b', 500, emDias(10)),
      item('c', 0, emDias(10)),
    ], agora);
    expect(pontos.map((p) => p.esquerda)).toEqual([95, 50, 5]);
  });

  it('eixo Y vem do prazo: atrasado no topo, folga longa no rodape', () => {
    const pontos = posicoesDaMatriz([
      item('urgente', 100, emDias(0)),
      item('meio', 100, emDias(45)),
      item('folgado', 100, emDias(90)),
    ], agora);
    expect(pontos[0].base).toBe(95);
    expect(pontos[1].base).toBe(50);
    expect(pontos[2].base).toBe(5);
  });

  it('item sem prazo fica em faixa neutra e com diasRestantes nulo', () => {
    const [ponto] = posicoesDaMatriz([item('sem-prazo', 100, null)], agora);
    expect(ponto.diasRestantes).toBeNull();
    expect(ponto.base).toBe(36.5);
  });

  it('lista sem valor nenhum nao divide por zero', () => {
    const pontos = posicoesDaMatriz([item('a', 0, emDias(10)), item('b', 0, emDias(10))], agora);
    expect(pontos.every((p) => p.esquerda === 50)).toBe(true);
  });

  it('lista vazia devolve vazio', () => {
    expect(posicoesDaMatriz([], agora)).toEqual([]);
  });
});

describe('Solicitacoes.tsx nao posiciona os pontos da matriz pelo indice', () => {
  const fonte = readFileSync(join(process.cwd(), 'src/pages/solicitacoes/Solicitacoes.tsx'), 'utf-8');

  it('usa posicoesDaMatriz para o eixo X e Y', () => {
    expect(fonte).toContain('posicoesDaMatriz(filteredSolicitacoes.slice(0, 15))');
    expect(fonte).toContain('ponto.esquerda');
    expect(fonte).toContain('ponto.base');
    expect(fonte).not.toContain('i * 7');
    expect(fonte).not.toContain('valorTotal / 10000');
  });
});

describe('Solicitacoes.tsx resolve o gestor pelo aprovador_id', () => {
  const fonte = readFileSync(join(process.cwd(), 'src/pages/solicitacoes/Solicitacoes.tsx'), 'utf-8');
  const hook = readFileSync(join(process.cwd(), 'src/features/solicitacoes/hooks/useNomesDeGestor.ts'), 'utf-8');

  it('passa o mapa de nomes para o adaptador', () => {
    expect(fonte).toContain('useNomesDeGestor(solicitacoes.map((s) => s.aprovador_id))');
    expect(fonte).toContain('adaptToLegacyFormat(s, nomesDeGestor)');
    expect(fonte).not.toContain('solicitacoes.map(adaptToLegacyFormat)');
  });

  it('o mapa sai de profiles.user_id', () => {
    expect(hook).toContain(".from('profiles')");
    expect(hook).toContain('user_id, full_name, display_name, email');
    expect(hook).toContain(".in('user_id', ids)");
  });
});
