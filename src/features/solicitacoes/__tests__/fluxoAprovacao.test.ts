import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  montarPainelAprovacao,
  nomeDaPessoaDoQuadro,
  rotuloDaAcao,
  statusDaEtapa,
} from '../fluxoAprovacao';

describe('statusDaEtapa', () => {
  it('traduz os status que o banco grava', () => {
    expect(statusDaEtapa({ workflow_id: 'w', etapa: 1, status: 'approved' }, 2)).toBe('concluida');
    expect(statusDaEtapa({ workflow_id: 'w', etapa: 1, status: 'rejected' }, 2)).toBe('rejeitada');
    expect(statusDaEtapa({ workflow_id: 'w', etapa: 1, status: 'skipped' }, 2)).toBe('pulada');
    expect(statusDaEtapa({ workflow_id: 'w', etapa: 1, status: 'aprovado' }, 2)).toBe('concluida');
  });

  it('a etapa pendente na etapa_atual do workflow e a atual', () => {
    expect(statusDaEtapa({ workflow_id: 'w', etapa: 2, status: 'pendente' }, 2)).toBe('atual');
    expect(statusDaEtapa({ workflow_id: 'w', etapa: 3, status: 'pendente' }, 2)).toBe('pendente');
    expect(statusDaEtapa({ workflow_id: 'w', etapa: 3 }, 2)).toBe('pendente');
  });

  it('etapa com decidido_em conta como concluida mesmo sem status explicito', () => {
    expect(statusDaEtapa({ workflow_id: 'w', etapa: 1, decidido_em: '2026-11-20T10:00:00Z' }, 2)).toBe('concluida');
  });
});

describe('rotuloDaAcao e nomeDaPessoaDoQuadro', () => {
  it('traduz as acoes conhecidas e mantem as desconhecidas', () => {
    expect(rotuloDaAcao('created')).toBe('Fluxo criado');
    expect(rotuloDaAcao('rejected')).toBe('Etapa rejeitada');
    expect(rotuloDaAcao('acao_nova')).toBe('acao_nova');
  });

  it('usa nome completo, depois display_name, depois email e por fim o padrao', () => {
    expect(nomeDaPessoaDoQuadro({ full_name: 'Ana', email: 'a@x.com' })).toBe('Ana');
    expect(nomeDaPessoaDoQuadro({ full_name: '  ', display_name: 'Bia' })).toBe('Bia');
    expect(nomeDaPessoaDoQuadro({ email: 'c@x.com' })).toBe('c@x.com');
    expect(nomeDaPessoaDoQuadro(undefined)).toBe('Aprovador');
  });
});

describe('montarPainelAprovacao', () => {
  const workflows = [{ id: 'w-1', solicitacao_id: 's-1', etapa_atual: 2, total_etapas: 3, status: 'pendente' }];
  const etapas = [
    { workflow_id: 'w-1', etapa: 3, aprovador_id: 'p-3', status: 'pendente' },
    { workflow_id: 'w-1', etapa: 1, aprovador_id: 'p-1', status: 'approved', decidido_em: '2026-11-20T10:00:00Z' },
    { workflow_id: 'w-1', etapa: 2, aprovador_id: 'p-2', aprovador_efetivo_id: 'p-9', status: 'pendente' },
  ];
  const pessoas = [
    { user_id: 'p-1', full_name: 'Ana Costa' },
    { user_id: 'p-2', full_name: 'Bruno Lima' },
    { user_id: 'p-3', display_name: 'Carla' },
    { user_id: 'p-9', full_name: 'Delegado Efetivo' },
  ];

  it('monta as etapas na ordem do banco, com o aprovador efetivo e o status real', () => {
    const { fluxos } = montarPainelAprovacao(workflows, etapas, [], pessoas);
    const fluxo = fluxos['s-1'];
    expect(fluxo.workflowId).toBe('w-1');
    expect(fluxo.etapaAtual).toBe(2);
    expect(fluxo.totalEtapas).toBe(3);
    expect(fluxo.etapas.map((e) => [e.ordem, e.status, e.responsavel])).toEqual([
      [1, 'concluida', 'Ana Costa'],
      [2, 'atual', 'Delegado Efetivo'],
      [3, 'pendente', 'Carla'],
    ]);
  });

  it('sem nome conhecido nao inventa pessoa: usa Aprovador', () => {
    const { fluxos } = montarPainelAprovacao(workflows, etapas, [], []);
    expect(fluxos['s-1'].etapas[0].responsavel).toBe('Aprovador');
  });

  it('workflow sem etapas nao ganha etapas ficticias', () => {
    const { fluxos } = montarPainelAprovacao(
      [{ id: 'w-9', solicitacao_id: 's-9', etapa_atual: 1, total_etapas: 2, status: 'pendente' }],
      [],
      [],
    );
    expect(fluxos['s-9'].etapas).toEqual([]);
    expect(fluxos['s-9'].totalEtapas).toBe(2);
  });

  it('solicitacao sem workflow nao aparece no mapa', () => {
    const { fluxos } = montarPainelAprovacao([], [], [], pessoas);
    expect(Object.keys(fluxos)).toEqual([]);
  });

  it('historico real fica por solicitacao e em ordem decrescente', () => {
    const { historicos } = montarPainelAprovacao(workflows, etapas, [
      { solicitacao_id: 's-1', acao: 'created', usuario_nome: 'ana@x.com', created_at: '2026-11-19T10:00:00Z' },
      { solicitacao_id: 's-1', acao: 'approved', usuario_nome: 'Ana', created_at: '2026-11-21T10:00:00Z' },
      { solicitacao_id: 's-2', acao: 'rejected', usuario_nome: null, created_at: '2026-11-22T10:00:00Z' },
      { solicitacao_id: null, acao: 'created', usuario_nome: 'x', created_at: '2026-11-22T10:00:00Z' },
    ], pessoas);
    expect(historicos['s-1'].map((e) => e.rotulo)).toEqual(['Etapa aprovada', 'Fluxo criado']);
    expect(historicos['s-2'][0].usuario).toBe('Sistema');
    expect(historicos['s-2'][0].rotulo).toBe('Etapa rejeitada');
    expect(historicos[''] === undefined).toBe(true);
  });
});

describe('o card nao volta para o prototipo', () => {
  const ler = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf-8');

  it('nao tem nomes ficticios nem predicao neural inventada', () => {
    const fonte = ler('src/components/compras/SolicitacaoCard.tsx');
    expect(fonte).not.toContain('João Silva');
    expect(fonte).not.toContain('Maria Santos');
    expect(fonte).not.toContain('Roberto Costa');
    expect(fonte).not.toContain('Predicted');
    expect(fonte).not.toContain('94%');
    expect(fonte).not.toContain('Neural Context Thread');
    expect(fonte).not.toContain('Adicionar nota neural');
  });

  it('desenha as etapas reais e tem estado vazio explicito', () => {
    const fonte = ler('src/components/compras/SolicitacaoCard.tsx');
    expect(fonte).toContain('fluxo.etapas.map');
    expect(fonte).toContain('Nenhum fluxo de aprovação iniciado');
    expect(fonte).toContain('historicoAprovacao.map');
    expect(fonte).toContain('Nenhuma decisão de aprovação registrada');
  });

  it('a lista alimenta o card com o dado do banco', () => {
    const fonte = ler('src/pages/solicitacoes/Solicitacoes.tsx');
    expect(fonte).toContain('useFluxosAprovacao(idsVisiveis)');
    expect(fonte).toContain('fluxo={fluxosAprovacao[s.id] ?? null}');
    expect(fonte).toContain('historicoAprovacao={historicosAprovacao[s.id] ?? []}');
  });
});
