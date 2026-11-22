import { nullishStr, nullishNum, nullishBool } from "@/lib/dbMapping";
import { supabase } from "@/integrations/supabase/client";

interface FornecedorRow {
  id: string;
  nome_fantasia?: string | null;
  razao_social: string;
  cnpj?: string | null;
  tipo?: string | null;
  segmento?: string | null;
  email?: string | null;
  telefone?: string | null;
  integrado_api?: boolean | null;
  avaliacao?: number | null;
}

interface CotacaoRow {
  id: string;
  fornecedor?: { nome_fantasia?: string | null; razao_social?: string | null } | null;
  valor_unitario?: number | null;
  quantidade?: number | null;
  prazo_entrega?: number | null;
  valor_frete?: number | null;
  condicao_pagamento?: string | null;
  valor_total?: number | null;
  selecionada?: boolean | null;
  score_preco?: number | null;
  score_prazo?: number | null;
  score_qualidade?: number | null;
  score_total?: number | null;
}

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
export function adaptFornecedoresToLegacy(fornecedores: FornecedorRow[]): LegacyFornecedor[] {
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

export function adaptCotacoesFromDB(cotacoes: CotacaoRow[]): CotacaoAPI[] {
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

/**
 * Busca cotacoes ja registradas dos fornecedores ativos numa solicitacao.
 * Nao inventa preco: fornecedor sem cotacao registrada nao apareceu na busca.
 */
export async function fetchRegisteredQuotes(
  solicitacaoId: string,
  quantidade: number
): Promise<CotacaoAPI[]> {
  const { data, error } = await supabase
    .from('cotacoes')
    .select('id, fornecedor_id, valor_unitario, quantidade, valor_frete, prazo_entrega, condicao_pagamento, valor_total, selecionada, score_preco, score_prazo, score_qualidade, score_total, fornecedor:fornecedores(nome_fantasia, razao_social)')
    .eq('solicitacao_id', solicitacaoId)
    .not('valor_unitario', 'is', null);

  if (error) return [];

  return (data ?? []).map((c) => {
    const valorUnitario = nullishNum(c.valor_unitario) ?? 0;
    const frete = nullishNum(c.valor_frete) ?? 0;
    const registro = c as unknown as {
      fornecedor?: { nome_fantasia?: string | null; razao_social?: string | null } | null;
    };
    return {
      id: c.id,
      fornecedor:
        registro.fornecedor?.nome_fantasia ??
        registro.fornecedor?.razao_social ??
        'Fornecedor sem cadastro',
      fornecedor_id: c.fornecedor_id ?? undefined,
      status: 'encontrado' as const,
      valorUnitario,
      quantidadeDisponivel: nullishNum(c.quantidade) ?? quantidade,
      prazoEntrega: nullishNum(c.prazo_entrega) ?? 0,
      frete,
      freteInfo: frete > 0 ? `+R$ ${frete}` : 'Incluso',
      condicaoPagamento: nullishStr(c.condicao_pagamento, ''),
      total: nullishNum(c.valor_total) ?? valorUnitario * quantidade + frete,
      selecionada: nullishBool(c.selecionada) ?? false,
      score_preco: nullishNum(c.score_preco) ?? undefined,
      score_prazo: nullishNum(c.score_prazo) ?? undefined,
      score_qualidade: nullishNum(c.score_qualidade) ?? undefined,
      score_total: nullishNum(c.score_total) ?? undefined,
    };
  });
}
