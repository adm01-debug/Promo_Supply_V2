import { Clock, AlertTriangle, CheckCircle2, Truck, Package, CreditCard, X } from "lucide-react";

export const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  rascunho: { label: "Rascunho", color: "bg-muted text-muted-foreground", icon: Clock },
  solicitada: { label: "Solicitada", color: "bg-kpi-warning/20 text-kpi-warning", icon: AlertTriangle },
  aprovada: { label: "Aprovada", color: "bg-primary/20 text-primary", icon: CheckCircle2 },
  em_transito: { label: "Em Trânsito", color: "bg-info/20 text-info", icon: Truck },
  recebida_fornecedor: { label: "Recebida", color: "bg-success/20 text-success", icon: Package },
  credito_emitido: { label: "Crédito Emitido", color: "bg-violet-500/20 text-violet-400", icon: CreditCard },
  reposicao_enviada: { label: "Reposição Enviada", color: "bg-cyan-500/20 text-cyan-400", icon: Truck },
  concluida: { label: "Concluída", color: "bg-kpi-success/20 text-kpi-success", icon: CheckCircle2 },
  rejeitada: { label: "Rejeitada", color: "bg-kpi-danger/20 text-kpi-danger", icon: X },
  cancelada: { label: "Cancelada", color: "bg-muted text-muted-foreground", icon: X },
};

export const CREDITO_STATUS_MAP: Record<string, { label: string; color: string }> = {
  ativo: { label: "Ativo", color: "bg-kpi-success/20 text-kpi-success" },
  utilizado: { label: "Utilizado", color: "bg-muted text-muted-foreground" },
  expirado: { label: "Expirado", color: "bg-kpi-danger/20 text-kpi-danger" },
  cancelado: { label: "Cancelado", color: "bg-muted text-muted-foreground" },
};
