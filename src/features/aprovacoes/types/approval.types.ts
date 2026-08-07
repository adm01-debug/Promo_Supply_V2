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
