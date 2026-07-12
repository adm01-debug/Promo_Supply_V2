// @ts-ignore - Deno remote import
import { z } from "https://esm.sh/zod@3.22.4";

// Contract definitions for core Edge Functions
export const NegotiationContract = z.object({
  cotacoes: z.array(z.any()).min(1, "É necessário pelo menos uma cotação para análise"),
  solicitacao: z.object({
    id: z.string().uuid(),
    titulo: z.string(),
    valor_estimado: z.number().optional().nullable(),
    quantidade: z.number().optional().nullable(),
  }),
  historico_precos: z.array(z.any()).optional().nullable(),
});

// Helper: normaliza string enum case-insensitive
const ciEnum = <T extends [string, ...string[]]>(values: T) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.toLowerCase().trim() : v),
    z.enum(values)
  );

export const WorkflowContract = z.discriminatedUnion("action", [
  z.object({
    action: z.literal('start_workflow'),
    template_id: z.string().uuid(),
    entity_type: z.string(),
    entity_id: z.string().uuid(),
  }),
  z.object({
    action: z.literal('approve_step'),
    instance_id: z.string().uuid(),
    node_id: z.string().uuid(),
    approver_id: z.string().uuid(),
    comment: z.string().max(1000).optional()
  }),
  z.object({
    action: z.literal('submit_decision'),
    instance_id: z.string().uuid(),
    node_id: z.string().uuid(),
    decision: ciEnum(['approve', 'reject']),
    approver_id: z.string().uuid(),
    comment: z.string().max(1000).optional()
  })
]);


export const ERPSyncContract = z.object({
  action: ciEnum(['push', 'pull', 'sync_po', 'sync_supplier', 'sync_invoice']),
  connectionId: z.string().uuid(),
  entity: z.string(),
  po_number: z.string().optional(),
  external_id: z.string().optional(),
  source: z.string().optional()
});

export const FiscalContract = z.object({
  action: ciEnum(["send", "cancel", "query", "manifest"]),
  // NFe/NFSe/CTe/MDFe são siglas com case fixo — mantemos preprocess p/ uppercase
  type: z.preprocess(
    (v) => (typeof v === "string" ? v.toUpperCase().trim() : v),
    z.enum(["NFE", "NFSE", "CTE", "MDFE"]).transform((v) => {
      const map: Record<string, string> = { NFE: "NFe", NFSE: "NFSe", CTE: "CTe", MDFE: "MDFe" };
      return map[v] as "NFe" | "NFSe" | "CTe" | "MDFe";
    })
  ),
  document_id: z.string().uuid().optional(),
  payload: z.record(z.any()).optional(),
});

export const TelemetryContract = z.object({
  // Aceita variações (ERROR/WARNING/etc.) e normaliza para o enum log_level
  level: z.preprocess((v) => {
    const s = String(v ?? "info").toLowerCase().trim();
    if (s === "warning") return "warn";
    return ["info", "warn", "error", "debug"].includes(s) ? s : "info";
  }, z.enum(["info", "warn", "error", "debug"])),
  message: z.string(),
  context: z.record(z.any()).optional(),
  requestId: z.string().optional(),
  tenantId: z.string().uuid().optional(),
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

export const SpotProxyContract = z.object({
  action: ciEnum(["create_session", "sync_pedidos", "verify_callback"]),
  session_id: z.string().uuid().optional(),
  payload: z.any().optional()
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
  "ai-supplier-suggestion": SupplierSuggestionContract,
  "spot-proxy": SpotProxyContract
};


/**
 * Mapping of functions to accessed tables for audit.
 * Used for automated permission validation.
 */
export const FunctionTableAudit: Record<string, string[]> = {
  "workflow-engine": ["workflow_instances", "workflow_nodes", "workflow_logs", "workflow_edges", "workflow_approvals"],
  "check-sla-alerts": ["notifications", "pedidos", "solicitacoes", "pagamentos", "user_roles"],
  "check-cotacao-followup": ["notifications", "cotacoes", "profiles"],
  "check-expiry-alerts": ["notifications", "cotacoes", "pagamentos", "user_roles"],
  "check-approval-escalations": ["approval_steps", "approval_workflows", "approval_history", "notifications"],
  "send-push-notification": ["push_subscriptions", "notifications"],
  "spot-proxy": ["spot_sessions", "spot_pedidos", "user_roles"],
  "weekly-report": ["solicitacoes", "pedidos", "pagamentos", "cotacoes", "notifications", "user_roles"],
  "weekly-summary-report": ["solicitacoes", "pedidos", "cotacoes", "user_roles", "notifications"],
  "ai-negotiation": ["solicitacoes", "cotacoes"],
  "erp-sync": ["erp_connections", "erp_sync_log"],
  "fiscal-orchestrator": ["user_tenants", "fiscal_events"],
  "generate-contract-pdf": ["contracts", "contract_items", "contract_penalties"],
  "guided-buying-ai": ["produtos", "fornecedores"],
  "process-invoice-idp": ["fiscal-documents"],
  "punchout-receive": ["punchout_sessions", "solicitacoes"],
  "punchout-setup": ["punchout_catalogs", "punchout_sessions"],
  "dependency-health": ["dependency_health", "dependency_health_history", "audit_logs"],
  "ai-demand-prediction": ["telemetry_logs"],
  "ai-supplier-risk": ["telemetry_logs"],
  "ai-supplier-suggestion": ["telemetry_logs"]
};

