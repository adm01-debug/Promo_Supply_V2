import type { Json } from '@/integrations/supabase/types';

export type AuditActionType = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'view' 
  | 'export' 
  | 'login' 
  | 'logout' 
  | 'approve' 
  | 'reject' 
  | 'cancel';

export type AuditEntityType = 
  | 'solicitacao' 
  | 'cotacao' 
  | 'pedido' 
  | 'pagamento' 
  | 'fornecedor' 
  | 'usuario' 
  | 'configuracao' 
  | 'relatorio';

export interface AuditLogEntry {
  action_type: AuditActionType;
  entity_type: AuditEntityType;
  entity_id?: string;
  entity_description?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action_type: AuditActionType;
  entity_type: AuditEntityType;
  entity_id: string | null;
  entity_description: string | null;
  old_values: Json | null;
  new_values: Json | null;
  metadata: Json | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}
