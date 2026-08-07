import { Check, Package, CreditCard, Truck, MapPin, CheckCircle2, FileText } from "lucide-react";

export interface TimelineStep {
  id: string;
  nome: string;
  status: 'concluido' | 'atual' | 'pendente' | 'erro';
  data?: string;
  dataReal?: string;
  descricao?: string;
  responsavel?: string;
  duracao?: string;
  documentos?: { nome: string; url: string }[];
  observacoes?: string;
}

export const iconesPorEtapa: Record<string, typeof Check> = {
  solicitacao: FileText,
  aprovacao: Check,
  cotacao: Package,
  selecao: CheckCircle2,
  pedido: CreditCard,
  pagamento: CreditCard,
  preparacao: Package,
  transito: Truck,
  coleta: MapPin,
  entregue: CheckCircle2,
};

export const statusColors = {
  concluido: {
    bg: "bg-success",
    border: "border-success",
    text: "text-success",
    icon: "text-success-foreground",
    line: "bg-success",
    glow: "shadow-success/30",
  },
  atual: {
    bg: "bg-primary",
    border: "border-primary",
    text: "text-primary",
    icon: "text-primary-foreground",
    line: "bg-primary/50",
    glow: "shadow-primary/30",
  },
  pendente: {
    bg: "bg-muted",
    border: "border-border",
    text: "text-muted-foreground",
    icon: "text-muted-foreground",
    line: "bg-border",
    glow: "",
  },
  erro: {
    bg: "bg-destructive",
    border: "border-destructive",
    text: "text-destructive",
    icon: "text-destructive-foreground",
    line: "bg-destructive",
    glow: "shadow-destructive/30",
  },
};

export interface EnhancedPedidoTimelineProps {
  etapas: TimelineStep[];
  pedidoNumero?: string;
  fornecedor?: string;
  valorTotal?: number;
  prazoFinal?: string;
  orientacao?: 'horizontal' | 'vertical';
  showDetails?: boolean;
}
