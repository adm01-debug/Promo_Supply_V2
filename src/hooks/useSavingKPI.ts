import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SavingData {
  periodo: string;
  valorEstimado: number;
  valorAprovado: number;
  savingAbsoluto: number;
  savingPercentual: number;
  quantidadeSolicitacoes: number;
}

export interface SavingKPIs {
  // Saving do período atual
  savingAtual: SavingData;
  // Saving do período anterior (para comparação)
  savingAnterior: SavingData;
  // Variação percentual
  variacao: number;
  // Histórico mensal (últimos 12 meses)
  historico: SavingData[];
  // Top 10 maiores savings
  topSavings: {
    id: string;
    numero: string;
    titulo: string;
    valorEstimado: number;
    valorAprovado: number;
    saving: number;
    savingPercentual: number;
  }[];
  // Saving por categoria
  porCategoria: {
    categoria: string;
    valorEstimado: number;
    valorAprovado: number;
    saving: number;
    savingPercentual: number;
  }[];
}

export interface SavingFilters {
  periodoInicio?: string;
  periodoFim?: string;
  categoriaId?: string;
  compradorId?: string;
}

const calcularSaving = (estimado: number, aprovado: number) => {
  const absoluto = estimado - aprovado;
  const percentual = estimado > 0 ? (absoluto / estimado) * 100 : 0;
  return { absoluto, percentual };
};

export function useSavingKPI(filters?: SavingFilters) {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<SavingKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSavingKPIs = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Definir períodos
      const hoje = new Date();
      const inicioMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);

      // Query base para solicitações concluídas com valores
      let query = supabase
        .from('solicitacoes')
        .select(`
          id,
          numero,
          titulo,
          valor_estimado,
          valor_aprovado,
          created_at,
          categoria_id,
          solicitante_id,
          categoria:categorias(nome)
        `)
        .not('valor_estimado', 'is', null)
        .not('valor_aprovado', 'is', null)
        .gt('valor_estimado', 0)
        .gt('valor_aprovado', 0);

      // Aplicar filtros
      if (filters?.categoriaId) {
        query = query.eq('categoria_id', filters.categoriaId);
      }
      if (filters?.compradorId) {
        query = query.eq('solicitante_id', filters.compradorId);
      }

      const { data: todasSolicitacoes, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (!todasSolicitacoes || todasSolicitacoes.length === 0) {
        setKpis({
          savingAtual: {
            periodo: 'Mês Atual',
            valorEstimado: 0,
            valorAprovado: 0,
            savingAbsoluto: 0,
            savingPercentual: 0,
            quantidadeSolicitacoes: 0,
          },
          savingAnterior: {
            periodo: 'Mês Anterior',
            valorEstimado: 0,
            valorAprovado: 0,
            savingAbsoluto: 0,
            savingPercentual: 0,
            quantidadeSolicitacoes: 0,
          },
          variacao: 0,
          historico: [],
          topSavings: [],
          porCategoria: [],
        });
        return;
      }

      // Calcular saving do mês atual
      const solicitacoesMesAtual = todasSolicitacoes.filter(s => {
        const data = new Date(s.created_at);
        return data >= inicioMesAtual;
      });

      const totalEstimadoAtual = solicitacoesMesAtual.reduce((sum, s) => sum + (s.valor_estimado || 0), 0);
      const totalAprovadoAtual = solicitacoesMesAtual.reduce((sum, s) => sum + (s.valor_aprovado || 0), 0);
      const savingAtualCalc = calcularSaving(totalEstimadoAtual, totalAprovadoAtual);

      // Calcular saving do mês anterior
      const solicitacoesMesAnterior = todasSolicitacoes.filter(s => {
        const data = new Date(s.created_at);
        return data >= inicioMesAnterior && data <= fimMesAnterior;
      });

      const totalEstimadoAnterior = solicitacoesMesAnterior.reduce((sum, s) => sum + (s.valor_estimado || 0), 0);
      const totalAprovadoAnterior = solicitacoesMesAnterior.reduce((sum, s) => sum + (s.valor_aprovado || 0), 0);
      const savingAnteriorCalc = calcularSaving(totalEstimadoAnterior, totalAprovadoAnterior);

      // Calcular variação
      const variacao = savingAnteriorCalc.percentual > 0
        ? ((savingAtualCalc.percentual - savingAnteriorCalc.percentual) / savingAnteriorCalc.percentual) * 100
        : savingAtualCalc.percentual > 0 ? 100 : 0;

      // Calcular histórico mensal (últimos 12 meses)
      const historico: SavingData[] = [];
      for (let i = 11; i >= 0; i--) {
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() - i + 1, 0);
        
        const solicitacoesMes = todasSolicitacoes.filter(s => {
          const data = new Date(s.created_at);
          return data >= inicioMes && data <= fimMes;
        });

        const estimado = solicitacoesMes.reduce((sum, s) => sum + (s.valor_estimado || 0), 0);
        const aprovado = solicitacoesMes.reduce((sum, s) => sum + (s.valor_aprovado || 0), 0);
        const saving = calcularSaving(estimado, aprovado);

        historico.push({
          periodo: inicioMes.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          valorEstimado: estimado,
          valorAprovado: aprovado,
          savingAbsoluto: saving.absoluto,
          savingPercentual: saving.percentual,
          quantidadeSolicitacoes: solicitacoesMes.length,
        });
      }

      // Top 10 maiores savings
      const topSavings = todasSolicitacoes
        .map(s => ({
          id: s.id,
          numero: s.numero,
          titulo: s.titulo,
          valorEstimado: s.valor_estimado || 0,
          valorAprovado: s.valor_aprovado || 0,
          saving: (s.valor_estimado || 0) - (s.valor_aprovado || 0),
          savingPercentual: s.valor_estimado && s.valor_estimado > 0
            ? (((s.valor_estimado || 0) - (s.valor_aprovado || 0)) / s.valor_estimado) * 100
            : 0,
        }))
        .filter(s => s.saving > 0)
        .sort((a, b) => b.saving - a.saving)
        .slice(0, 10);

      // Saving por categoria
      const categoriaMap = new Map<string, { estimado: number; aprovado: number }>();
      todasSolicitacoes.forEach(s => {
        const catNome = (s.categoria as { nome: string } | null)?.nome || 'Sem categoria';
        const atual = categoriaMap.get(catNome) || { estimado: 0, aprovado: 0 };
        categoriaMap.set(catNome, {
          estimado: atual.estimado + (s.valor_estimado || 0),
          aprovado: atual.aprovado + (s.valor_aprovado || 0),
        });
      });

      const porCategoria = Array.from(categoriaMap.entries())
        .map(([categoria, valores]) => {
          const saving = calcularSaving(valores.estimado, valores.aprovado);
          return {
            categoria,
            valorEstimado: valores.estimado,
            valorAprovado: valores.aprovado,
            saving: saving.absoluto,
            savingPercentual: saving.percentual,
          };
        })
        .sort((a, b) => b.saving - a.saving);

      setKpis({
        savingAtual: {
          periodo: 'Mês Atual',
          valorEstimado: totalEstimadoAtual,
          valorAprovado: totalAprovadoAtual,
          savingAbsoluto: savingAtualCalc.absoluto,
          savingPercentual: savingAtualCalc.percentual,
          quantidadeSolicitacoes: solicitacoesMesAtual.length,
        },
        savingAnterior: {
          periodo: 'Mês Anterior',
          valorEstimado: totalEstimadoAnterior,
          valorAprovado: totalAprovadoAnterior,
          savingAbsoluto: savingAnteriorCalc.absoluto,
          savingPercentual: savingAnteriorCalc.percentual,
          quantidadeSolicitacoes: solicitacoesMesAnterior.length,
        },
        variacao,
        historico,
        topSavings,
        porCategoria,
      });

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Error fetching saving KPIs:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, filters?.categoriaId, filters?.compradorId]);

  useEffect(() => {
    fetchSavingKPIs();
  }, [fetchSavingKPIs]);

  return {
    kpis,
    loading,
    error,
    refetch: fetchSavingKPIs,
  };
}
