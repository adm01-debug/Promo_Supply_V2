import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchAllRows } from '@/lib/paginatedFetch';

export interface DashboardKPIs {
  aguardandoCotacao: number;
  aguardandoPagamento: number;
  emTransito: number;
  finalizados: number;
  volumeMes: number;
  atrasados: number;
  taxaEntrega: number;
  totalSolicitacoes: number;
  totalFornecedores: number;
  totalPedidos: number;
  pendingApprovals: number;
  economiaGerada: number;
  economiaPercentual: number;
}

export interface PipelineData {
  solicitacao: number;
  cotacao: number;
  pedido: number;
  pagamento: number;
  transito: number;
  entregue: number;
}

const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

export function useDashboardKPIs() {
  const { data: solicitacoes, isLoading: loadingSol } = useQuery({
    queryKey: ['dashboard-solicitacoes'],
    queryFn: () => fetchAllRows<{ id: string; status: string; valor_estimado: number | null; valor_aprovado: number | null; created_at: string; data_necessidade: string | null }>('solicitacoes', 'id, status, valor_estimado, valor_aprovado, created_at, data_necessidade'),
    staleTime: 30000,
  });

  const { data: pedidos, isLoading: loadingPed } = useQuery({
    queryKey: ['dashboard-pedidos'],
    queryFn: () => fetchAllRows<{ id: string; status: string; valor_total: number; data_emissao: string; data_previsao: string | null; data_entrega: string | null }>('pedidos', 'id, status, valor_total, data_emissao, data_previsao, data_entrega'),
    staleTime: 30000,
  });

  const { data: pagamentos, isLoading: loadingPag } = useQuery({
    queryKey: ['dashboard-pagamentos'],
    queryFn: () => fetchAllRows<{ id: string; status: string; valor: number; valor_pago: number | null; data_vencimento: string }>('pagamentos', 'id, status, valor, valor_pago, data_vencimento'),
    staleTime: 30000,
  });

  const { data: cotacoes, isLoading: loadingCot } = useQuery({
    queryKey: ['dashboard-cotacoes'],
    queryFn: () => fetchAllRows<{ id: string; status: string; valor_total: number; selecionada: boolean | null }>('cotacoes', 'id, status, valor_total, selecionada'),
    staleTime: 30000,
  });

  const { data: fornecedores, isLoading: loadingForn } = useQuery({
    queryKey: ['dashboard-fornecedores'],
    queryFn: () => fetchAllRows<{ id: string; status: string }>('fornecedores', 'id, status'),
    staleTime: 60000,
  });

  const { data: workflows, isLoading: loadingWf } = useQuery({
    queryKey: ['dashboard-workflows'],
    queryFn: () => fetchAllRows<{ id: string; status: string }>('approval_workflows', 'id, status', {
      filters: [{ column: 'status', operator: 'eq', value: 'pending' }],
    }),
    staleTime: 30000,
  });

  const kpis = useMemo<DashboardKPIs>(() => {
    const sol = solicitacoes || [];
    const ped = pedidos || [];
    const pag = pagamentos || [];
    const cot = cotacoes || [];
    const forn = fornecedores || [];
    const wf = workflows || [];

    const monthStart = startOfMonth();

    const aguardandoCotacao = sol.filter(s => s.status === 'pendente' || s.status === 'em_cotacao').length;
    const aguardandoPagamento = pag.filter(p => p.status === 'pendente').length;
    const emTransito = ped.filter(p => p.status === 'enviado').length;
    const finalizados = ped.filter(p => p.status === 'entregue').length;

    const volumeMes = ped
      .filter(p => p.data_emissao >= monthStart.split('T')[0])
      .reduce((sum, p) => sum + (Number(p.valor_total) || 0), 0);

    const now = new Date().toISOString().split('T')[0];
    const atrasados = ped.filter(p => 
      p.data_previsao && p.data_previsao < now && 
      p.status !== 'entregue' && p.status !== 'cancelado'
    ).length;

    const entregues = ped.filter(p => p.status === 'entregue');
    const entreguesNoPrazo = entregues.filter(p => 
      p.data_entrega && p.data_previsao && p.data_entrega <= p.data_previsao
    ).length;
    const taxaEntrega = entregues.length > 0 
      ? Math.round((entreguesNoPrazo / entregues.length) * 100) 
      : 100;

    const totalEstimado = sol.reduce((sum, s) => sum + (Number(s.valor_estimado) || 0), 0);
    const totalAprovado = sol.reduce((sum, s) => sum + (Number(s.valor_aprovado) || 0), 0);
    const economiaGerada = totalEstimado > 0 ? totalEstimado - totalAprovado : 0;
    const economiaPercentual = totalEstimado > 0 
      ? Math.round((economiaGerada / totalEstimado) * 1000) / 10 
      : 0;

    return {
      aguardandoCotacao,
      aguardandoPagamento,
      emTransito,
      finalizados,
      volumeMes,
      atrasados,
      taxaEntrega,
      totalSolicitacoes: sol.length,
      totalFornecedores: forn.filter(f => f.status === 'ativo').length,
      totalPedidos: ped.length,
      pendingApprovals: wf.length,
      economiaGerada,
      economiaPercentual,
    };
  }, [solicitacoes, pedidos, pagamentos, cotacoes, fornecedores, workflows]);

  const pipeline = useMemo<PipelineData>(() => {
    const sol = solicitacoes || [];
    const ped = pedidos || [];
    const pag = pagamentos || [];
    return {
      solicitacao: sol.filter(s => s.status === 'pendente' || s.status === 'em_cotacao').length,
      cotacao: sol.filter(s => s.status === 'em_cotacao' || s.status === 'aprovada').length,
      pedido: ped.filter(p => p.status === 'pendente' || p.status === 'aprovado').length,
      pagamento: pag.filter(p => p.status === 'pendente' || p.status === 'aprovado' || p.status === 'agendado').length,
      transito: ped.filter(p => p.status === 'enviado').length,
      entregue: ped.filter(p => p.status === 'entregue').length,
    };
  }, [solicitacoes, pedidos, pagamentos]);

  const urgentItems = useMemo(() => {
    const sol = solicitacoes || [];
    const now = new Date();
    return sol
      .filter(s => {
        if (s.status === 'concluida' || s.status === 'cancelada') return false;
        if (!s.data_necessidade) return false;
        const diff = (new Date(s.data_necessidade).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return diff <= 3;
      })
      .slice(0, 5);
  }, [solicitacoes]);

  const loading = loadingSol || loadingPed || loadingPag || loadingCot || loadingForn || loadingWf;

  return { kpis, pipeline, urgentItems, loading };
}
