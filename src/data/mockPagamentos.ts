import type { Pagamento } from './mockDataTypes';

export const pagamentosMock: Pagamento[] = [
  { id: '1', ordemCompra: 'OC-2024-0458', solicitacaoId: '2638-1', fornecedor: 'XBZ Brindes', produto: 'Mochila Executiva', valor: 11475, metodo: 'PIX', vencimento: '2025-12-16', status: 'PENDENTE' },
  { id: '2', ordemCompra: 'OC-2024-0459', solicitacaoId: '2639-2', fornecedor: 'Stricker', produto: 'Caneta Metal', valor: 8400, metodo: 'BOLETO', vencimento: '2025-12-18', status: 'PENDENTE' },
  { id: '3', ordemCompra: 'OC-2024-0460', solicitacaoId: '2640-1', fornecedor: 'Asia Import', produto: 'Squeeze 500ml', valor: 2400, metodo: 'PIX', vencimento: '2025-12-21', status: 'PENDENTE' },
  { id: '4', ordemCompra: 'OC-2024-0461', solicitacaoId: '2641-1', fornecedor: 'Estrela Brindes', produto: 'Boné Trucker', valor: 7548, metodo: 'BOLETO', vencimento: '2025-12-14', status: 'PENDENTE' },
  { id: '5', ordemCompra: 'OC-2024-0462', solicitacaoId: '2642-1', fornecedor: 'XBZ Brindes', produto: 'Ecobag Algodão', valor: 3200, metodo: 'PIX', vencimento: '2025-12-17', status: 'PROCESSANDO' },
  { id: '6', ordemCompra: 'OC-2024-0450', solicitacaoId: '2630-1', fornecedor: 'Stricker', produto: 'Porta Cartões', valor: 4560, metodo: 'PIX', vencimento: '2025-12-10', status: 'PAGO' },
  { id: '7', ordemCompra: 'OC-2024-0451', solicitacaoId: '2631-1', fornecedor: 'Asia Import', produto: 'Copo Térmico 450ml', valor: 6780, metodo: 'BOLETO', vencimento: '2025-12-08', status: 'PAGO' },
  { id: '8', ordemCompra: 'OC-2024-0452', solicitacaoId: '2632-1', fornecedor: 'XBZ Brindes', produto: 'Necessaire', valor: 2890, metodo: 'PIX', vencimento: '2025-12-05', status: 'PAGO' },
  { id: '9', ordemCompra: 'OC-2024-0453', solicitacaoId: '2633-2', fornecedor: 'Estrela Brindes', produto: 'Camiseta Polo', valor: 15200, metodo: 'BOLETO', vencimento: '2025-12-12', status: 'PAGO' },
  { id: '10', ordemCompra: 'OC-2024-0454', solicitacaoId: '2634-1', fornecedor: 'Stricker', produto: 'Chaveiro Metal', valor: 1850, metodo: 'PIX', vencimento: '2025-12-09', status: 'PAGO' },
];
