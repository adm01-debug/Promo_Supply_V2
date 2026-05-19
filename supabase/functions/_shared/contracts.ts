import { z } from "https://esm.sh/zod@3.22.4";

// Contract definitions for core Edge Functions
export const NegotiationContract = z.object({
  cotacoes: z.array(z.object({
    id: z.string().uuid(),
    fornecedor: z.string(),
    total: z.number().positive()
  })),
  solicitacao: z.object({
    id: z.string().uuid(),
    titulo: z.string().min(3)
  })
});

export const WorkflowContract = z.object({
  action: z.enum(['start_workflow', 'approve_step', 'submit_decision']),
  tenant_id: z.string().uuid().optional(),
  entity_id: z.string().uuid().optional(),
  instance_id: z.string().uuid().optional(),
  node_id: z.string().uuid().optional(),
  decision: z.enum(['approve', 'reject']).optional(),
  comment: z.string().optional()
});

export const ERPSyncContract = z.object({
  operation: z.enum(['sync_po', 'sync_supplier', 'sync_invoice']),
  po_number: z.string().optional(),
  external_id: z.string().optional(),
  source: z.string()
});

export class ContractValidator {
  static validate(schema: z.ZodSchema, payload: any) {
    const result = schema.safeParse(payload);
    if (!result.success) {
      return {
        isValid: false,
        errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return { isValid: true, data: result.data };
  }
}
