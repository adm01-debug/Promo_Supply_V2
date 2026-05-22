// @ts-ignore - Deno remote import
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
  template_id: z.string().uuid().optional(),
  entity_type: z.string().optional(),
  entity_id: z.string().uuid().optional(),
  instance_id: z.string().uuid().optional(),
  node_id: z.string().uuid().optional(),
  decision: z.enum(['approve', 'reject']).optional(),
  approver_id: z.string().uuid().optional(),
  comment: z.string().max(1000).optional()
});

export const ERPSyncContract = z.object({
  action: z.enum(['push', 'pull', 'sync_po', 'sync_supplier', 'sync_invoice']),
  connectionId: z.string().uuid(),
  entity: z.string(),
  po_number: z.string().optional(),
  external_id: z.string().optional(),
  source: z.string().optional()
});

export const FiscalContract = z.object({
  action: z.enum(["send", "cancel", "query", "manifest"]),
  type: z.enum(["NFe", "NFSe", "CTe", "MDFe"]),
  document_id: z.string().uuid().optional(),
  payload: z.record(z.any()).optional(),
});

export const TelemetryContract = z.object({
  level: z.enum(["info", "warn", "error", "debug"]),
  message: z.string(),
  context: z.record(z.any()).optional(),
  requestId: z.string().optional(),
  url: z.string().optional(),
  userAgent: z.string().optional(),
});

export const DemandPredictionContract = z.object({
  historicalData: z.array(z.any()),
  category: z.string().optional(),
  timeframe: z.string().optional()
});

export const SupplierSuggestionContract = z.object({
  productDescription: z.string().min(3),
  category: z.string().optional(),
  quantity: z.number().optional().nullable(),
  budget: z.number().optional().nullable(),
  purchaseHistory: z.array(z.any()).optional().nullable(),
  suppliers: z.array(z.any()).optional().nullable()
});

export class ContractValidator {

  static validate(schema: z.ZodSchema, payload: any) {

    const result = schema.safeParse(payload);
    if (!result.success) {
      return {
        isValid: false,
        errors: result.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`)
      };
    }

  static validate(schema: z.ZodSchema, payload: any) {
    const result = schema.safeParse(payload);
    if (!result.success) {
      return {
        isValid: false,
        errors: result.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return { isValid: true, data: result.data };
  }
}

/**
 * Registry of contracts per function name for automated testing/validation.
 */
export const FunctionContracts: Record<string, z.ZodSchema> = {
  "ai-negotiation": NegotiationContract,
  "workflow-engine": WorkflowContract,
  "erp-sync": ERPSyncContract,
  "fiscal-orchestrator": FiscalContract,
  "telemetry": TelemetryContract,
  "ai-demand-prediction": DemandPredictionContract,
  "ai-supplier-suggestion": SupplierSuggestionContract
};

/**
 * Mapping of functions to accessed tables for audit.
 */
export const FunctionTableAudit: Record<string, string[]> = {
  "workflow-engine": ["workflow_instances", "workflow_nodes", "workflow_logs", "workflow_edges", "workflow_approvals"],
  "check-sla-alerts": ["notifications"],
  "check-cotacao-followup": ["notifications"],
  "check-expiry-alerts": ["notifications"],
  "send-push-notification": ["push_subscriptions", "notifications"],
  "spot-proxy": ["spot_sessions", "spot_pedidos"],
  "weekly-report": ["solicitacoes", "pedidos", "pagamentos", "cotacoes", "notifications"],
  "weekly-summary-report": ["notifications"],
  "ai-negotiation": ["solicitacoes", "cotacoes"]
};

