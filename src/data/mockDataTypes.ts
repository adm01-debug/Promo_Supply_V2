export interface Solicitacao {
  id: string;
  itemNumber: string;
  empresa: string;
  produto: string;
  quantidade: number;
  quantidadeReal: number;
  tipo: 'PE_LISO' | 'FAB_LISO' | 'FAB_PERSONALIZADO';
  status: 'AGUARDANDO_COTACAO' | 'EM_COTACAO' | 'FORNECEDOR_SELECIONADO' | 'PEDIDO_GERADO' | 'AGUARDANDO_PAGAMENTO' | 'PAGO' | 'EM_TRANSITO' | 'ENTREGUE';
  vendedor: string;
  prazoEntrega: string;
  fornecedorSelecionado?: string;
  valorUnitario?: number;
  valorTotal?: number;
  cotacoes?: Cotacao[];
  createdAt: string;
}

export interface Cotacao {
  id: string;
  fornecedor: string;
  valorUnitario: number;
  quantidadeDisponivel: number;
  prazoEntrega: number;
  frete: number;
  condicaoPagamento: string;
  total: number;
}

export interface Fornecedor {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
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

export interface Pagamento {
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

export const getTipoLabel = (tipo: Solicitacao['tipo']) => {
  const labels = {
    PE_LISO: 'P.E. Liso',
    FAB_LISO: 'Fab. Liso',
    FAB_PERSONALIZADO: 'Fab. Personalizado',
  };
  return labels[tipo];
};

export const getStatusLabel = (status: Solicitacao['status']) => {
  const labels = {
    AGUARDANDO_COTACAO: 'Aguardando Cotação',
    EM_COTACAO: 'Em Cotação',
    FORNECEDOR_SELECIONADO: 'Fornecedor Selecionado',
    PEDIDO_GERADO: 'Pedido Gerado',
    AGUARDANDO_PAGAMENTO: 'Aguardando Pagamento',
    PAGO: 'Pago',
    EM_TRANSITO: 'Em Trânsito',
    ENTREGUE: 'Entregue',
  };
  return labels[status];
};

export const getStatusColor = (status: Solicitacao['status']) => {
  const colors = {
    AGUARDANDO_COTACAO: 'bg-emerald-500',
    EM_COTACAO: 'bg-yellow-500',
    FORNECEDOR_SELECIONADO: 'bg-blue-500',
    PEDIDO_GERADO: 'bg-indigo-500',
    AGUARDANDO_PAGAMENTO: 'bg-orange-500',
    PAGO: 'bg-cyan-500',
    EM_TRANSITO: 'bg-purple-500',
    ENTREGUE: 'bg-green-600',
  };
  return colors[status];
};
