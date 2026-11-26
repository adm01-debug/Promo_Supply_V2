import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  montarPainelAprovacao,
  type EtapaAprovacaoRow,
  type HistoricoAprovacaoRow,
  type PainelAprovacao,
  type PessoaDoQuadro,
  type WorkflowAprovacaoRow,
} from '../fluxoAprovacao';

const VAZIO: PainelAprovacao = { fluxos: {}, historicos: {} };

/**
 * Fluxo de aprovacao real das solicitacoes visiveis na lista: uma consulta para
 * os workflows, uma para as etapas, uma para o historico e uma para o nome dos
 * aprovadores. O card antes desenhava 3 etapas ficticias iguais para todo
 * mundo; agora o popover mostra as etapas que existem em `approval_steps` ou o
 * estado vazio.
 */
export function useFluxosAprovacao(solicitacaoIds: string[] | null) {
  const ids = [...new Set((solicitacaoIds ?? []).filter(Boolean))].sort();
  const chave = ids.join(',');

  const { data, isLoading, error } = useQuery({
    queryKey: ['fluxos-aprovacao', chave],
    enabled: ids.length > 0,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<PainelAprovacao> => {
      const { data: workflows, error: erroWorkflows } = await supabase
        .from('approval_workflows')
        .select('id, solicitacao_id, etapa_atual, total_etapas, status')
        .in('solicitacao_id', ids)
        .limit(500);
      if (erroWorkflows) throw erroWorkflows;

      const workflowIds = (workflows ?? []).map((w) => w.id);
      let etapas: EtapaAprovacaoRow[] = [];
      if (workflowIds.length > 0) {
        const { data: linhas, error: erroEtapas } = await supabase
          .from('approval_steps')
          .select('workflow_id, etapa, aprovador_id, aprovador_efetivo_id, status, comentario, decidido_em')
          .in('workflow_id', workflowIds)
          .limit(1000);
        if (erroEtapas) throw erroEtapas;
        etapas = linhas ?? [];
      }

      const { data: historico, error: erroHistorico } = await supabase
        .from('approval_history')
        .select('solicitacao_id, acao, usuario_nome, created_at')
        .in('solicitacao_id', ids)
        .order('created_at', { ascending: false })
        .limit(300);
      if (erroHistorico) throw erroHistorico;

      const aprovadorIds = [
        ...new Set(etapas.map((e) => (e.aprovador_efetivo_id ?? e.aprovador_id ?? '').trim()).filter(Boolean)),
      ];
      let pessoas: PessoaDoQuadro[] = [];
      if (aprovadorIds.length > 0) {
        const { data: perfis } = await supabase
          .from('profiles')
          .select('user_id, full_name, display_name, email')
          .in('user_id', aprovadorIds)
          .limit(300);
        pessoas = perfis ?? [];
      }

      return montarPainelAprovacao(
        (workflows ?? []) as WorkflowAprovacaoRow[],
        etapas,
        (historico ?? []) as HistoricoAprovacaoRow[],
        pessoas,
      );
    },
  });

  return {
    fluxos: data?.fluxos ?? VAZIO.fluxos,
    historicos: data?.historicos ?? VAZIO.historicos,
    loading: isLoading,
    erro: error as Error | null,
  };
}
