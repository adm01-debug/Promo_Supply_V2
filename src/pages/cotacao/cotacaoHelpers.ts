import { nullishStr, nullishNum, nullishBool } from "@/lib/dbMapping";
import { supabase } from "@/integrations/supabase/client";

export interface CotacaoAPI {
  id: string;
  fornecedor: string;
  fornecedor_id?: string;
  status: 'encontrado' | 'nao_encontrado' | 'buscando';
  valorUnitario: number;
  quantidadeDisponivel: number;
  prazoEntrega: number;
  frete: number;
  freteInfo: string;
  condicaoPagamento: string;
  total: number;
  alerta?: string;
  selecionada?: boolean;
  score_preco?: number;
  score_prazo?: number;
  score_qualidade?: number;
  score_total?: number;
}

export interface LegacyFornecedor {
  id: string;
  nome_fantasia: string;
  razao_social: string;
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  tipo: 'IMPORTADORA' | 'DISTRIBUIDORA' | 'FABRICANTE';
  ramos: string[];
  vendeProduto: 'AMBOS';
  email: string;
  telefone: string;
  whatsapp: string;
  apiIntegrada: boolean;
  rating: number;
  totalMes: number;
  ultimaCompra: string;
}

// DB rows here are `any` (Supabase joined queries don't carry generated types).
// We still funnel every nullable column through `nullishStr` / `nullishNum`
// so consumers see plain non-null fields instead of `T | null`.
export function adaptFornecedoresToLegacy(fornecedores: any[]): LegacyFornecedor[] {
  return fornecedores.map(f => ({
    id: f.id,
    nome_fantasia: nullishStr(f.nome_fantasia, f.razao_social),
    razao_social: f.razao_social,
    nomeFantasia: nullishStr(f.nome_fantasia, f.razao_social),
    razaoSocial: f.razao_social,
    cnpj: nullishStr(f.cnpj),
    tipo: f.tipo === 'internacional' ? 'IMPORTADORA' as const :
          f.tipo === 'local' ? 'DISTRIBUIDORA' as const : 'FABRICANTE' as const,
    ramos: f.segmento ? [f.segmento] : [],
    vendeProduto: 'AMBOS' as const,
    email: nullishStr(f.email),
    telefone: nullishStr(f.telefone),
    whatsapp: nullishStr(f.telefone),
    apiIntegrada: nullishBool(f.integrado_api),
    rating: Math.round(nullishNum(f.avaliacao)),
    totalMes: 0,
    ultimaCompra: '',
  }));
}

export function adaptCotacoesFromDB(cotacoes: any[]): CotacaoAPI[] {
  return cotacoes.map(c => {
    const valorFrete = nullishNum(c.valor_frete);
    return {
      id: c.id,
      fornecedor: nullishStr(
        c.fornecedor?.nome_fantasia ?? c.fornecedor?.razao_social,
        'Fornecedor',
      ),
      status: 'encontrado' as const,
      valorUnitario: nullishNum(c.valor_unitario),
      quantidadeDisponivel: nullishNum(c.quantidade),
      prazoEntrega: nullishNum(c.prazo_entrega),
      frete: valorFrete,
      freteInfo: valorFrete > 0 ? `+R$ ${valorFrete}` : 'Incluso',
      condicaoPagamento: nullishStr(c.condicao_pagamento, 'À vista'),
      total: nullishNum(c.valor_total),
      selecionada: nullishBool(c.selecionada),
      score_preco: nullishNum(c.score_preco),
      score_prazo: nullishNum(c.score_prazo),
      score_qualidade: nullishNum(c.score_qualidade),
      score_total: nullishNum(c.score_total),
    };
  });
}

export async function simulateAPISearch(
  fornecedores: any[],
  quantidade: number,
  produtoId?: string
): Promise<CotacaoAPI[]> {
  await new Promise(resolve => setTimeout(resolve, 2000));

  const suppliersToSearch = fornecedores;

  // If we have a product context, prioritize linked suppliers from our ecosystem
  if (produtoId) {
    const { data: linkedSuppliers } = await supabase
      .from('produto_fornecedores')
      .select('fornecedor_id, preco_custo, lead_time_estimado')
      .eq('produto_id', produtoId);
    
    if (linkedSuppliers && linkedSuppliers.length > 0) {
      // Logic: Boost linked suppliers or filter specifically to them
      // For simulation, we'll just ensure they are included and have accurate initial data
      // Debug: Using linked suppliers for simulation
      // logger.debug('Using linked suppliers for simulation', { linkedSuppliersCount: linkedSuppliers.length });
    }
  }

  const apiSuppliers = fornecedores.filter(f => f.integrado_api);

  const results: CotacaoAPI[] = apiSuppliers.map(supplier => {
    const isEncontrado = Math.random() > 0.3;
    const status: 'encontrado' | 'nao_encontrado' = isEncontrado ? 'encontrado' : 'nao_encontrado';
    const valorUnitario = 20 + Math.random() * 15;
    const frete = Math.random() > 0.5 ? Math.floor(50 + Math.random() * 200) : 0;
    return {
      id: `api-${supplier.id}`,
      fornecedor: supplier.nome_fantasia || supplier.razao_social,
      fornecedor_id: supplier.id,
      status,
      valorUnitario,
      quantidadeDisponivel: Math.floor(100 + Math.random() * 500),
      prazoEntrega: Math.floor(2 + Math.random() * 5),
      frete,
      freteInfo: frete > 0 ? `+R$ ${frete}` : 'Incluso',
      condicaoPagamento: ['À vista', '30 dias', '30/60 dias'][Math.floor(Math.random() * 3)],
      total: isEncontrado ? (valorUnitario * quantidade) + frete : 0,
    };
  });

  const manualSuppliers = fornecedores.filter(f => !f.integrado_api).slice(0, 3);
  manualSuppliers.forEach(s => {
    results.push({
      id: `manual-${s.id}`,
      fornecedor: s.nome_fantasia || s.razao_social,
      fornecedor_id: s.id,
      status: 'nao_encontrado',
      valorUnitario: 0,
      quantidadeDisponivel: 0,
      prazoEntrega: 0,
      frete: 0,
      freteInfo: '',
      condicaoPagamento: '',
      total: 0,
    });
  });

  return results.filter(r => r.status === 'encontrado');
}
