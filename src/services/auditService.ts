import { supabase } from '@/integrations/supabase/client';
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
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// Action type labels in Portuguese
export const actionTypeLabels: Record<AuditActionType, string> = {
  create: 'Criação',
  update: 'Atualização',
  delete: 'Exclusão',
  view: 'Visualização',
  export: 'Exportação',
  login: 'Login',
  logout: 'Logout',
  approve: 'Aprovação',
  reject: 'Rejeição',
  cancel: 'Cancelamento',
};

// Entity type labels in Portuguese
export const entityTypeLabels: Record<AuditEntityType, string> = {
  solicitacao: 'Solicitação',
  cotacao: 'Cotação',
  pedido: 'Pedido',
  pagamento: 'Pagamento',
  fornecedor: 'Fornecedor',
  usuario: 'Usuário',
  configuracao: 'Configuração',
  relatorio: 'Relatório',
};

// Color scheme for action types
export const actionTypeColors: Record<AuditActionType, string> = {
  create: 'bg-success/10 text-success border-success/20',
  update: 'bg-primary/10 text-primary border-primary/20',
  delete: 'bg-destructive/10 text-destructive border-destructive/20',
  view: 'bg-muted text-muted-foreground border-border',
  export: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  login: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  logout: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  approve: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  reject: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  cancel: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
};

/**
 * Log an action to the audit trail
 */
export const logAuditAction = async (entry: AuditLogEntry): Promise<void> => {
  try {
    // Get current user if authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    // For development/mock phase, use placeholder values
    const userEmail = user?.email || 'sistema@promobrindes.com.br';
    const userName = user?.user_metadata?.["full_name"] || 'Sistema';

    const insertData = {
      user_id: user?.id || null,
      user_email: userEmail,
      user_name: userName,
      action_type: entry.action_type,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id || null,
      entity_description: entry.entity_description || null,
      old_values: (entry.old_values || null) as Json,
      new_values: (entry.new_values || null) as Json,
      metadata: (entry.metadata || null) as Json,
      user_agent: navigator.userAgent,
    };

    const { error } = await supabase
      .from('audit_logs')
      .insert([insertData]);

    if (error) {
      console.error('Erro ao registrar auditoria:', error);
    }
  } catch (err) {
    console.error('Erro ao registrar auditoria:', err);
  }
};


/**
 * Fetch audit logs with optional filters
 */
export const fetchAuditLogs = async (options?: {
  limit?: number;
  offset?: number;
  entity_type?: AuditEntityType;
  action_type?: AuditActionType;
  start_date?: Date;
  end_date?: Date;
  search?: string;
}): Promise<{ data: AuditLog[]; count: number }> => {
  try {
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (options?.entity_type) {
      query = query.eq('entity_type', options.entity_type);
    }

    if (options?.action_type) {
      query = query.eq('action_type', options.action_type);
    }

    if (options?.start_date) {
      query = query.gte('created_at', options.start_date.toISOString());
    }

    if (options?.end_date) {
      query = query.lte('created_at', options.end_date.toISOString());
    }

    if (options?.search) {
      query = query.or(`entity_description.ilike.%${options.search}%,user_email.ilike.%${options.search}%,user_name.ilike.%${options.search}%`);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar logs de auditoria:', error);
      return { data: [], count: 0 };
    }

    return { 
      data: (data as unknown as AuditLog[]) || [], 
      count: count || 0 
    };
  } catch (err) {
    console.error('Erro ao buscar logs de auditoria:', err);
    return { data: [], count: 0 };
  }
};

/**
 * Helper to create audit log for common actions
 */
export const auditHelpers = {
  logCreate: (entityType: AuditEntityType, entityId: string, description: string, newValues?: Record<string, unknown>) =>
    logAuditAction({ action_type: 'create', entity_type: entityType, entity_id: entityId, entity_description: description, new_values: newValues }),
  
  logUpdate: (entityType: AuditEntityType, entityId: string, description: string, oldValues?: Record<string, unknown>, newValues?: Record<string, unknown>) =>
    logAuditAction({ action_type: 'update', entity_type: entityType, entity_id: entityId, entity_description: description, old_values: oldValues, new_values: newValues }),
  
  logDelete: (entityType: AuditEntityType, entityId: string, description: string, oldValues?: Record<string, unknown>) =>
    logAuditAction({ action_type: 'delete', entity_type: entityType, entity_id: entityId, entity_description: description, old_values: oldValues }),
  
  logView: (entityType: AuditEntityType, entityId: string, description: string) =>
    logAuditAction({ action_type: 'view', entity_type: entityType, entity_id: entityId, entity_description: description }),
  
  logExport: (entityType: AuditEntityType, description: string, metadata?: Record<string, unknown>) =>
    logAuditAction({ action_type: 'export', entity_type: entityType, entity_description: description, metadata }),
  
  logApprove: (entityType: AuditEntityType, entityId: string, description: string, metadata?: Record<string, unknown>) =>
    logAuditAction({ action_type: 'approve', entity_type: entityType, entity_id: entityId, entity_description: description, metadata }),
  
  logReject: (entityType: AuditEntityType, entityId: string, description: string, metadata?: Record<string, unknown>) =>
    logAuditAction({ action_type: 'reject', entity_type: entityType, entity_id: entityId, entity_description: description, metadata }),
};
