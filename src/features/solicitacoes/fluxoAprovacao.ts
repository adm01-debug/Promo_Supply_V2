export type StatusEtapaAprovacao = 'concluida' | 'atual' | 'pendente' | 'rejeitada' | 'pulada';

export interface PessoaDoQuadro {
  user_id?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  email?: string | null;
}

export interface WorkflowAprovacaoRow {
  id: string;
  solicitacao_id?: string | null;
  etapa_atual?: number | null;
  total_etapas?: number | null;
  status?: string | null;
}

export interface EtapaAprovacaoRow {
  workflow_id: string;
  etapa: number;
  aprovador_id?: string | null;
  aprovador_efetivo_id?: string | null;
  status?: string | null;
  comentario?: string | null;
  decidido_em?: string | null;
}

export interface HistoricoAprovacaoRow {
  solicitacao_id?: string | null;
  acao: string;
  usuario_nome?: string | null;
  created_at: string;
}

export interface EtapaAprovacao {
  ordem: number;
  status: StatusEtapaAprovacao;
  responsavel: string;
  decididoEm: string | null;
  comentario: string | null;
}

export interface EventoAprovacao {
  acao: string;
  rotulo: string;
  usuario: string;
  quando: string;
}

export interface FluxoAprovacao {
  workflowId: string;
  status: string;
  etapaAtual: number;
  totalEtapas: number;
  etapas: EtapaAprovacao[];
}

export interface PainelAprovacao {
  fluxos: Record<string, FluxoAprovacao>;
  historicos: Record<string, EventoAprovacao[]>;
}

const ROTULOS_ACAO: Record<string, string> = {
  created: 'Fluxo criado',
  approved: 'Etapa aprovada',
  rejected: 'Etapa rejeitada',
  escalated: 'Escalado',
  delegation: 'Delegado',
  cancelled: 'Fluxo cancelado',
};

export const rotuloDaAcao = (acao: string): string => ROTULOS_ACAO[acao] ?? acao;

export const nomeDaPessoaDoQuadro = (row: PessoaDoQuadro | undefined, fallback = 'Aprovador'): string => {
  const nome = (row?.full_name ?? '').trim() || (row?.display_name ?? '').trim() || (row?.email ?? '').trim();
  return nome || fallback;
};

export const statusDaEtapa = (row: EtapaAprovacaoRow, etapaAtual: number): StatusEtapaAprovacao => {
  const status = (row.status ?? '').trim().toLowerCase();
  if (status === 'rejected' || status === 'rejeitado' || status === 'rejeitada') return 'rejeitada';
  if (status === 'skipped' || status === 'pulado' || status === 'pulada') return 'pulada';
  if (status === 'approved' || status === 'aprovado' || status === 'aprovada' || row.decidido_em) return 'concluida';
  return row.etapa === etapaAtual ? 'atual' : 'pendente';
};

export function montarPainelAprovacao(
  workflows: WorkflowAprovacaoRow[],
  etapas: EtapaAprovacaoRow[],
  historico: HistoricoAprovacaoRow[],
  pessoas: PessoaDoQuadro[] = [],
): PainelAprovacao {
  const nomePorId = new Map<string, string>();
  for (const pessoa of pessoas) {
    const id = (pessoa.user_id ?? '').trim();
    if (!id || nomePorId.has(id)) continue;
    nomePorId.set(id, nomeDaPessoaDoQuadro(pessoa));
  }

  const etapasPorWorkflow = new Map<string, EtapaAprovacaoRow[]>();
  for (const etapa of etapas) {
    const chave = etapa.workflow_id;
    if (!chave) continue;
    const lista = etapasPorWorkflow.get(chave);
    if (lista) lista.push(etapa);
    else etapasPorWorkflow.set(chave, [etapa]);
  }

  const fluxos: Record<string, FluxoAprovacao> = {};
  for (const workflow of workflows) {
    const solicitacaoId = (workflow.solicitacao_id ?? '').trim();
    if (!solicitacaoId || fluxos[solicitacaoId]) continue;
    const etapaAtual = Number(workflow.etapa_atual ?? 1) || 1;
    const doWorkflow = (etapasPorWorkflow.get(workflow.id) ?? []).slice().sort((a, b) => a.etapa - b.etapa);
    fluxos[solicitacaoId] = {
      workflowId: workflow.id,
      status: (workflow.status ?? '').trim() || 'pendente',
      etapaAtual,
      totalEtapas: Number(workflow.total_etapas ?? doWorkflow.length) || doWorkflow.length,
      etapas: doWorkflow.map((etapa) => {
        const responsavelId = (etapa.aprovador_efetivo_id ?? etapa.aprovador_id ?? '').trim();
        return {
          ordem: etapa.etapa,
          status: statusDaEtapa(etapa, etapaAtual),
          responsavel: nomePorId.get(responsavelId) ?? 'Aprovador',
          decididoEm: etapa.decidido_em ?? null,
          comentario: (etapa.comentario ?? '').trim() || null,
        };
      }),
    };
  }

  const historicos: Record<string, EventoAprovacao[]> = {};
  for (const linha of historico) {
    const solicitacaoId = (linha.solicitacao_id ?? '').trim();
    if (!solicitacaoId) continue;
    const evento: EventoAprovacao = {
      acao: linha.acao,
      rotulo: rotuloDaAcao(linha.acao),
      usuario: (linha.usuario_nome ?? '').trim() || 'Sistema',
      quando: linha.created_at,
    };
    const lista = historicos[solicitacaoId];
    if (lista) lista.push(evento);
    else historicos[solicitacaoId] = [evento];
  }
  for (const lista of Object.values(historicos)) {
    lista.sort((a, b) => b.quando.localeCompare(a.quando));
  }

  return { fluxos, historicos };
}
