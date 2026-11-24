import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ApprovalHistory, ApprovalStep } from '@/hooks/useApprovalWorkflow';
import {
  distribuicaoPorStatus,
  dentroDaJanela,
  gargalos,
  historicoDaLista,
  inicioDaJanela,
  resumirAprovacoes,
  serieMensal,
  tempoMedioDecisaoHoras,
} from '../aprovacoesData';

const AGORA = new Date(2026, 5, 15, 12, 0, 0);
const horasAtras = (horas: number) => new Date(AGORA.getTime() - horas * 3_600_000).toISOString();

const history = (over: Partial<ApprovalHistory> & { created_at: string; acao: ApprovalHistory['acao'] }) =>
  ({ id: `h-${Math.random()}`, ...over }) as ApprovalHistory;

const step = (over: Partial<ApprovalStep> & { status: ApprovalStep['status']; created_at: string }) =>
  ({ id: `s-${Math.random()}`, etapa: 1, ...over }) as ApprovalStep;

describe('inicioDaJanela', () => {
  it('recua o numero de meses do periodo escolhido', () => {
    expect(inicioDaJanela('1m', AGORA).getMonth()).toBe(4);
    expect(inicioDaJanela('3m', AGORA).getMonth()).toBe(2);
    expect(inicioDaJanela('12m', AGORA).getFullYear()).toBe(2025);
  });

  it('cai em 6 meses quando o periodo nao e conhecido', () => {
    expect(inicioDaJanela('inexistente', AGORA).getMonth()).toBe(11);
  });

  it('dentroDaJanela recusa data vazia, invalida e anterior ao corte', () => {
    const inicio = inicioDaJanela('3m', AGORA);
    expect(dentroDaJanela(horasAtras(1), inicio)).toBe(true);
    expect(dentroDaJanela(horasAtras(24 * 200), inicio)).toBe(false);
    expect(dentroDaJanela(null, inicio)).toBe(false);
    expect(dentroDaJanela('nao-e-data', inicio)).toBe(false);
  });
});

describe('tempoMedioDecisaoHoras', () => {
  it('mede created_at -> decidido_em das etapas decididas na janela', () => {
    const inicio = inicioDaJanela('3m', AGORA);
    const steps = [
      step({ status: 'approved', created_at: horasAtras(5), decidido_em: horasAtras(3) }),
      step({ status: 'rejected', created_at: horasAtras(10), decidido_em: horasAtras(6) }),
      step({ status: 'pending', created_at: horasAtras(2) }),
      step({ status: 'approved', created_at: horasAtras(24 * 200), decidido_em: horasAtras(24 * 199) }),
    ];
    expect(tempoMedioDecisaoHoras(steps, inicio)).toBe(3);
  });

  it('devolve null quando nao ha decisao', () => {
    expect(tempoMedioDecisaoHoras([step({ status: 'pending', created_at: horasAtras(1) })], inicioDaJanela('3m', AGORA))).toBeNull();
  });
});

describe('resumirAprovacoes', () => {
  const inicio = inicioDaJanela('3m', AGORA);
  const lista = [
    history({ created_at: horasAtras(2), acao: 'approved' }),
    history({ created_at: horasAtras(4), acao: 'approved' }),
    history({ created_at: horasAtras(6), acao: 'rejected' }),
    history({ created_at: horasAtras(8), acao: 'escalated' }),
    history({ created_at: horasAtras(24 * 200), acao: 'approved' }),
  ];

  it('conta so o que caiu na janela e usa aprovadas+rejeitadas como denominador', () => {
    const resumo = resumirAprovacoes(lista, 1, [], inicio);
    expect(resumo.pendentes).toBe(1);
    expect(resumo.aprovadas).toBe(2);
    expect(resumo.rejeitadas).toBe(1);
    expect(resumo.escalacoes).toBe(1);
    expect(resumo.taxaAprovacao).toBeCloseTo(66.67, 1);
  });

  it('nao inventa taxa nem tempo medio quando nao houve decisao', () => {
    const resumo = resumirAprovacoes([history({ created_at: horasAtras(2), acao: 'created' })], 0, [], inicio);
    expect(resumo.taxaAprovacao).toBeNull();
    expect(resumo.tempoMedioHoras).toBeNull();
  });
});

describe('serieMensal', () => {
  it('monta um balde por mes do periodo e joga cada movimentacao no mes certo', () => {
    const historico = [
      history({ created_at: new Date(2026, 5, 10, 9).toISOString(), acao: 'approved' }),
      history({ created_at: new Date(2026, 5, 11, 9).toISOString(), acao: 'rejected' }),
      history({ created_at: new Date(2026, 4, 11, 9).toISOString(), acao: 'approved' }),
      history({ created_at: new Date(2026, 0, 11, 9).toISOString(), acao: 'approved' }),
    ];
    const serie = serieMensal(historico, [], '3m', AGORA);
    expect(serie.map((item) => item.mes)).toEqual(['Abr', 'Mai', 'Jun']);
    expect(serie[1].aprovadas).toBe(1);
    expect(serie[2].aprovadas).toBe(1);
    expect(serie[2].rejeitadas).toBe(1);
    expect(serie[0].aprovadas).toBe(0);
  });

  it('calcula o tempo medio de cada mes com as etapas decididas nele', () => {
    const steps = [
      step({ status: 'approved', created_at: new Date(2026, 5, 10, 8).toISOString(), decidido_em: new Date(2026, 5, 10, 10).toISOString() }),
      step({ status: 'rejected', created_at: new Date(2026, 5, 10, 8).toISOString(), decidido_em: new Date(2026, 5, 10, 14).toISOString() }),
    ];
    const serie = serieMensal([], steps, '3m', AGORA);
    expect(serie[2].tempoMedio).toBe(4);
    expect(serie[0].tempoMedio).toBe(0);
  });
});

describe('distribuicaoPorStatus', () => {
  it('conta os status reais e ignora valores desconhecidos', () => {
    const dados = distribuicaoPorStatus([
      { status: 'approved' },
      { status: 'approved' },
      { status: 'rejected' },
      { status: 'pending' },
      { status: 'escalated' },
      { status: 'arquivado' },
    ]);
    expect(dados.map((d) => d.value)).toEqual([2, 1, 1, 1]);
    expect(dados.map((d) => d.name)).toEqual(['Aprovadas', 'Rejeitadas', 'Pendentes', 'Escaladas']);
  });
});

describe('gargalos', () => {
  it('agrupa etapas em aberto por etapa e pesa cada uma no total', () => {
    const steps = [
      step({ status: 'pending', created_at: horasAtras(2), etapa: 1 }),
      step({ status: 'pending', created_at: horasAtras(4), etapa: 1 }),
      step({ status: 'pending', created_at: horasAtras(6), etapa: 2 }),
      step({ status: 'approved', created_at: horasAtras(50), decidido_em: horasAtras(1), etapa: 1 }),
    ];
    const lista = gargalos(steps, AGORA);
    expect(lista).toHaveLength(2);
    expect(lista[0]).toMatchObject({ etapa: '1a etapa', tempo: 3, percentual: 50 });
    expect(lista[1]).toMatchObject({ etapa: '2a etapa', tempo: 6, percentual: 50 });
  });

  it('devolve lista vazia quando nao ha etapa pendente', () => {
    expect(gargalos([], AGORA)).toEqual([]);
  });
});

describe('historicoDaLista', () => {
  it('formata o historico do banco e nao cai em mock quando vazio', () => {
    const item = historicoDaLista([
      history({ id: 'abc', created_at: horasAtras(1), acao: 'approved', solicitacao_id: '12345678-9999', usuario_nome: 'Ana', detalhes: { valor: 1500 } }),
      history({ created_at: horasAtras(2), acao: 'rejected', solicitacao_id: undefined, usuario_nome: '', detalhes: { valor: 'x' } }),
    ]);
    expect(item).toHaveLength(2);
    expect(item[0]).toMatchObject({ id: 'abc', solicitacao: '12345678', valor: 1500, acao: 'approved', por: 'Ana' });
    expect(item[1]).toMatchObject({ solicitacao: 'N/A', valor: 0, por: 'Sistema' });
    expect(historicoDaLista([])).toEqual([]);
  });
});

describe('Aprovacoes.tsx nao volta para os mocks', () => {
  const fonte = readFileSync(join(process.cwd(), 'src/pages/aprovacoes/Aprovacoes.tsx'), 'utf-8');

  it('nao importa nem usa as constantes mock', () => {
    for (const proibido of ['approvalStats', 'approvalTrendData', 'bottleneckData', 'approvalByValueRange', 'weeklyTrend']) {
      expect(fonte).not.toContain(proibido);
    }
    // approvalHistory/statusDistribution so podem aparecer como parte de outro identificador (allHistory, distribuicaoPorStatus)
    expect(/\bapprovalHistory\b/.test(fonte)).toBe(false);
    expect(/\bstatusDistribution\b/.test(fonte)).toBe(false);
  });

  it('consome as agregacoes reais nos cards e graficos', () => {
    for (const exigido of [
      'resumirAprovacoes',
      'serieMensal',
      'distribuicaoPorStatus',
      'gargalos',
      'historicoDaLista',
      'allWorkflows',
      'allSteps',
      'resumo.pendentes}</p>',
      'resumo.aprovadas}</p>',
      'resumo.rejeitadas}</p>',
      'resumo.escalacoes}</p>',
      'resumo.tempoMedioHoras === null ? "\u2014"',
      'inicioDaJanela(periodo)',
      'Nenhuma decisão de aprovação registrada até agora.',
      'Sem decisões de aprovação no período selecionado',
      'Nenhuma etapa de aprovação em aberto no momento.',
    ]) {
      expect(fonte).toContain(exigido);
    }
  });
});
