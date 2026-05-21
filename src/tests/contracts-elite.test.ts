import { test, expect } from 'vitest';
import { NegotiationContract, WorkflowContract, ERPSyncContract } from '../../supabase/functions/_shared/contracts.ts';

/**
 * Suite de Testes de Contrato - Integridade 10/10
 * Valida a consistência dos schemas compartilhados entre Frontend e Edge Functions.
 */

test('NegotiationContract: deve validar payloads reais', () => {
  const payload = {
    cotacoes: [{ id: '550e8400-e29b-411d-a716-446655440001', fornecedor: 'Test', total: 100 }],
    solicitacao: { id: '550e8400-e29b-411d-a716-446655440000', titulo: 'Test' }
  };
  expect(NegotiationContract.safeParse(payload).success).toBe(true);
});

test('WorkflowContract: deve validar ações de início e decisão', () => {
  const startAction = {
    action: 'start_workflow',
    template_id: '550e8400-e29b-411d-a716-446655440000',
    entity_id: '550e8400-e29b-411d-a716-446655440000'
  };
  expect(WorkflowContract.safeParse(startAction).success).toBe(true);

  const decisionAction = {
    action: 'submit_decision',
    instance_id: '550e8400-e29b-411d-a716-446655440000',
    node_id: '550e8400-e29b-411d-a716-446655440000',
    decision: 'approve'
  };
  expect(WorkflowContract.safeParse(decisionAction).success).toBe(true);
});

test('ERPSyncContract: deve validar campos obrigatórios de sincronização', () => {
  const sapSync = { operation: 'sync_po', po_number: 'PO-123', source: 'sap' };
  expect(ERPSyncContract.safeParse(sapSync).success).toBe(true);

  const invalidSource = { operation: 'sync_po', po_number: 'PO-123', source: 'invalid' };
  expect(ERPSyncContract.safeParse(invalidSource).success).toBe(false);
});
