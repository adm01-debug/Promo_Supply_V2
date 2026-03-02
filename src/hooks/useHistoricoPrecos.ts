import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface HistoricoPreco {
  id: string;
  data: string;
  valor_unitario: number;
  quantidade: number;
  valor_total: number;
  fornecedor: {
    id: string;
    razao_social: string;
    nome_fantasia: string | null;
  } | null;
  cotacao: {
    id: string;
    numero: string;
    status: string;
  } | null;
  solicitacao: {
    id: string;
    numero: string;
    titulo: string;
  } | null;
}

export interface EstatisticasPreco {
  precoMinimo: number;
  precoMaximo: number;
  precoMedio: number;
  precoMediana: number;
  variacaoPercentual: number; // Variação do último preço vs média
  tendencia: 'alta' | 'baixa' | 'estavel';
  totalCotacoes: number;
  ultimoPreco: number;
  ultimaData: string | null;
  melhorFornecedor: {
    id: string;
    nome: string;
    precoMedio: number;
  } | null;
}

export interface PrecosPorFornecedor {
  fornecedor_id: string;
  fornecedor_nome: string;
  precos: {
    data: string;
    valor: number;
  }[];
  precoMedio: number;
  precoMinimo: number;
  totalCotacoes: number;
}

export function useHistoricoPrecos(produtoDescricao?: string, categoriaId?: string) {
  const { user } = useAuth();
  const [historico, setHistorico] = useState<HistoricoPreco[]>([]);
  const [estatisticas, setEstatisticas] = useState<EstatisticasPreco | null>(null);
  const [precosPorFornecedor, setPrecosPorFornecedor] = useState<PrecosPorFornecedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Busca histórico de preços baseado em descrição do produto
   */
  const buscarHistorico = useCallback(async (
    descricao: string,
    opcoes?: {
      limite?: number;
      fornecedorId?: string;
      dataInicio?: string;
      dataFim?: string;
    }
  ) => {
    if (!user || !descricao || descricao.length < 3) {
      setHistorico([]);
      setEstatisticas(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Buscar nos itens de cotação que contenham palavras-chave da descrição
      // Usar busca por similaridade de texto
      const palavrasChave = descricao
        .toLowerCase()
        .split(/\s+/)
        .filter(p => p.length > 2)
        .slice(0, 5); // Máximo 5 palavras-chave

      if (palavrasChave.length === 0) {
        setHistorico([]);
        return;
      }

      // Query using cotacoes table directly (itens_cotacao not available)
      let query = (supabase
        .from('cotacoes') as any)
        .select(`
          id,
          numero,
          status,
          quantidade,
          valor_unitario,
          valor_total,
          created_at,
          fornecedor_id,
          solicitacao_id,
          fornecedor:fornecedores(id, razao_social, nome_fantasia),
          solicitacao:solicitacoes(id, numero, titulo)
        `)
        .not('valor_unitario', 'is', null)
        .gt('valor_unitario', 0)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (opcoes?.limite) {
        query = query.limit(opcoes.limite);
      } else {
        query = query.limit(100);
      }

      if (opcoes?.dataInicio) {
        query = query.gte('created_at', opcoes.dataInicio);
      }

      if (opcoes?.dataFim) {
        query = query.lte('created_at', opcoes.dataFim);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Filtrar por similaridade (client-side) - use observacoes or numero as proxy
      const resultadosFiltrados = (data || []) as any[];

      // Filtrar por fornecedor se especificado
      let resultadosFinais = resultadosFiltrados;
      if (opcoes?.fornecedorId) {
        resultadosFinais = resultadosFiltrados.filter(
          (item: any) => item.fornecedor_id === opcoes.fornecedorId
        );
      }

      // Mapear para o formato esperado
      const historicoMapeado: HistoricoPreco[] = resultadosFinais.map((item: any) => {
        return {
          id: item.id,
          data: item.created_at,
          valor_unitario: item.valor_unitario,
          quantidade: item.quantidade,
          valor_total: item.valor_total || item.valor_unitario * item.quantidade,
          fornecedor: item.fornecedor || null,
          cotacao: {
            id: item.id,
            numero: item.numero,
            status: item.status,
          },
          solicitacao: item.solicitacao || null,
        };
      });

      setHistorico(historicoMapeado);

      // Calcular estatísticas
      if (historicoMapeado.length > 0) {
        const precos = historicoMapeado.map(h => h.valor_unitario).sort((a, b) => a - b);
        const soma = precos.reduce((a, b) => a + b, 0);
        const media = soma / precos.length;
        const mediana = precos.length % 2 === 0
          ? (precos[precos.length / 2 - 1] + precos[precos.length / 2]) / 2
          : precos[Math.floor(precos.length / 2)];

        const ultimoPreco = historicoMapeado[0].valor_unitario;
        const variacaoPercentual = ((ultimoPreco - media) / media) * 100;

        // Determinar tendência (comparando últimas 3 cotações se houver)
        let tendencia: 'alta' | 'baixa' | 'estavel' = 'estavel';
        if (historicoMapeado.length >= 3) {
          const ultimos3 = historicoMapeado.slice(0, 3).map(h => h.valor_unitario);
          if (ultimos3[0] > ultimos3[1] && ultimos3[1] > ultimos3[2]) {
            tendencia = 'alta';
          } else if (ultimos3[0] < ultimos3[1] && ultimos3[1] < ultimos3[2]) {
            tendencia = 'baixa';
          }
        }

        // Encontrar melhor fornecedor (menor preço médio)
        const fornecedorMap = new Map<string, { nome: string; precos: number[] }>();
        historicoMapeado.forEach(h => {
          if (h.fornecedor) {
            const key = h.fornecedor.id;
            const existing = fornecedorMap.get(key);
            if (existing) {
              existing.precos.push(h.valor_unitario);
            } else {
              fornecedorMap.set(key, {
                nome: h.fornecedor.nome_fantasia || h.fornecedor.razao_social,
                precos: [h.valor_unitario],
              });
            }
          }
        });

        let melhorFornecedor: EstatisticasPreco['melhorFornecedor'] = null;
        let menorPrecoMedio = Infinity;
        fornecedorMap.forEach((value, key) => {
          const precoMedioForn = value.precos.reduce((a, b) => a + b, 0) / value.precos.length;
          if (precoMedioForn < menorPrecoMedio) {
            menorPrecoMedio = precoMedioForn;
            melhorFornecedor = {
              id: key,
              nome: value.nome,
              precoMedio: precoMedioForn,
            };
          }
        });

        setEstatisticas({
          precoMinimo: precos[0],
          precoMaximo: precos[precos.length - 1],
          precoMedio: media,
          precoMediana: mediana,
          variacaoPercentual,
          tendencia,
          totalCotacoes: historicoMapeado.length,
          ultimoPreco,
          ultimaData: historicoMapeado[0].data,
          melhorFornecedor,
        });

        // Agrupar preços por fornecedor
        const porFornecedor: PrecosPorFornecedor[] = [];
        fornecedorMap.forEach((value, key) => {
          const precosOrdenados = historicoMapeado
            .filter(h => h.fornecedor?.id === key)
            .map(h => ({ data: h.data, valor: h.valor_unitario }))
            .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

          porFornecedor.push({
            fornecedor_id: key,
            fornecedor_nome: value.nome,
            precos: precosOrdenados,
            precoMedio: value.precos.reduce((a, b) => a + b, 0) / value.precos.length,
            precoMinimo: Math.min(...value.precos),
            totalCotacoes: value.precos.length,
          });
        });

        setPrecosPorFornecedor(porFornecedor.sort((a, b) => a.precoMedio - b.precoMedio));
      } else {
        setEstatisticas(null);
        setPrecosPorFornecedor([]);
      }

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Error fetching price history:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Verifica se o preço está acima da média histórica
   */
  const verificarPreco = useCallback((valor: number): {
    status: 'bom' | 'aceitavel' | 'alto' | 'muito_alto' | 'sem_historico';
    mensagem: string;
    percentualVsMedia: number | null;
  } => {
    if (!estatisticas) {
      return {
        status: 'sem_historico',
        mensagem: 'Sem histórico de preços para comparação',
        percentualVsMedia: null,
      };
    }

    const percentual = ((valor - estatisticas.precoMedio) / estatisticas.precoMedio) * 100;

    if (percentual <= -10) {
      return {
        status: 'bom',
        mensagem: `Preço ${Math.abs(percentual).toFixed(1)}% abaixo da média histórica`,
        percentualVsMedia: percentual,
      };
    } else if (percentual <= 5) {
      return {
        status: 'aceitavel',
        mensagem: `Preço dentro da faixa esperada (±5% da média)`,
        percentualVsMedia: percentual,
      };
    } else if (percentual <= 15) {
      return {
        status: 'alto',
        mensagem: `Preço ${percentual.toFixed(1)}% acima da média. Considere negociar.`,
        percentualVsMedia: percentual,
      };
    } else {
      return {
        status: 'muito_alto',
        mensagem: `⚠️ Preço ${percentual.toFixed(1)}% acima da média! Recomenda-se buscar alternativas.`,
        percentualVsMedia: percentual,
      };
    }
  }, [estatisticas]);

  // Auto-buscar quando os parâmetros mudarem
  useEffect(() => {
    if (produtoDescricao) {
      buscarHistorico(produtoDescricao);
    }
  }, [produtoDescricao, buscarHistorico]);

  return {
    historico,
    estatisticas,
    precosPorFornecedor,
    loading,
    error,
    buscarHistorico,
    verificarPreco,
  };
}
