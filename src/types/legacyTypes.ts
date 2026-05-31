/**
 * Legacy UI types used by components that bridge between the old mock format
 * and the real Supabase data. These types are used purely for UI rendering
 * and should NOT be confused with database types.
 */

export interface LegacySolicitacao {
  id: string;
  itemNumber: string;
  empresa: string;
  produto: string;
  quantidade: number;
  quantidadeReal: number;
  tipo: 'PE_LISO' | 'FAB_LISO' | 'FAB_PERSONALIZADO';
  status: 'AGUARDANDO_COTACAO' | 'EM_COTACAO' | 'FORNECEDOR_SELECIONADO' | 'PEDIDO_GERADO' | 'AGUARDANDO_PAGAMENTO' | 'PAGO' | 'EM_TRANSITO' | 'ENTREGUE' | 'REJEITADA' | 'CANCELADA';
  vendedor: string;
  prazoEntrega: string;
  fornecedorSelecionado?: string;
  valorUnitario?: number;
  valorTotal?: number;
  cotacoes?: LegacyCotacao[];
  createdAt: string;
  costCenterName?: string;
  costCenterCode?: string;
  organizationName?: string;
}


export interface LegacyCotacao {
  id: string;
  fornecedor: string;
  valorUnitario: number;
  quantidadeDisponivel: number;
  prazoEntrega: number;
  frete: number;
  condicaoPagamento: string;
  total: number;
}

export interface LegacyFornecedor {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  razaoSocial?: string; // Legacy compatibility
  nomeFantasia?: string; // Legacy compatibility
  tipo: 'IMPORTADORA' | 'FABRICANTE' | 'DISTRIBUIDORA';
  ramos: string[];
  vendeProduto: 'LISO' | 'PERSONALIZADO' | 'AMBOS';
  email: string;
  telefone: string;
  whatsapp: string;
  apiIntegrada: boolean;
  rating: number;
  totalMes: number;
  ultimaCompra: string;
}

export interface LegacyPagamento {
  id: string;
  ordemCompra: string;
  solicitacaoId: string;
  fornecedor: string;
  produto: string;
  valor: number;
  metodo: 'PIX' | 'BOLETO' | 'TRANSFERENCIA';
  vencimento: string;
  status: 'PENDENTE' | 'PROCESSANDO' | 'PAGO';
}

// Alias exports for backward compatibility
export type Solicitacao = LegacySolicitacao;
export type Cotacao = LegacyCotacao;
export type Fornecedor = LegacyFornecedor;
export type Pagamento = LegacyPagamento;

// Helper functions
export const getTipoLabel = (tipo: LegacySolicitacao['tipo']) => {
  const labels = {
    PE_LISO: 'P.E. Liso',
    FAB_LISO: 'Fab. Liso',
    FAB_PERSONALIZADO: 'Fab. Personalizado',
  };
  return labels[tipo];
};

export const getStatusLabel = (status: LegacySolicitacao['status']) => {
  const labels: Record<LegacySolicitacao['status'], string> = {
    AGUARDANDO_COTACAO: 'Aguardando Cotação',
    EM_COTACAO: 'Em Cotação',
    FORNECEDOR_SELECIONADO: 'Fornecedor Selecionado',
    PEDIDO_GERADO: 'Pedido Gerado',
    AGUARDANDO_PAGAMENTO: 'Aguardando Pagamento',
    PAGO: 'Pago',
    EM_TRANSITO: 'Em Trânsito',
    ENTREGUE: 'Finalizada',
    REJEITADA: 'Rejeitada',
    CANCELADA: 'Cancelada',
  };
  return labels[status];
};

export const getStatusColor = (status: LegacySolicitacao['status']) => {
  const colors: Record<LegacySolicitacao['status'], string> = {
    AGUARDANDO_COTACAO: 'bg-emerald-500',
    EM_COTACAO: 'bg-yellow-500',
    FORNECEDOR_SELECIONADO: 'bg-blue-500',
    PEDIDO_GERADO: 'bg-indigo-500',
    AGUARDANDO_PAGAMENTO: 'bg-orange-500',
    PAGO: 'bg-cyan-500',
    EM_TRANSITO: 'bg-purple-500',
    ENTREGUE: 'bg-green-600',
    REJEITADA: 'bg-red-500',
    CANCELADA: 'bg-gray-500',
  };
  return colors[status];
};
