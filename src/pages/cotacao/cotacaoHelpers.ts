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
}

export interface LegacyFornecedor {
  id: string;
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

export function adaptFornecedoresToLegacy(fornecedores: any[]): LegacyFornecedor[] {
  return fornecedores.map(f => ({
    id: f.id,
    nomeFantasia: f.nome_fantasia || f.razao_social,
    razaoSocial: f.razao_social,
    cnpj: f.cnpj || '',
    tipo: f.tipo === 'internacional' ? 'IMPORTADORA' as const :
          f.tipo === 'local' ? 'DISTRIBUIDORA' as const : 'FABRICANTE' as const,
    ramos: f.segmento ? [f.segmento] : [],
    vendeProduto: 'AMBOS' as const,
    email: f.email || '',
    telefone: f.telefone || '',
    whatsapp: f.telefone || '',
    apiIntegrada: f.integrado_api,
    rating: Math.round(f.avaliacao),
    totalMes: 0,
    ultimaCompra: '',
  }));
}

export function adaptCotacoesFromDB(cotacoes: any[]): CotacaoAPI[] {
  return cotacoes.map(c => ({
    id: c.id,
    fornecedor: c.fornecedor?.nome_fantasia || c.fornecedor?.razao_social || 'Fornecedor',
    status: 'encontrado' as const,
    valorUnitario: c.valor_unitario,
    quantidadeDisponivel: c.quantidade,
    prazoEntrega: c.prazo_entrega,
    frete: c.valor_frete,
    freteInfo: c.valor_frete > 0 ? `+R$ ${c.valor_frete}` : 'Incluso',
    condicaoPagamento: c.condicao_pagamento || 'À vista',
    total: c.valor_total,
    selecionada: c.selecionada,
  }));
}

export async function simulateAPISearch(
  fornecedores: any[],
  quantidade: number
): Promise<CotacaoAPI[]> {
  await new Promise(resolve => setTimeout(resolve, 2000));

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
