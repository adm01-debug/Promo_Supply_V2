import { supabase } from '@/integrations/supabase/client';
import { AuditLogEntry, AuditLog } from './auditTypes';

/**
 * Log an action to the audit trail
 */
export const logAuditAction = async (entry: AuditLogEntry): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // For systems where profile might have a name
    const { data: profile } = user ? await supabase.from('profiles').select('nome_completo').eq('id', user.id).single() : { data: null };

    const insertData = {
      user_id: user?.id || null,
      user_email: user?.email || 'sistema@promo.supply',
      user_name: profile?.nome_completo || 'Sistema',
      action_type: entry.action_type,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id || null,
      entity_description: entry.entity_description || null,
      old_values: entry.old_values || null,
      new_values: entry.new_values || null,
      metadata: entry.metadata || {},
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
    };

    const { error } = await supabase
      .from('audit_logs')
      .insert([insertData]);

    if (error) console.error('Erro ao registrar auditoria:', error);
  } catch (err) {
    console.error('Erro fatal ao registrar auditoria:', err);
  }
};

/**
 * Helper to create audit log for common actions
 */
export const auditHelpers = {
  logCreate: (entityType: any, entityId: string, description: string, newValues?: any) =>
    logAuditAction({ action_type: 'create', entity_type: entityType, entity_id: entityId, entity_description: description, new_values: newValues }),
  
  logUpdate: (entityType: any, entityId: string, description: string, oldValues?: any, newValues?: any) =>
    logAuditAction({ action_type: 'update', entity_type: entityType, entity_id: entityId, entity_description: description, old_values: oldValues, new_values: newValues }),
  
  logDelete: (entityType: any, entityId: string, description: string, oldValues?: any) =>
    logAuditAction({ action_type: 'delete', entity_type: entityType, entity_id: entityId, entity_description: description, old_values: oldValues }),
  
  logApprove: (entityType: any, entityId: string, description: string, metadata?: any) =>
    logAuditAction({ action_type: 'approve', entity_type: entityType, entity_id: entityId, entity_description: description, metadata }),
  
  logReject: (entityType: any, entityId: string, description: string, metadata?: any) =>
    logAuditAction({ action_type: 'reject', entity_type: entityType, entity_id: entityId, entity_description: description, metadata }),

  logView: (entityType: any, entityId: string, description: string) =>
    logAuditAction({ action_type: 'view', entity_type: entityType, entity_id: entityId, entity_description: description }),
};
