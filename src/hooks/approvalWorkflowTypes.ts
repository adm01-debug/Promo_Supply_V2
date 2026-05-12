export interface ApprovalRule {
  id: string;
  nome: string;
  descricao?: string;
  valor_min: number;
  valor_max: number;
  categoria_id?: string;
  cost_center_id?: string;
  aprovadores: Array<{ user_id: string; ordem: number; nome?: string }>;
  tempo_limite_horas: number;
  escalacao_automatica: boolean;
  escalacao_para?: string;
  niveis_aprovacao: number;
  requer_unanimidade: boolean;
  ativo: boolean;
  prioridade: number;
  created_at: string;
  updated_at: string;
}

export interface ApprovalDelegation {
  id: string;
  delegante_id: string;
  delegado_id: string;
  data_inicio: string;
  data_fim: string;
  motivo?: string;
  categorias_permitidas: string[];
  valor_maximo?: number;
  ativo: boolean;
  created_at: string;
  delegante_nome?: string;
  delegado_nome?: string;
}

export interface ApprovalWorkflow {
  id: string;
  solicitacao_id: string;
  rule_id?: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'cancelled';
  etapa_atual: number;
  total_etapas: number;
  valor: number;
  categoria_id?: string;
  prazo_limite?: string;
  escalado_em?: string;
  escalado_para?: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovalStep {
  id: string;
  workflow_id: string;
  etapa: number;
  aprovador_id: string;
  aprovador_efetivo_id?: string;
  delegacao_id?: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  comentario?: string;
  decidido_em?: string;
  prazo_limite?: string;
  notificado_em?: string;
  lembrete_enviado: boolean;
  created_at: string;
  aprovador_nome?: string;
}

export interface ApprovalHistory {
  id: string;
  workflow_id?: string;
  solicitacao_id?: string;
  step_id?: string;
  acao: 'created' | 'approved' | 'rejected' | 'escalated' | 'delegated' | 'reminder_sent' | 'cancelled';
  usuario_id?: string;
  usuario_nome?: string;
  detalhes?: Record<string, unknown>;
  created_at: string;
}
