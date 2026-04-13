import type { Solicitacao } from "@/hooks/useSolicitacoes";
import type { Solicitacao as MockSolicitacao } from "@/types/legacyTypes";

// Map DB status to legacy status for UI compatibility
export const mapDbStatusToLegacy = (status: Solicitacao['status']): MockSolicitacao['status'] => {
  const mapping: Record<Solicitacao['status'], MockSolicitacao['status']> = {
    'pendente': 'AGUARDANDO_COTACAO',
    'em_cotacao': 'EM_COTACAO',
    'aprovada': 'FORNECEDOR_SELECIONADO',
    'em_andamento': 'AGUARDANDO_PAGAMENTO',
    'concluida': 'ENTREGUE',
    'rejeitada': 'FORNECEDOR_SELECIONADO',
    'cancelada': 'PEDIDO_GERADO',
  };
  return mapping[status] || 'AGUARDANDO_COTACAO';
};

export const mapLegacyStatusToDb = (legacyStatus: string): Solicitacao['status'] => {
  const mapping: Record<string, Solicitacao['status']> = {
    'AGUARDANDO_COTACAO': 'pendente',
    'EM_COTACAO': 'em_cotacao',
    'FORNECEDOR_SELECIONADO': 'aprovada',
    'AGUARDANDO_PAGAMENTO': 'em_andamento',
    'PAGO': 'concluida',
    'EM_TRANSITO': 'concluida',
    'ENTREGUE': 'concluida',
    'PEDIDO_GERADO': 'em_andamento',
    'CANCELADO': 'cancelada',
  };
  return mapping[legacyStatus] || 'pendente';
};

// Adapt DB solicitacao to legacy format for components
export const adaptToLegacyFormat = (sol: Solicitacao): MockSolicitacao => ({
  id: sol.id,
  itemNumber: sol.id.slice(0, 8),
  empresa: sol.departamento || 'Empresa',
  produto: sol.titulo,
  quantidade: sol.quantidade,
  quantidadeReal: Math.ceil(sol.quantidade * 1.02),
  tipo: sol.tipo === 'material' ? 'PE_LISO' : sol.tipo === 'servico' ? 'FAB_LISO' : 'FAB_PERSONALIZADO',
  status: mapDbStatusToLegacy(sol.status),
  vendedor: sol.observacoes || 'Vendedor',
  prazoEntrega: sol.data_necessidade || sol.created_at,
  valorTotal: sol.valor_estimado || 0,
  createdAt: sol.created_at,
});

export const statusConfig: Record<string, { label: string; color: string; indicatorStatus: "pending" | "processing" | "approved" | "completed" | "warning" | "info" }> = {
  AGUARDANDO_COTACAO: { label: 'Aguardando Cotação', color: 'bg-success', indicatorStatus: 'pending' },
  EM_COTACAO: { label: 'Em Cotação', color: 'bg-warning', indicatorStatus: 'warning' },
  FORNECEDOR_SELECIONADO: { label: 'Fornecedor Selecionado', color: 'bg-info', indicatorStatus: 'info' },
  AGUARDANDO_PAGAMENTO: { label: 'Aguardando Pagamento', color: 'bg-warning', indicatorStatus: 'processing' },
  PAGO: { label: 'Pago', color: 'bg-cyan-500', indicatorStatus: 'completed' },
  EM_TRANSITO: { label: 'Em Trânsito', color: 'bg-purple-500', indicatorStatus: 'approved' },
};
