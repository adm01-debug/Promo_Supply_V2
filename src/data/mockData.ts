// Mock Data - Sistema de Compras

export interface Solicitacao {
  id: string;
  itemNumber: string;
  empresa: string;
  produto: string;
  quantidade: number;
  quantidadeReal: number; // +2%
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

// KPIs Mock
export const kpisMock = {
  aguardandoCotacao: 12,
  aguardandoPagamento: 8,
  emTransito: 5,
  emColeta: 3,
  finalizados: 156,
  volumeMes: 45230,
  atrasados: 2,
  leadTime: 3.2,
  taxaEntrega: 98,
};

// Pipeline counts
export const pipelineMock = {
  solicitacao: 12,
  cotacao: 8,
  pedido: 5,
  pagamento: 3,
  transito: 2,
  entregue: 156,
};

// Solicitações Mock
export const solicitacoesMock: Solicitacao[] = [
  {
    id: '2638-1',
    itemNumber: '2638-1',
    empresa: 'EMPRESA ABC LTDA',
    produto: 'Mochila Executiva Preta',
    quantidade: 500,
    quantidadeReal: 510,
    tipo: 'PE_LISO',
    status: 'AGUARDANDO_COTACAO',
    vendedor: 'João Silva',
    prazoEntrega: '2025-12-20',
    createdAt: '2025-12-16',
  },
  {
    id: '2639-2',
    itemNumber: '2639-2',
    empresa: 'EMPRESA XYZ S.A.',
    produto: 'Caneta Metal Prata',
    quantidade: 1000,
    quantidadeReal: 1020,
    tipo: 'PE_LISO',
    status: 'EM_COTACAO',
    vendedor: 'Maria Santos',
    prazoEntrega: '2025-12-22',
    cotacoes: [
      { id: '1', fornecedor: 'XBZ Brindes', valorUnitario: 4.50, quantidadeDisponivel: 1500, prazoEntrega: 2, frete: 0, condicaoPagamento: 'À vista', total: 4590 },
      { id: '2', fornecedor: 'Stricker', valorUnitario: 4.80, quantidadeDisponivel: 1000, prazoEntrega: 3, frete: 150, condicaoPagamento: 'À vista', total: 5046 },
      { id: '3', fornecedor: 'Asia Import', valorUnitario: 5.20, quantidadeDisponivel: 2000, prazoEntrega: 5, frete: 200, condicaoPagamento: '30 dias', total: 5504 },
    ],
    createdAt: '2025-12-15',
  },
  {
    id: '2640-1',
    itemNumber: '2640-1',
    empresa: 'EMPRESA 123 ME',
    produto: 'Squeeze 500ml Branco',
    quantidade: 200,
    quantidadeReal: 204,
    tipo: 'FAB_PERSONALIZADO',
    status: 'FORNECEDOR_SELECIONADO',
    vendedor: 'Carlos Oliveira',
    prazoEntrega: '2025-12-25',
    fornecedorSelecionado: 'Estrela Brindes',
    valorUnitario: 12.00,
    valorTotal: 2448,
    createdAt: '2025-12-14',
  },
  {
    id: '2637-1',
    itemNumber: '2637-1',
    empresa: 'TECH SOLUTIONS LTDA',
    produto: 'Caderno Personalizado A5',
    quantidade: 300,
    quantidadeReal: 306,
    tipo: 'FAB_PERSONALIZADO',
    status: 'AGUARDANDO_PAGAMENTO',
    vendedor: 'Ana Costa',
    prazoEntrega: '2025-12-18',
    fornecedorSelecionado: 'Asia Import',
    valorUnitario: 15.00,
    valorTotal: 4590,
    createdAt: '2025-12-13',
  },
  {
    id: '2635-1',
    itemNumber: '2635-1',
    empresa: 'MEGA CORP S.A.',
    produto: 'Squeeze Térmico 750ml',
    quantidade: 150,
    quantidadeReal: 153,
    tipo: 'PE_LISO',
    status: 'PAGO',
    vendedor: 'Pedro Lima',
    prazoEntrega: '2025-12-19',
    fornecedorSelecionado: 'XBZ Brindes',
    valorUnitario: 28.00,
    valorTotal: 4284,
    createdAt: '2025-12-12',
  },
  {
    id: '2633-1',
    itemNumber: '2633-1',
    empresa: 'STARTUP INOVAÇÃO',
    produto: 'Boné Trucker Preto',
    quantidade: 400,
    quantidadeReal: 408,
    tipo: 'FAB_LISO',
    status: 'EM_TRANSITO',
    vendedor: 'Lucia Ferreira',
    prazoEntrega: '2025-12-17',
    fornecedorSelecionado: 'Estrela Brindes',
    valorUnitario: 18.50,
    valorTotal: 7548,
    createdAt: '2025-12-10',
  },
];

// Itens Urgentes (vencendo em breve)
export const itensUrgentesMock: { id: string; produto: string; fornecedor: string; vencimento: string; urgencia: 'critico' | 'alto' | 'medio' }[] = [
  { id: '2638-1', produto: 'Mochila Executiva', fornecedor: 'XBZ', vencimento: 'HOJE', urgencia: 'critico' },
  { id: '2639-2', produto: 'Caneta Metal', fornecedor: 'Stricker', vencimento: 'Amanhã', urgencia: 'alto' },
  { id: '2640-1', produto: 'Squeeze 500ml', fornecedor: 'Asia', vencimento: '18/12', urgencia: 'medio' },
];

// Fornecedores Mock
export const fornecedoresMock: Fornecedor[] = [
  {
    id: '1',
    razaoSocial: 'XBZ BRINDES LTDA',
    nomeFantasia: 'XBZ Brindes',
    cnpj: '12.345.678/0001-90',
    tipo: 'IMPORTADORA',
    ramos: ['Bolsas', 'Mochilas', 'Acessórios'],
    vendeProduto: 'AMBOS',
    email: 'vendas@xbz.com.br',
    telefone: '(11) 99999-9999',
    whatsapp: '(11) 99999-9999',
    apiIntegrada: true,
    rating: 5,
    totalMes: 45000,
    ultimaCompra: '2025-12-15',
  },
  {
    id: '2',
    razaoSocial: 'STRICKER BRASIL LTDA',
    nomeFantasia: 'Stricker / Spot Gifts',
    cnpj: '23.456.789/0001-01',
    tipo: 'IMPORTADORA',
    ramos: ['Canetas', 'Escritório'],
    vendeProduto: 'LISO',
    email: 'comercial@stricker.com.br',
    telefone: '(11) 88888-8888',
    whatsapp: '(11) 88888-8888',
    apiIntegrada: true,
    rating: 4,
    totalMes: 28000,
    ultimaCompra: '2025-12-14',
  },
  {
    id: '3',
    razaoSocial: 'ASIA IMPORT BRINDES',
    nomeFantasia: 'Asia Import',
    cnpj: '34.567.890/0001-12',
    tipo: 'IMPORTADORA',
    ramos: ['Squeezes', 'Copos', 'Utilidades'],
    vendeProduto: 'LISO',
    email: 'contato@asiaimport.com.br',
    telefone: '(11) 77777-7777',
    whatsapp: '(11) 77777-7777',
    apiIntegrada: true,
    rating: 4,
    totalMes: 22000,
    ultimaCompra: '2025-12-13',
  },
  {
    id: '4',
    razaoSocial: 'ESTRELA BRINDES CONFECÇÕES',
    nomeFantasia: 'Estrela Brindes',
    cnpj: '45.678.901/0001-23',
    tipo: 'FABRICANTE',
    ramos: ['Têxtil', 'Bonés', 'Camisetas'],
    vendeProduto: 'PERSONALIZADO',
    email: 'estrela@email.com',
    telefone: '(11) 66666-6666',
    whatsapp: '(11) 66666-6666',
    apiIntegrada: false,
    rating: 3,
    totalMes: 12000,
    ultimaCompra: '2025-12-10',
  },
];

// Pagamentos Mock
export const pagamentosMock: Pagamento[] = [
  {
    id: '1',
    ordemCompra: 'OC-2024-0458',
    solicitacaoId: '2638-1',
    fornecedor: 'XBZ Brindes',
    produto: 'Mochila Executiva',
    valor: 11475,
    metodo: 'PIX',
    vencimento: '2025-12-16',
    status: 'PENDENTE',
  },
  {
    id: '2',
    ordemCompra: 'OC-2024-0459',
    solicitacaoId: '2639-2',
    fornecedor: 'Stricker',
    produto: 'Caneta Metal',
    valor: 8400,
    metodo: 'BOLETO',
    vencimento: '2025-12-18',
    status: 'PENDENTE',
  },
  {
    id: '3',
    ordemCompra: 'OC-2024-0460',
    solicitacaoId: '2640-1',
    fornecedor: 'Asia Import',
    produto: 'Squeeze 500ml',
    valor: 2400,
    metodo: 'PIX',
    vencimento: '2025-12-21',
    status: 'PENDENTE',
  },
  {
    id: '4',
    ordemCompra: 'OC-2024-0461',
    solicitacaoId: '2641-1',
    fornecedor: 'Estrela Brindes',
    produto: 'Boné Trucker',
    valor: 7548,
    metodo: 'BOLETO',
    vencimento: '2025-12-14',
    status: 'PENDENTE',
  },
  {
    id: '5',
    ordemCompra: 'OC-2024-0462',
    solicitacaoId: '2642-1',
    fornecedor: 'XBZ Brindes',
    produto: 'Ecobag Algodão',
    valor: 3200,
    metodo: 'PIX',
    vencimento: '2025-12-17',
    status: 'PROCESSANDO',
  },
  {
    id: '6',
    ordemCompra: 'OC-2024-0450',
    solicitacaoId: '2630-1',
    fornecedor: 'Stricker',
    produto: 'Porta Cartões',
    valor: 4560,
    metodo: 'PIX',
    vencimento: '2025-12-10',
    status: 'PAGO',
  },
  {
    id: '7',
    ordemCompra: 'OC-2024-0451',
    solicitacaoId: '2631-1',
    fornecedor: 'Asia Import',
    produto: 'Copo Térmico 450ml',
    valor: 6780,
    metodo: 'BOLETO',
    vencimento: '2025-12-08',
    status: 'PAGO',
  },
  {
    id: '8',
    ordemCompra: 'OC-2024-0452',
    solicitacaoId: '2632-1',
    fornecedor: 'XBZ Brindes',
    produto: 'Necessaire',
    valor: 2890,
    metodo: 'PIX',
    vencimento: '2025-12-05',
    status: 'PAGO',
  },
  {
    id: '9',
    ordemCompra: 'OC-2024-0453',
    solicitacaoId: '2633-2',
    fornecedor: 'Estrela Brindes',
    produto: 'Camiseta Polo',
    valor: 15200,
    metodo: 'BOLETO',
    vencimento: '2025-12-12',
    status: 'PAGO',
  },
  {
    id: '10',
    ordemCompra: 'OC-2024-0454',
    solicitacaoId: '2634-1',
    fornecedor: 'Stricker',
    produto: 'Chaveiro Metal',
    valor: 1850,
    metodo: 'PIX',
    vencimento: '2025-12-09',
    status: 'PAGO',
  },
];

// Helper functions
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
