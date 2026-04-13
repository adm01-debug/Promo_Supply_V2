// Mock Data - Sistema de Compras
// Types, interfaces, and helpers are in mockDataTypes.ts
// Fornecedores are in mockFornecedores.ts
// Pagamentos are in mockPagamentos.ts

export type { Solicitacao, Cotacao, Fornecedor, Pagamento } from './mockDataTypes';
export { getTipoLabel, getStatusLabel, getStatusColor } from './mockDataTypes';
export { fornecedoresMock } from './mockFornecedores';
export { pagamentosMock } from './mockPagamentos';

import type { Solicitacao } from './mockDataTypes';

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

// Sparkline data - tendência dos últimos 7 dias
export const kpiSparklineData = {
  aguardandoCotacao: [8, 10, 9, 14, 11, 10, 12],
  volumeMes: [38000, 39500, 41200, 42800, 44100, 44800, 45230],
  economia: [6200, 6800, 7100, 7600, 8100, 8400, 8750],
  taxaEntrega: [95, 96, 97, 96, 98, 97, 98],
};

// KPIs de Performance do Comprador
export const buyerPerformanceMock = {
  economiaGerada: 8750,
  economiaPercentual: 12.3,
  descontoMedio: 8.5,
  melhorPrecoRate: 87,
  cotacoesNegociadas: 45,
  valorNegociado: 71200,
  precoReferenciaTotal: 79950,
  precoFinalTotal: 71200,
  topEconomias: [
    { produto: "Mochila Executiva", economia: 2340, percentual: 18 },
    { produto: "Kit Escolar Personalizado", economia: 1850, percentual: 15 },
    { produto: "Caneta Metal Premium", economia: 1200, percentual: 12 },
    { produto: "Caderno Corporativo", economia: 980, percentual: 10 },
    { produto: "Squeeze Térmico", economia: 760, percentual: 9 },
  ],
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
  { id: '2638-1', itemNumber: '2638-1', empresa: 'EMPRESA ABC LTDA', produto: 'Mochila Executiva Preta', quantidade: 500, quantidadeReal: 510, tipo: 'PE_LISO', status: 'AGUARDANDO_COTACAO', vendedor: 'João Silva', prazoEntrega: '2025-12-20', createdAt: '2025-12-16' },
  { id: '2639-2', itemNumber: '2639-2', empresa: 'EMPRESA XYZ S.A.', produto: 'Caneta Metal Prata', quantidade: 1000, quantidadeReal: 1020, tipo: 'PE_LISO', status: 'EM_COTACAO', vendedor: 'Maria Santos', prazoEntrega: '2025-12-22',
    cotacoes: [
      { id: '1', fornecedor: 'XBZ Brindes', valorUnitario: 4.50, quantidadeDisponivel: 1500, prazoEntrega: 2, frete: 0, condicaoPagamento: 'À vista', total: 4590 },
      { id: '2', fornecedor: 'Stricker / Spot Gifts', valorUnitario: 4.80, quantidadeDisponivel: 1000, prazoEntrega: 3, frete: 150, condicaoPagamento: 'À vista', total: 5046 },
      { id: '3', fornecedor: 'Asia Import', valorUnitario: 5.20, quantidadeDisponivel: 2000, prazoEntrega: 5, frete: 200, condicaoPagamento: '30 dias', total: 5504 },
    ],
    createdAt: '2025-12-15' },
  { id: '2640-1', itemNumber: '2640-1', empresa: 'EMPRESA 123 ME', produto: 'Squeeze 500ml Branco', quantidade: 200, quantidadeReal: 204, tipo: 'FAB_PERSONALIZADO', status: 'FORNECEDOR_SELECIONADO', vendedor: 'Carlos Oliveira', prazoEntrega: '2025-12-25', fornecedorSelecionado: 'Estrela Brindes', valorUnitario: 12.00, valorTotal: 2448, createdAt: '2025-12-14' },
  { id: '2637-1', itemNumber: '2637-1', empresa: 'TECH SOLUTIONS LTDA', produto: 'Caderno Personalizado A5', quantidade: 300, quantidadeReal: 306, tipo: 'FAB_PERSONALIZADO', status: 'AGUARDANDO_PAGAMENTO', vendedor: 'Ana Costa', prazoEntrega: '2025-12-18', fornecedorSelecionado: 'Asia Import', valorUnitario: 15.00, valorTotal: 4590, createdAt: '2025-12-13' },
  { id: '2635-1', itemNumber: '2635-1', empresa: 'MEGA CORP S.A.', produto: 'Squeeze Térmico 750ml', quantidade: 150, quantidadeReal: 153, tipo: 'PE_LISO', status: 'PAGO', vendedor: 'Pedro Lima', prazoEntrega: '2025-12-19', fornecedorSelecionado: 'XBZ Brindes', valorUnitario: 28.00, valorTotal: 4284, createdAt: '2025-12-12' },
  { id: '2633-1', itemNumber: '2633-1', empresa: 'STARTUP INOVAÇÃO', produto: 'Boné Trucker Preto', quantidade: 400, quantidadeReal: 408, tipo: 'FAB_LISO', status: 'EM_TRANSITO', vendedor: 'Lucia Ferreira', prazoEntrega: '2025-12-17', fornecedorSelecionado: 'Estrela Brindes', valorUnitario: 18.50, valorTotal: 7548, createdAt: '2025-12-10' },
  { id: '2630-1', itemNumber: '2630-1', empresa: 'DIGITAL MARKETING CO', produto: 'Porta Cartões Couro', quantidade: 250, quantidadeReal: 255, tipo: 'FAB_PERSONALIZADO', status: 'ENTREGUE', vendedor: 'João Silva', prazoEntrega: '2025-12-08', fornecedorSelecionado: 'Premium Gifts', valorUnitario: 35.00, valorTotal: 8925, createdAt: '2025-12-01' },
  { id: '2631-1', itemNumber: '2631-1', empresa: 'AGÊNCIA CRIATIVA LTDA', produto: 'Copo Térmico 450ml', quantidade: 600, quantidadeReal: 612, tipo: 'PE_LISO', status: 'ENTREGUE', vendedor: 'Maria Santos', prazoEntrega: '2025-12-06', fornecedorSelecionado: 'Asia Import', valorUnitario: 11.00, valorTotal: 6732, createdAt: '2025-11-28' },
  { id: '2632-1', itemNumber: '2632-1', empresa: 'CONSTRUTORA NOVA ERA', produto: 'Necessaire Personalizada', quantidade: 350, quantidadeReal: 357, tipo: 'PE_LISO', status: 'ENTREGUE', vendedor: 'Carlos Oliveira', prazoEntrega: '2025-12-04', fornecedorSelecionado: 'XBZ Brindes', valorUnitario: 8.50, valorTotal: 3034.50, createdAt: '2025-11-25' },
  { id: '2633-2', itemNumber: '2633-2', empresa: 'STARTUP INOVAÇÃO', produto: 'Camiseta Polo Branca', quantidade: 200, quantidadeReal: 204, tipo: 'FAB_PERSONALIZADO', status: 'ENTREGUE', vendedor: 'Lucia Ferreira', prazoEntrega: '2025-12-10', fornecedorSelecionado: 'Estrela Brindes', valorUnitario: 45.00, valorTotal: 9180, createdAt: '2025-12-02' },
  { id: '2634-1', itemNumber: '2634-1', empresa: 'ADVOCACIA SILVA & ASSOCIADOS', produto: 'Chaveiro Metal Premium', quantidade: 500, quantidadeReal: 510, tipo: 'PE_LISO', status: 'ENTREGUE', vendedor: 'Ana Costa', prazoEntrega: '2025-12-07', fornecedorSelecionado: 'Stricker / Spot Gifts', valorUnitario: 3.80, valorTotal: 1938, createdAt: '2025-11-30' },
  { id: '2625-1', itemNumber: '2625-1', empresa: 'BANCO CENTRAL FINANCEIRA', produto: 'Mochila Notebook 15"', quantidade: 100, quantidadeReal: 102, tipo: 'PE_LISO', status: 'ENTREGUE', vendedor: 'Pedro Lima', prazoEntrega: '2025-11-28', fornecedorSelecionado: 'XBZ Brindes', valorUnitario: 65.00, valorTotal: 6630, createdAt: '2025-11-20' },
  { id: '2626-1', itemNumber: '2626-1', empresa: 'HOSPITAL SÃO LUCAS', produto: 'Squeeze Ecológico 600ml', quantidade: 800, quantidadeReal: 816, tipo: 'FAB_PERSONALIZADO', status: 'ENTREGUE', vendedor: 'João Silva', prazoEntrega: '2025-11-25', fornecedorSelecionado: 'Eco Brindes', valorUnitario: 14.00, valorTotal: 11424, createdAt: '2025-11-15' },
  { id: '2627-1', itemNumber: '2627-1', empresa: 'UNIVERSIDADE FEDERAL', produto: 'Caneta Ecológica Bambu', quantidade: 2000, quantidadeReal: 2040, tipo: 'PE_LISO', status: 'ENTREGUE', vendedor: 'Maria Santos', prazoEntrega: '2025-11-22', fornecedorSelecionado: 'Eco Brindes', valorUnitario: 2.50, valorTotal: 5100, createdAt: '2025-11-12' },
  { id: '2628-1', itemNumber: '2628-1', empresa: 'TECH STARTUP LABS', produto: 'Carregador Portátil 10000mAh', quantidade: 150, quantidadeReal: 153, tipo: 'PE_LISO', status: 'ENTREGUE', vendedor: 'Carlos Oliveira', prazoEntrega: '2025-11-30', fornecedorSelecionado: 'Tech Brindes', valorUnitario: 55.00, valorTotal: 8415, createdAt: '2025-11-18' },
  { id: '2629-1', itemNumber: '2629-1', empresa: 'EDITORA NOVA VISÃO', produto: 'Fone de Ouvido Bluetooth', quantidade: 200, quantidadeReal: 204, tipo: 'PE_LISO', status: 'ENTREGUE', vendedor: 'Ana Costa', prazoEntrega: '2025-12-01', fornecedorSelecionado: 'Tech Brindes', valorUnitario: 42.00, valorTotal: 8568, createdAt: '2025-11-22' },
  { id: '2620-1', itemNumber: '2620-1', empresa: 'IMOBILIÁRIA CENTRAL', produto: 'Carteira Couro Slim', quantidade: 300, quantidadeReal: 306, tipo: 'FAB_PERSONALIZADO', status: 'ENTREGUE', vendedor: 'Pedro Lima', prazoEntrega: '2025-11-18', fornecedorSelecionado: 'Premium Gifts', valorUnitario: 48.00, valorTotal: 14688, createdAt: '2025-11-08' },
  { id: '2621-1', itemNumber: '2621-1', empresa: 'SEGURADORA NACIONAL', produto: 'Agenda 2025 Personalizada', quantidade: 500, quantidadeReal: 510, tipo: 'FAB_PERSONALIZADO', status: 'ENTREGUE', vendedor: 'Lucia Ferreira', prazoEntrega: '2025-11-20', fornecedorSelecionado: 'Só Marcas', valorUnitario: 22.00, valorTotal: 11220, createdAt: '2025-11-10' },
  { id: '2622-1', itemNumber: '2622-1', empresa: 'CLÍNICA SÃO JOSÉ', produto: 'Kit Higiene Personalizado', quantidade: 400, quantidadeReal: 408, tipo: 'FAB_PERSONALIZADO', status: 'ENTREGUE', vendedor: 'João Silva', prazoEntrega: '2025-11-15', fornecedorSelecionado: 'Só Marcas', valorUnitario: 18.00, valorTotal: 7344, createdAt: '2025-11-05' },
  { id: '2623-1', itemNumber: '2623-1', empresa: 'ESCRITÓRIO CONTÁBIL PRIME', produto: 'Caneta Roller Premium', quantidade: 250, quantidadeReal: 255, tipo: 'PE_LISO', status: 'ENTREGUE', vendedor: 'Maria Santos', prazoEntrega: '2025-11-12', fornecedorSelecionado: 'Stricker / Spot Gifts', valorUnitario: 12.50, valorTotal: 3187.50, createdAt: '2025-11-02' },
  { id: '2624-1', itemNumber: '2624-1', empresa: 'INDÚSTRIA ALIMENTÍCIA SUL', produto: 'Avental Personalizado', quantidade: 300, quantidadeReal: 306, tipo: 'FAB_PERSONALIZADO', status: 'ENTREGUE', vendedor: 'Carlos Oliveira', prazoEntrega: '2025-11-10', fornecedorSelecionado: 'Estrela Brindes', valorUnitario: 25.00, valorTotal: 7650, createdAt: '2025-10-28' },
  { id: '2615-1', itemNumber: '2615-1', empresa: 'REDE DE FARMÁCIAS POPULAR', produto: 'Sacola Ecológica TNT', quantidade: 1000, quantidadeReal: 1020, tipo: 'PE_LISO', status: 'ENTREGUE', vendedor: 'Ana Costa', prazoEntrega: '2025-11-05', fornecedorSelecionado: 'Eco Brindes', valorUnitario: 4.50, valorTotal: 4590, createdAt: '2025-10-25' },
  { id: '2616-1', itemNumber: '2616-1', empresa: 'SUPERMERCADO BOM PREÇO', produto: 'Ecobag Juta', quantidade: 500, quantidadeReal: 510, tipo: 'FAB_LISO', status: 'ENTREGUE', vendedor: 'Pedro Lima', prazoEntrega: '2025-11-08', fornecedorSelecionado: 'XBZ Brindes', valorUnitario: 9.00, valorTotal: 4590, createdAt: '2025-10-28' },
];

// Itens Urgentes
export const itensUrgentesMock: { id: string; produto: string; fornecedor: string; vencimento: string; urgencia: 'critico' | 'alto' | 'medio' }[] = [
  { id: '2638-1', produto: 'Mochila Executiva', fornecedor: 'XBZ', vencimento: 'HOJE', urgencia: 'critico' },
  { id: '2639-2', produto: 'Caneta Metal', fornecedor: 'Stricker', vencimento: 'Amanhã', urgencia: 'alto' },
  { id: '2640-1', produto: 'Squeeze 500ml', fornecedor: 'Asia', vencimento: '18/12', urgencia: 'medio' },
];
