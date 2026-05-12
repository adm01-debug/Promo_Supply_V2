import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface BuyerData {
  id: string;
  nome: string;
  avatar: string;
  cargo: string;
  departamento: string;
  dataAdmissao: string;
  performance: {
    economiaMes: number;
    economiaAno: number;
    descontoMedio: number;
    melhorPrecoRate: number;
    cotacoesRealizadas: number;
    tempoMedioNegociacao: number;
    taxaSucesso: number;
    fornecedoresAtivos: number;
  };
  historico: Array<{ mes: string; economia: number; cotacoes: number; desconto: number }>;
  categorias: Array<{ nome: string; economia: number; percentual: number }>;
  fornecedores: Array<{ nome: string; economia: number; pedidos: number; desconto: number }>;
  ultimasNegociacoes: Array<{ produto: string; economia: number; percentual: number; data: string }>;
  radar: Array<{ subject: string; value: number; fullMark: number }>;
}

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function getMonthsBack(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

export function useBuyerPerformanceData(periodMonths: number = 6) {
  const { organizationId } = useAuth();
  const startDate = getMonthsBack(periodMonths);
  const startOfMonth = getMonthsBack(1);
  const startOfYear = (() => { const d = new Date(); d.setMonth(0, 1); d.setHours(0, 0, 0, 0); return d.toISOString().split('T')[0]; })();

  // Fetch profiles (buyers)
  const { data: profiles, isLoading: loadingProfiles } = useQuery({
    queryKey: ['buyer-perf-profiles', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, email, department, created_at')
        .eq('current_organization_id', organizationId);
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  // Fetch cotacoes with period filter
  const { data: cotacoes, isLoading: loadingCot } = useQuery({
    queryKey: ['buyer-perf-cotacoes', startDate, organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('cotacoes')
        .select('id, valor_unitario, valor_total, selecionada, desconto_percentual, score_preco, solicitacao_id, fornecedor_id, created_at, status')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // Fetch solicitacoes with period filter
  const { data: solicitacoes, isLoading: loadingSol } = useQuery({
    queryKey: ['buyer-perf-solicitacoes', startDate, organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('solicitacoes')
        .select('id, valor_estimado, valor_aprovado, descricao, status, created_at, solicitante_id, categoria_id')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // Fetch pedidos with period filter
  const { data: pedidos, isLoading: loadingPed } = useQuery({
    queryKey: ['buyer-perf-pedidos', startDate, organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('pedidos')
        .select('id, valor_total, data_emissao, data_previsao, data_entrega, status, comprador_id, fornecedor_id')
        .eq('organization_id', organizationId)
        .gte('data_emissao', startDate);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // Fetch fornecedores for names
  const { data: fornecedores, isLoading: loadingForn } = useQuery({
    queryKey: ['buyer-perf-fornecedores', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('fornecedores')
        .select('id, razao_social, nome_fantasia, status')
        .eq('organization_id', organizationId);
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  // Fetch categorias for names
  const { data: categorias } = useQuery({
    queryKey: ['buyer-perf-categorias', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('categorias')
        .select('id, nome')
        .eq('organization_id', organizationId);
      if (error) throw error;
      return data || [];
    },
    staleTime: 120000,
  });

  const fornecedorMap = useMemo(() => {
    const map = new Map<string, string>();
    (fornecedores || []).forEach(f => map.set(f.id, f.nome_fantasia || f.razao_social));
    return map;
  }, [fornecedores]);

  const categoriaMap = useMemo(() => {
    const map = new Map<string, string>();
    (categorias || []).forEach(c => map.set(c.id, c.nome));
    return map;
  }, [categorias]);

  const buyers = useMemo<BuyerData[]>(() => {
    const profs = profiles || [];
    const cots = cotacoes || [];
    const sols = solicitacoes || [];
    const peds = pedidos || [];

    if (profs.length === 0) return [];

    return profs.map(profile => {
      const userId = profile.user_id;
      const initials = (profile.full_name || profile.email || '?')
        .split(' ')
        .map(w => w[0]?.toUpperCase() || '')
        .slice(0, 2)
        .join('');

      // Solicitacoes by this buyer
      const buyerSols = sols.filter(s => s.solicitante_id === userId);
      const solIds = new Set(buyerSols.map(s => s.id));

      // Cotacoes linked to buyer's solicitacoes
      const buyerCots = cots.filter(c => c.solicitacao_id && solIds.has(c.solicitacao_id));

      // Pedidos by this buyer
      const buyerPeds = peds.filter(p => p.comprador_id === userId);

      // Economy calculations
      const totalEstimado = buyerSols.reduce((s, sol) => s + (Number(sol.valor_estimado) || 0), 0);
      const totalAprovado = buyerSols
        .filter(s => s.valor_aprovado != null)
        .reduce((s, sol) => s + (Number(sol.valor_aprovado) || 0), 0);
      const economiaTotal = totalEstimado > 0 && totalAprovado > 0 ? Math.max(0, totalEstimado - totalAprovado) : 0;

      // Monthly economy
      const now = new Date();
      const thisMonthSols = buyerSols.filter(s => s.created_at >= startOfMonth);
      const thisMonthEstimado = thisMonthSols.reduce((s, sol) => s + (Number(sol.valor_estimado) || 0), 0);
      const thisMonthAprovado = thisMonthSols
        .filter(s => s.valor_aprovado != null)
        .reduce((s, sol) => s + (Number(sol.valor_aprovado) || 0), 0);
      const economiaMes = thisMonthEstimado > 0 && thisMonthAprovado > 0 ? Math.max(0, thisMonthEstimado - thisMonthAprovado) : 0;

      // Year economy
      const yearSols = buyerSols.filter(s => s.created_at >= startOfYear);
      const yearEstimado = yearSols.reduce((s, sol) => s + (Number(sol.valor_estimado) || 0), 0);
      const yearAprovado = yearSols
        .filter(s => s.valor_aprovado != null)
        .reduce((s, sol) => s + (Number(sol.valor_aprovado) || 0), 0);
      const economiaAno = yearEstimado > 0 && yearAprovado > 0 ? Math.max(0, yearEstimado - yearAprovado) : 0;

      // Avg discount
      const cotsComDesconto = buyerCots.filter(c => c.desconto_percentual && Number(c.desconto_percentual) > 0);
      const descontoMedio = cotsComDesconto.length > 0
        ? Math.round(cotsComDesconto.reduce((s, c) => s + (Number(c.desconto_percentual) || 0), 0) / cotsComDesconto.length * 10) / 10
        : 0;

      // Best price rate
      const selecionadas = buyerCots.filter(c => c.selecionada);
      const comMelhorPreco = selecionadas.filter(c => (c.score_preco || 0) >= 80).length;
      const melhorPrecoRate = selecionadas.length > 0 ? Math.round((comMelhorPreco / selecionadas.length) * 100) : 0;

      // Unique fornecedores
      const fornIds = new Set(buyerPeds.map(p => p.fornecedor_id).filter(Boolean));

      // Entregues no prazo
      const entregues = buyerPeds.filter(p => p.status === 'entregue');
      const entreguesNoPrazo = entregues.filter(p =>
        p.data_entrega && p.data_previsao && p.data_entrega <= p.data_previsao
      ).length;
      const taxaSucesso = entregues.length > 0 ? Math.round((entreguesNoPrazo / entregues.length) * 100) : buyerPeds.length > 0 ? 80 : 0;

      // Tempo medio - approx from pedido creation to entrega
      const pedidosComEntrega = buyerPeds.filter(p => p.data_entrega && p.data_emissao);
      const tempoMedio = pedidosComEntrega.length > 0
        ? Math.round(pedidosComEntrega.reduce((s, p) => {
            const diff = (new Date(p.data_entrega!).getTime() - new Date(p.data_emissao).getTime()) / (1000 * 60 * 60 * 24);
            return s + diff;
          }, 0) / pedidosComEntrega.length * 10) / 10
        : 0;

      // Historico mensal (last N months)
      const historico: BuyerData['historico'] = [];
      for (let i = periodMonths - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
        
        const monthSols = buyerSols.filter(s => s.created_at >= monthStart && s.created_at <= monthEnd);
        const monthCots = buyerCots.filter(c => c.created_at >= monthStart && c.created_at <= monthEnd);
        const mEst = monthSols.reduce((s, sol) => s + (Number(sol.valor_estimado) || 0), 0);
        const mApr = monthSols.filter(s => s.valor_aprovado != null).reduce((s, sol) => s + (Number(sol.valor_aprovado) || 0), 0);
        const mEcon = mEst > 0 && mApr > 0 ? Math.max(0, mEst - mApr) : 0;
        const mDescontos = monthCots.filter(c => c.desconto_percentual && Number(c.desconto_percentual) > 0);
        const mDescAvg = mDescontos.length > 0 
          ? Math.round(mDescontos.reduce((s, c) => s + (Number(c.desconto_percentual) || 0), 0) / mDescontos.length * 10) / 10
          : 0;

        historico.push({
          mes: MONTH_LABELS[d.getMonth()],
          economia: mEcon,
          cotacoes: monthCots.length,
          desconto: mDescAvg,
        });
      }

      // Categorias - economia por categoria
      const catMap = new Map<string, number>();
      buyerSols.forEach(s => {
        if (s.categoria_id && s.valor_estimado && s.valor_aprovado) {
          const econ = Math.max(0, Number(s.valor_estimado) - Number(s.valor_aprovado));
          catMap.set(s.categoria_id, (catMap.get(s.categoria_id) || 0) + econ);
        }
      });
      const catTotal = Array.from(catMap.values()).reduce((s, v) => s + v, 0) || 1;
      const categoriasArr = Array.from(catMap.entries())
        .map(([catId, econ]) => ({
          nome: categoriaMap.get(catId) || 'Outros',
          economia: econ,
          percentual: Math.round((econ / catTotal) * 1000) / 10,
        }))
        .sort((a, b) => b.economia - a.economia)
        .slice(0, 5);

      // Fornecedores - economia per fornecedor from pedidos
      const fornMap = new Map<string, { economia: number; pedidos: number; descontos: number[] }>();
      buyerPeds.forEach(p => {
        if (!p.fornecedor_id) return;
        const existing = fornMap.get(p.fornecedor_id) || { economia: 0, pedidos: 0, descontos: [] };
        existing.pedidos++;
        fornMap.set(p.fornecedor_id, existing);
      });
      // Add discount data from cotacoes
      buyerCots.forEach(c => {
        if (c.fornecedor_id && c.desconto_percentual) {
          const existing = fornMap.get(c.fornecedor_id) || { economia: 0, pedidos: 0, descontos: [] };
          existing.descontos.push(Number(c.desconto_percentual) || 0);
          fornMap.set(c.fornecedor_id, existing);
        }
      });
      const fornecedoresArr = Array.from(fornMap.entries())
        .map(([fId, data]) => ({
          nome: fornecedorMap.get(fId) || `Fornecedor ${fId.slice(0, 6)}`,
          economia: data.economia,
          pedidos: data.pedidos,
          desconto: data.descontos.length > 0
            ? Math.round(data.descontos.reduce((s, d) => s + d, 0) / data.descontos.length * 10) / 10
            : 0,
        }))
        .sort((a, b) => b.pedidos - a.pedidos)
        .slice(0, 5);

      // Ultimas negociacoes
      const ultimasNeg = buyerSols
        .filter(s => s.valor_estimado && s.valor_aprovado && Number(s.valor_estimado) > Number(s.valor_aprovado))
        .map(s => ({
          produto: s.descricao || `Solicitação`,
          economia: Number(s.valor_estimado) - Number(s.valor_aprovado),
          percentual: Math.round(((Number(s.valor_estimado) - Number(s.valor_aprovado)) / Number(s.valor_estimado)) * 100),
          data: s.created_at.split('T')[0],
        }))
        .sort((a, b) => b.economia - a.economia)
        .slice(0, 5);

      // Radar - computed from real metrics
      const econScore = economiaMes > 0 ? Math.min(100, Math.round((economiaMes / Math.max(1, totalEstimado / periodMonths)) * 100)) : 0;
      const velScore = tempoMedio > 0 ? Math.min(100, Math.round(100 - (tempoMedio / 30 * 100))) : 50;
      const qualScore = taxaSucesso;
      const volScore = Math.min(100, Math.round((buyerCots.length / Math.max(1, periodMonths)) * 10));
      const divScore = Math.min(100, Math.round(fornIds.size * 15));

      const radar = [
        { subject: 'Economia', value: Math.max(0, econScore), fullMark: 100 },
        { subject: 'Velocidade', value: Math.max(0, velScore), fullMark: 100 },
        { subject: 'Qualidade', value: Math.max(0, qualScore), fullMark: 100 },
        { subject: 'Volume', value: Math.max(0, volScore), fullMark: 100 },
        { subject: 'Diversidade', value: Math.max(0, divScore), fullMark: 100 },
      ];

      return {
        id: userId,
        nome: profile.full_name || profile.email || 'Usuário',
        avatar: initials,
        cargo: profile.department || 'Comprador',
        departamento: 'Compras',
        dataAdmissao: profile.created_at,
        performance: {
          economiaMes,
          economiaAno,
          descontoMedio,
          melhorPrecoRate,
          cotacoesRealizadas: buyerCots.length,
          tempoMedioNegociacao: tempoMedio,
          taxaSucesso,
          fornecedoresAtivos: fornIds.size,
        },
        historico,
        categorias: categoriasArr,
        fornecedores: fornecedoresArr,
        ultimasNegociacoes: ultimasNeg,
        radar,
      };
    });
  }, [profiles, cotacoes, solicitacoes, pedidos, fornecedorMap, categoriaMap, periodMonths, startOfMonth, startOfYear]);

  const loading = loadingProfiles || loadingCot || loadingSol || loadingPed || loadingForn;

  return { buyers, loading };
}
