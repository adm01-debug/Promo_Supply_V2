import { test, expect } from 'vitest';
import {
  NegotiationContract,
  WorkflowContract,
  ERPSyncContract,
} from '../../supabase/functions/_shared/contracts';

/**
 * Suite de Testes de Contrato - Integridade Elite
 * Importa o contrato REAL usado pelas edges (supabase/functions/_shared/contracts.ts)
 * em vez de redeclarar um espelho local. O espelho que existia aqui divergiu em
 * silencio do contrato de producao (entity_type opcional contra obrigatorio,
 * ERPSyncContract com entity_id/payload contra connectionId/entity) e chegou a
 * afirmar `.success === true` para payloads que a edge deployada rejeita.
 * O import Deno (https://esm.sh/zod@3.22.4) e resolvido pelo alias em vitest.config.ts.
 */

// O contrato real carrega zod por um import Deno marcado com @ts-ignore, entao o
// tipo de `error` chega como any: anotamos o parametro para nao cair em implicit any.
type ContractIssue = { path: (string | number)[] };

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
    entity_type: 'pedido',
    entity_id: '550e8400-e29b-411d-a716-446655440001'
  };
  expect(WorkflowContract.safeParse(startAction).success).toBe(true);
});

test('WorkflowContract: deve exigir entity_type em start_workflow', () => {
  const semEntityType = {
    action: 'start_workflow',
    template_id: '550e8400-e29b-411d-a716-446655440000',
    entity_id: '550e8400-e29b-411d-a716-446655440001'
  };
  const result = WorkflowContract.safeParse(semEntityType);
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues.some((i: ContractIssue) => i.path.includes('entity_type'))).toBe(true);
  }
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

test('WorkflowContract: deve aceitar submit_decision sem approver_id (QA-022)', () => {
  const decisionAction = {
    action: 'submit_decision',
    instance_id: '550e8400-e29b-411d-a716-446655440000',
    node_id: '550e8400-e29b-411d-a716-446655440001',
    decision: 'reject',
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
    connectionId: '550e8400-e29b-411d-a716-446655440000',
    entity: 'purchase_order',
    po_number: 'PO-123',
  };
  expect(ERPSyncContract.safeParse(erpSync).success).toBe(true);
});

test('ERPSyncContract: deve exigir connectionId e entity', () => {
  const semConexao = { action: 'sync_po', entity_id: '550e8400-e29b-411d-a716-446655440000' };
  const result = ERPSyncContract.safeParse(semConexao);
  expect(result.success).toBe(false);
  if (!result.success) {
    const faltando = result.error.issues.map((i: ContractIssue) => i.path[0]);
    expect(faltando).toContain('connectionId');
    expect(faltando).toContain('entity');
  }
});

test('ERPSyncContract: deve rejeitar ação inválida', () => {
  const invalid = {
    action: 'invalid_action',
    connectionId: '550e8400-e29b-411d-a716-446655440000',
    entity: 'purchase_order',
  };
  expect(ERPSyncContract.safeParse(invalid).success).toBe(false);
});

test('ERPSyncContract: deve aceitar action em maiúsculas (ciEnum)', () => {
  const upper = {
    action: 'PUSH',
    connectionId: '550e8400-e29b-411d-a716-446655440000',
    entity: 'purchase_order',
  };
  expect(ERPSyncContract.safeParse(upper).success).toBe(true);
});