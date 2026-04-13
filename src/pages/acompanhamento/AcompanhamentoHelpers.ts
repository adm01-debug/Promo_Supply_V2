import { differenceInDays, differenceInHours, isPast, isToday, isTomorrow, parseISO } from "date-fns";
import { AlertTriangle, AlertCircle, CheckCircle2, Timer } from "lucide-react";
import { EtapaPipeline } from "@/components/compras/PedidoTimeline";
import { TimelineStep } from "@/components/compras/EnhancedPedidoTimeline";

export type SLAStatus = 'atrasado' | 'critico' | 'atencao' | 'no_prazo' | 'entregue';

export interface AcompanhamentoPedido {
  id: string;
  produto: string;
  quantidade: number;
  quantidadeReal: number;
  status: string;
  empresa: string;
  vendedor: string;
  prazoEntrega: string;
  fornecedorSelecionado: string | null;
  valorTotal: number | null;
  valorUnitario: number | null;
  createdAt: string;
  tipo: string;
}

export interface SLAInfo {
  status: SLAStatus;
  diasRestantes: number;
  horasRestantes?: number;
  label: string;
  color: string;
  bgColor: string;
  icon: typeof AlertTriangle;
}

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'pendente': 'Pendente', 'aprovada': 'Aprovada', 'em_cotacao': 'Em Cotação',
    'cotada': 'Cotada', 'em_analise': 'Em Análise', 'aprovada_compra': 'Aprovada p/ Compra',
    'em_pedido': 'Em Pedido', 'entregue': 'Entregue', 'cancelada': 'Cancelada', 'concluida': 'Concluída',
    'AGUARDANDO_COTACAO': 'Aguardando Cotação', 'EM_COTACAO': 'Em Cotação',
    'FORNECEDOR_SELECIONADO': 'Fornecedor Selecionado', 'PEDIDO_GERADO': 'Pedido Gerado',
    'AGUARDANDO_PAGAMENTO': 'Aguardando Pagamento', 'PAGO': 'Pago',
    'EM_TRANSITO': 'Em Trânsito', 'ENTREGUE': 'Entregue',
  };
  return labels[status] || status;
};

export const getTipoLabel = (tipo: string): string => {
  const labels: Record<string, string> = {
    'produto': 'Produto', 'servico': 'Serviço', 'material': 'Material',
    'pe_liso': 'P.E. Liso', 'fabricacao_liso': 'Fab. Liso', 'fabricacao_personalizado': 'Fab. Personalizado',
  };
  return labels[tipo] || tipo;
};

export const calcularSLA = (prazoEntrega: string, statusPedido: string): SLAInfo => {
  if (statusPedido === 'ENTREGUE') {
    return { status: 'entregue', diasRestantes: 0, label: 'Entregue', color: 'text-success', bgColor: 'bg-success/10', icon: CheckCircle2 };
  }
  const prazo = parseISO(prazoEntrega);
  const hoje = new Date();
  const diasRestantes = differenceInDays(prazo, hoje);
  const horasRestantes = differenceInHours(prazo, hoje);

  if (isPast(prazo) && !isToday(prazo)) {
    return { status: 'atrasado', diasRestantes, label: `${Math.abs(diasRestantes)} dia${Math.abs(diasRestantes) !== 1 ? 's' : ''} atrasado`, color: 'text-destructive', bgColor: 'bg-destructive/10', icon: AlertCircle };
  }
  if (isToday(prazo)) {
    return { status: 'critico', diasRestantes: 0, horasRestantes, label: 'Vence HOJE', color: 'text-destructive', bgColor: 'bg-destructive/10', icon: AlertTriangle };
  }
  if (isTomorrow(prazo)) {
    return { status: 'critico', diasRestantes: 1, label: 'Vence AMANHÃ', color: 'text-warning', bgColor: 'bg-warning/10', icon: AlertTriangle };
  }
  if (diasRestantes <= 3) {
    return { status: 'atencao', diasRestantes, label: `${diasRestantes} dias restantes`, color: 'text-warning', bgColor: 'bg-warning/10', icon: Timer };
  }
  return { status: 'no_prazo', diasRestantes, label: `${diasRestantes} dias restantes`, color: 'text-success', bgColor: 'bg-success/10', icon: CheckCircle2 };
};

export const getStatusBadgeColor = (status: string) => {
  const colors: Record<string, string> = {
    FORNECEDOR_SELECIONADO: "bg-info/10 text-info border-blue-500/20",
    PEDIDO_GERADO: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    AGUARDANDO_PAGAMENTO: "bg-warning/10 text-warning border-orange-500/20",
    PAGO: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    EM_TRANSITO: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    ENTREGUE: "bg-success/10 text-success border-success/20",
  };
  return colors[status] || "bg-muted text-muted-foreground";
};

export const mapPedidoStatus = (status: string): string => {
  const map: Record<string, string> = {
    'pendente': 'PEDIDO_GERADO', 'aprovado': 'PEDIDO_GERADO',
    'em_transito': 'EM_TRANSITO', 'entregue': 'ENTREGUE', 'cancelado': 'CANCELADO',
  };
  return map[status] || status.toUpperCase();
};

export const gerarEtapasPipeline = (status: string): EtapaPipeline[] => {
  const todasEtapas = [
    { id: 'solicitacao', nome: 'Solicitação' }, { id: 'cotacao', nome: 'Cotação' },
    { id: 'pedido', nome: 'Pedido' }, { id: 'pagamento', nome: 'Pagamento' },
    { id: 'transito', nome: 'Em Trânsito' }, { id: 'entregue', nome: 'Entregue' },
  ];
  const statusOrdem: Record<string, number> = {
    AGUARDANDO_COTACAO: 0, EM_COTACAO: 1, FORNECEDOR_SELECIONADO: 2, PEDIDO_GERADO: 2,
    AGUARDANDO_PAGAMENTO: 3, PAGO: 4, EM_TRANSITO: 4, ENTREGUE: 5,
  };
  const etapaAtual = statusOrdem[status] ?? 0;
  return todasEtapas.map((etapa, index) => ({
    ...etapa,
    status: index < etapaAtual ? 'concluido' : index === etapaAtual ? 'atual' : 'pendente',
    data: index < etapaAtual ? '15/12/2025' : index === etapaAtual ? 'Agora' : undefined,
  }));
};

export const gerarEtapasEnhanced = (pedido: AcompanhamentoPedido): TimelineStep[] => {
  const statusOrdem: Record<string, number> = {
    AGUARDANDO_COTACAO: 0, EM_COTACAO: 1, FORNECEDOR_SELECIONADO: 2, PEDIDO_GERADO: 2,
    AGUARDANDO_PAGAMENTO: 3, PAGO: 4, EM_TRANSITO: 4, ENTREGUE: 5,
  };
  const etapaAtual = statusOrdem[pedido.status] ?? 0;
  const dataBase = new Date(pedido.createdAt);

  const todasEtapas: TimelineStep[] = [
    { id: 'solicitacao', nome: 'Solicitação Criada', status: 'pendente', dataReal: pedido.createdAt, data: new Date(pedido.createdAt).toLocaleDateString('pt-BR'), descricao: `Solicitação de ${pedido.quantidade} unidades de ${pedido.produto}`, responsavel: 'Sistema', duracao: '< 1 min' },
    { id: 'cotacao', nome: 'Cotação Enviada', status: 'pendente', dataReal: new Date(dataBase.getTime() + 86400000).toISOString(), data: new Date(dataBase.getTime() + 86400000).toLocaleDateString('pt-BR'), descricao: 'Cotações solicitadas a 3 fornecedores', responsavel: 'Equipe de Compras', duracao: '24 horas' },
    { id: 'selecao', nome: 'Fornecedor Selecionado', status: 'pendente', dataReal: new Date(dataBase.getTime() + 172800000).toISOString(), data: new Date(dataBase.getTime() + 172800000).toLocaleDateString('pt-BR'), descricao: pedido.fornecedorSelecionado ? `Selecionado: ${pedido.fornecedorSelecionado}` : 'Aguardando seleção', responsavel: 'Gestor de Compras', duracao: '2 dias' },
    { id: 'pedido', nome: 'Pedido Gerado', status: 'pendente', dataReal: new Date(dataBase.getTime() + 259200000).toISOString(), data: new Date(dataBase.getTime() + 259200000).toLocaleDateString('pt-BR'), descricao: 'Ordem de compra emitida', responsavel: 'Sistema', duracao: '< 1 hora', documentos: [{ nome: 'OC-' + pedido.id + '.pdf', url: '#' }] },
    { id: 'pagamento', nome: 'Pagamento Realizado', status: 'pendente', dataReal: new Date(dataBase.getTime() + 345600000).toISOString(), data: new Date(dataBase.getTime() + 345600000).toLocaleDateString('pt-BR'), descricao: pedido.valorTotal ? `Valor: R$ ${pedido.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Aguardando pagamento', responsavel: 'Financeiro', duracao: '1-3 dias', documentos: pedido.valorTotal ? [{ nome: 'NF-' + pedido.id + '.pdf', url: '#' }] : undefined },
    { id: 'transito', nome: 'Em Trânsito', status: 'pendente', dataReal: new Date(dataBase.getTime() + 432000000).toISOString(), data: new Date(dataBase.getTime() + 432000000).toLocaleDateString('pt-BR'), descricao: 'Produto em transporte para entrega', responsavel: 'Transportadora', duracao: '2-5 dias', observacoes: 'Código de rastreamento disponível' },
    { id: 'entregue', nome: 'Entregue', status: 'pendente', data: new Date(pedido.prazoEntrega).toLocaleDateString('pt-BR'), descricao: 'Produto entregue e conferido', responsavel: 'Almoxarifado' },
  ];

  return todasEtapas.map((etapa, index) => ({
    ...etapa,
    status: index < etapaAtual ? 'concluido' : index === etapaAtual ? 'atual' : 'pendente',
  }));
};
