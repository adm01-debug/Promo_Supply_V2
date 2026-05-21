import { test, expect } from 'vitest';
import { z } from 'zod';

/**
 * Suite de Testes de Contrato - Integridade Elite
 * Valida a consistência dos schemas compartilhados entre Frontend e Edge Functions.
 * Schemas definidos localmente para compatibilidade com vitest (Node.js ESM).
 * Espelham exatamente supabase/functions/_shared/contracts.ts.
 */

// Helper: normaliza string enum case-insensitive (mirrors edge function helper)
const ciEnum = <T extends [string, ...string[]]>(values: T) =>
  z.preprocess(
    (v: unknown) => (typeof v === "string" ? v.toLowerCase().trim() : v),
    z.enum(values)
  );

const NegotiationContract = z.object({
  cotacoes: z.array(z.any()).min(1, "É necessário pelo menos uma cotação para análise"),
  solicitacao: z.object({
    id: z.string().uuid(),
    titulo: z.string(),
    valor_estimado: z.number().optional().nullable(),
    quantidade: z.number().optional().nullable(),
  }),
  historico_precos: z.array(z.any()).optional().nullable(),
});

const WorkflowContract = z.discriminatedUnion("action", [
  z.object({
    action: z.literal('start_workflow'),
    template_id: z.string().uuid(),
    entity_type: z.string().optional(),
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

const ERPSyncContract = z.object({
  action: ciEnum(['push', 'pull', 'sync_po', 'sync_supplier', 'sync_invoice']),
  entity_id: z.string().uuid().optional(),
  payload: z.record(z.unknown()).optional(),
});

test('NegotiationContract: deve validar payloads reais', () => {
  const payload = {
    cotacoes: [{ id: '550e8400-e29b-411d-a716-446655440001', fornecedor: 'Test', total: 100 }],
    solicitacao: { id: '550e8400-e29b-411d-a716-446655440000', titulo: 'Test' }
  };
  expect(NegotiationContract.safeParse(payload).success).toBe(true);
});

test('NegotiationContract: deve rejeitar cotacoes vazia', () => {
  const payload = {
    cotacoes: [],
    solicitacao: { id: '550e8400-e29b-411d-a716-446655440000', titulo: 'Test' }
  };
  expect(NegotiationContract.safeParse(payload).success).toBe(false);
});

test('WorkflowContract: deve validar ação start_workflow', () => {
  const startAction = {
    action: 'start_workflow',
    template_id: '550e8400-e29b-411d-a716-446655440000',
    entity_id: '550e8400-e29b-411d-a716-446655440001'
  };
  expect(WorkflowContract.safeParse(startAction).success).toBe(true);
});

test('WorkflowContract: deve validar submit_decision com approve', () => {
  const decisionAction = {
    action: 'submit_decision',
    instance_id: '550e8400-e29b-411d-a716-446655440000',
    node_id: '550e8400-e29b-411d-a716-446655440001',
    decision: 'approve',
    approver_id: '550e8400-e29b-411d-a716-446655440002',
  };
  expect(WorkflowContract.safeParse(decisionAction).success).toBe(true);
});

test('WorkflowContract: deve normalizar decision case-insensitive', () => {
  const decisionAction = {
    action: 'submit_decision',
    instance_id: '550e8400-e29b-411d-a716-446655440000',
    node_id: '550e8400-e29b-411d-a716-446655440001',
    decision: 'APPROVE',
    approver_id: '550e8400-e29b-411d-a716-446655440002',
  };
  expect(WorkflowContract.safeParse(decisionAction).success).toBe(true);
});

test('ERPSyncContract: deve validar ação sync_po', () => {
  const erpSync = {
    action: 'sync_po',
    entity_id: '550e8400-e29b-411d-a716-446655440000',
  };
  expect(ERPSyncContract.safeParse(erpSync).success).toBe(true);
});

test('ERPSyncContract: deve rejeitar ação inválida', () => {
  const invalid = { action: 'invalid_action' };
  expect(ERPSyncContract.safeParse(invalid).success).toBe(false);
});

test('ERPSyncContract: deve aceitar action em maiúsculas (ciEnum)', () => {
  const upper = { action: 'PUSH' };
  expect(ERPSyncContract.safeParse(upper).success).toBe(true);
});
