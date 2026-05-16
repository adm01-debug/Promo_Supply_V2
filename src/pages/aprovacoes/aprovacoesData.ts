/**
 * Mock data and constants for the Aprovacoes page.
 * Extracted to reduce the main component size.
 */

export interface ApprovalHistoryItem {
  id: string;
  solicitacao: string;
  valor: number;
  acao: string;
  por: string;
  data: string;
}

export interface ApprovalTrendItem {
  mes: string;
  aprovadas: number;
  rejeitadas: number;
  pendentes: number;
  tempoMedio: number;
}

export interface ApprovalByValueRangeItem {
  faixa: string;
  quantidade: number;
  tempoMedio: number;
}

export interface ApprovalByApproverItem {
  nome: string;
  aprovadas: number;
  rejeitadas: number;
  tempoMedio: number;
}

export interface BottleneckItem {
  etapa: string;
  tempo: number;
  percentual: number;
}

export interface StatusDistributionItem {
  name: string;
  value: number;
  color: string;
}

export interface WeeklyTrendItem {
  dia: string;
  quantidade: number;
  tempoMedio: number;
}

export const approvalHistory: ApprovalHistoryItem[] = [
  { id: "1", solicitacao: "SOL-2024-150", valor: 12500, acao: "Aprovado", por: "Você", data: "2024-12-15 14:30" },
  { id: "2", solicitacao: "SOL-2024-148", valor: 8200, acao: "Aprovado", por: "Você", data: "2024-12-14 10:15" },
  { id: "3", solicitacao: "SOL-2024-145", valor: 3500, acao: "Rejeitado", por: "Você", data: "2024-12-13 16:45" },
  { id: "4", solicitacao: "SOL-2024-142", valor: 45000, acao: "Escalado", por: "Sistema", data: "2024-12-12 09:00" },
];

export const approvalStats = {
  pendentes: 3,
  aprovadasMes: 28,
  rejeitadasMes: 2,
  tempoMedioAprovacao: "4.2h",
  escalacoesMes: 1,
};

export const approvalTrendData: ApprovalTrendItem[] = [
  { mes: "Jul", aprovadas: 22, rejeitadas: 3, pendentes: 2, tempoMedio: 5.2 },
  { mes: "Ago", aprovadas: 25, rejeitadas: 2, pendentes: 4, tempoMedio: 4.8 },
  { mes: "Set", aprovadas: 18, rejeitadas: 4, pendentes: 1, tempoMedio: 6.1 },
  { mes: "Out", aprovadas: 30, rejeitadas: 1, pendentes: 3, tempoMedio: 3.9 },
  { mes: "Nov", aprovadas: 26, rejeitadas: 3, pendentes: 2, tempoMedio: 4.5 },
  { mes: "Dez", aprovadas: 28, rejeitadas: 2, pendentes: 3, tempoMedio: 4.2 },
];

export const approvalByValueRange: ApprovalByValueRangeItem[] = [
  { faixa: "< R$5K", quantidade: 45, tempoMedio: 2.1 },
  { faixa: "R$5K-10K", quantidade: 32, tempoMedio: 3.5 },
  { faixa: "R$10K-25K", quantidade: 18, tempoMedio: 5.8 },
  { faixa: "R$25K-50K", quantidade: 8, tempoMedio: 12.4 },
  { faixa: "> R$50K", quantidade: 3, tempoMedio: 24.0 },
];

export const approvalByApprover: ApprovalByApproverItem[] = [
  { nome: "Carlos Diretor", aprovadas: 45, rejeitadas: 3, tempoMedio: 3.2 },
  { nome: "Ana Coordenadora", aprovadas: 38, rejeitadas: 5, tempoMedio: 4.5 },
  { nome: "Roberto Gerente", aprovadas: 28, rejeitadas: 2, tempoMedio: 5.1 },
  { nome: "Maria Supervisora", aprovadas: 22, rejeitadas: 4, tempoMedio: 6.8 },
];

export const bottleneckData: BottleneckItem[] = [
  { etapa: "Aguardando Aprovador", tempo: 2.8, percentual: 42 },
  { etapa: "Em Análise", tempo: 1.2, percentual: 18 },
  { etapa: "Aguardando Documentos", tempo: 1.8, percentual: 27 },
  { etapa: "Revisão Final", tempo: 0.9, percentual: 13 },
];

export const statusDistribution: StatusDistributionItem[] = [
  { name: "Aprovadas", value: 149, color: "#10b981" },
  { name: "Rejeitadas", value: 15, color: "#ef4444" },
  { name: "Pendentes", value: 3, color: "#f59e0b" },
  { name: "Escaladas", value: 5, color: "#8b5cf6" },
];

export const weeklyTrend: WeeklyTrendItem[] = [
  { dia: "Seg", quantidade: 8, tempoMedio: 3.5 },
  { dia: "Ter", quantidade: 12, tempoMedio: 4.2 },
  { dia: "Qua", quantidade: 10, tempoMedio: 3.8 },
  { dia: "Qui", quantidade: 9, tempoMedio: 4.5 },
  { dia: "Sex", quantidade: 6, tempoMedio: 5.2 },
];

export const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#8b5cf6'];
