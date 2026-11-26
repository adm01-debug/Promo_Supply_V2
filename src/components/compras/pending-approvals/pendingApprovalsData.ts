export interface PendingApprovalItem {
  id: string;
  workflow_id: string;
  solicitacao_id: string;
  solicitacao_numero: string;
  descricao: string;
  solicitante: string;
  valor: number;
  categoria: string;
  data_solicitacao: string;
  prazo_limite: string;
  etapa_atual: number;
  total_etapas: number;
  aprovadores_anteriores: string[];
  urgente: boolean;
  escalado: boolean;
}

export type SortOption = 'prazo' | 'valor' | 'data';
export type FilterStatus = 'all' | 'urgente' | 'escalado' | 'normal';

export const mockPendingApprovals: PendingApprovalItem[] = [
  {
    id: "step-1",
    workflow_id: "wf-1",
    solicitacao_id: "sol-1",
    solicitacao_numero: "SOL-2024-156",
    descricao: "Mochilas Executivas para evento corporativo",
    solicitante: "Maria Santos",
    valor: 15800,
    categoria: "Brindes Promocionais",
    data_solicitacao: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
    prazo_limite: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    etapa_atual: 2,
    total_etapas: 3,
    aprovadores_anteriores: ["João Silva (Gestor)"],
    urgente: false,
    escalado: false,
  },
  {
    id: "step-2",
    workflow_id: "wf-2",
    solicitacao_id: "sol-2",
    solicitacao_numero: "SOL-2024-158",
    descricao: "Kit escritório para onboarding - 500 unidades",
    solicitante: "Carlos Lima",
    valor: 8500,
    categoria: "Material de Escritório",
    data_solicitacao: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
    prazo_limite: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    etapa_atual: 1,
    total_etapas: 2,
    aprovadores_anteriores: [],
    urgente: true,
    escalado: false,
  },
  {
    id: "step-3",
    workflow_id: "wf-3",
    solicitacao_id: "sol-3",
    solicitacao_numero: "SOL-2024-152",
    descricao: "Equipamentos de informática - Renovação parque",
    solicitante: "Ana Oliveira",
    valor: 75000,
    categoria: "Equipamentos",
    data_solicitacao: new Date(Date.now() - 78 * 60 * 60 * 1000).toISOString(),
    prazo_limite: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    etapa_atual: 3,
    total_etapas: 4,
    aprovadores_anteriores: ["Pedro Costa (Gestor)", "Lucia Ferreira (Coordenadora)"],
    urgente: false,
    escalado: true,
  },
];

export const getTimeStatus = (prazoLimite: string) => {
  const now = new Date();
  const deadline = new Date(prazoLimite);
  const diffMs = deadline.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 0) {
    return { 
      status: "overdue", 
      color: "text-destructive", 
      bgColor: "bg-destructive",
      label: `Atrasado ${Math.abs(Math.round(diffHours))}h`
    };
  }
  if (diffHours <= 4) {
    return { 
      status: "critical", 
      color: "text-warning", 
      bgColor: "bg-warning",
      label: `${Math.round(diffHours)}h restantes`
    };
  }
  return { 
    status: "normal", 
    color: "text-info", 
    bgColor: "bg-info",
    label: `${Math.round(diffHours)}h restantes`
  };
};

export const getTimeProgress = (dataSolicitacao: string, prazoLimite: string) => {
  const start = new Date(dataSolicitacao).getTime();
  const end = new Date(prazoLimite).getTime();
  const now = Date.now();
  const progress = ((now - start) / (end - start)) * 100;
  return Math.min(Math.max(progress, 0), 100);
};
