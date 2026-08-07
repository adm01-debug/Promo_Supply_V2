import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth";

export interface SupplierScore {
  id: string;
  name: string;
  category: string;
  overallScore: number;
  previousScore: number;
  metrics: {
    slaCompliance: number;
    deliveryTime: number;
    quality: number;
    pricing: number;
    communication: number;
    flexibility: number;
  };
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  ordersCompleted: number;
  avgDeliveryDays: number;
  defectRate: number;
  lastOrderDate: string;
  trend: 'up' | 'down' | 'stable';
  certifications: string[];
}

export function useSupplierScorecardData(periodDays: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['supplier-scorecard', periodDays],
    queryFn: async (): Promise<SupplierScore[]> => {
      const cutoff = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

      const [fornRes, pedRes, qualRes, devRes] = await Promise.all([
        supabase.from('fornecedores').select('id, razao_social, segmento, avaliacao, prazo_medio_entrega, status'),
        supabase.from('pedidos').select('id, fornecedor_id, status, valor_total, data_entrega, data_previsao, created_at').gte('created_at', cutoff),
        supabase.from('supplier_qualification_scores').select('fornecedor_id, overall_score, compliance_score, document_score, expiry_score, qualification_status'),
        supabase.from('devolucoes').select('id, fornecedor_id, status').gte('created_at', cutoff),
      ]);

      const fornecedores = fornRes.data || [];
      const pedidos = pedRes.data || [];
      const qualScores = qualRes.data || [];
      const devolucoes = devRes.data || [];

      return fornecedores
        .filter(f => f.status === 'ativo')
        .map(f => {
          const fPedidos = pedidos.filter(p => p.fornecedor_id === f.id);
          const fQual = qualScores.find(q => q.fornecedor_id === f.id);
          const fDevs = devolucoes.filter(d => d.fornecedor_id === f.id);

          const ordersCompleted = fPedidos.filter(p => p.status === 'entregue').length;
          const totalOrders = fPedidos.length;

          const deliveredOrders = fPedidos.filter(p => p.data_entrega && p.data_previsao);
          const onTime = deliveredOrders.filter(p => {
            const real = new Date(p.data_entrega!);
            const prev = new Date(p.data_previsao!);
            return real <= prev;
          }).length;

          const slaCompliance = deliveredOrders.length > 0 ? Math.round((onTime / deliveredOrders.length) * 100) : 80;

          const avgDays = deliveredOrders.length > 0
            ? deliveredOrders.reduce((sum, p) => {
                const diff = (new Date(p.data_entrega!).getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24);
                return sum + Math.max(0, diff);
              }, 0) / deliveredOrders.length
            : f.prazo_medio_entrega || 10;

          const quality = fQual ? Math.round(fQual.overall_score) : Math.round((f.avaliacao || 3) * 20);
          const defectRate = totalOrders > 0 ? Math.round((fDevs.length / totalOrders) * 100 * 10) / 10 : 0;
          const communication = fQual ? Math.round(fQual.compliance_score) : 70;
          const flexibility = fQual ? Math.round(fQual.document_score) : 70;
          const deliveryTime = Math.max(0, Math.min(100, Math.round(100 - (avgDays - 3) * 3)));
          const pricing = fQual ? Math.round(fQual.expiry_score) : 75;

          const overallScore = Math.round(
            slaCompliance * 0.25 +
            deliveryTime * 0.20 +
            quality * 0.25 +
            pricing * 0.15 +
            communication * 0.08 +
            flexibility * 0.07
          );

          const previousScore = Math.round((f.avaliacao || 3) * 20);

          let riskLevel: SupplierScore['riskLevel'] = 'low';
          if (overallScore < 50) riskLevel = 'critical';
          else if (overallScore < 65) riskLevel = 'high';
          else if (overallScore < 80) riskLevel = 'medium';

          const riskFactors: string[] = [];
          if (slaCompliance < 70) riskFactors.push('SLA abaixo do esperado');
          if (avgDays > 15) riskFactors.push('Lead time elevado');
          if (defectRate > 3) riskFactors.push('Taxa de defeito alta');
          if (totalOrders === 0) riskFactors.push('Sem pedidos recentes');
          if (fQual?.qualification_status === 'blocked') riskFactors.push('Fornecedor bloqueado');

          const trend: SupplierScore['trend'] = overallScore > previousScore + 2
            ? 'up'
            : overallScore < previousScore - 2
              ? 'down'
              : 'stable';

          const lastOrder = [...fPedidos].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

          return {
            id: f.id,
            name: f.razao_social,
            category: f.segmento || 'Geral',
            overallScore,
            previousScore,
            metrics: { slaCompliance, deliveryTime, quality, pricing, communication, flexibility },
            riskLevel,
            riskFactors,
            ordersCompleted,
            avgDeliveryDays: Math.round(avgDays * 10) / 10,
            defectRate,
            lastOrderDate: lastOrder?.created_at || '',
            trend,
            certifications: [],
          };
        })
        .filter(s => s.ordersCompleted > 0 || s.overallScore > 0)
        .sort((a, b) => b.overallScore - a.overallScore);
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

export const getScoreColor = (score: number) => {
  if (score >= 85) return "text-success";
  if (score >= 70) return "text-warning";
  if (score >= 50) return "text-warning";
  return "text-destructive";
};

export const getScoreBg = (score: number) => {
  if (score >= 85) return "bg-success";
  if (score >= 70) return "bg-warning";
  if (score >= 50) return "bg-warning";
  return "bg-destructive";
};

export const getRiskBadge = (risk: SupplierScore['riskLevel']) => {
  const config = {
    low: { label: "Baixo", className: "bg-success/10 text-success border-emerald-500/20" },
    medium: { label: "Médio", className: "bg-warning/10 text-warning border-amber-500/20" },
    high: { label: "Alto", className: "bg-warning/10 text-warning border-orange-500/20" },
    critical: { label: "Crítico", className: "bg-destructive/10 text-destructive border-red-500/20" },
  };
  return config[risk];
};
