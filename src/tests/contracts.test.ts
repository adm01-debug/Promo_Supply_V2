import { test, expect } from 'vitest';
import { NegotiationContract } from '../supabase/functions/_shared/contracts.ts';

/**
 * Suite de Testes de Regressão: Contratos e Validação de Dados
 * Garante que a integridade dos dados seja mantida entre Frontend e Edge Functions.
 */

test('NegotiationContract should validate correct payloads', () => {
  const validPayload = {
    cotacoes: [
      { id: '1', fornecedor: 'Global Logistics', valor: 1500, prazo: '5 dias' }
    ],
    solicitacao: {
      id: '550e8400-e29b-411d-a716-446655440000',
      titulo: 'Transporte de Carga SP -> RJ',
      valor_estimado: 1800,
      quantidade: 1
    }
  };

  const result = NegotiationContract.safeParse(validPayload);
  expect(result.success).toBe(true);
});

test('NegotiationContract should reject invalid UUIDs', () => {
  const invalidPayload = {
    cotacoes: [],
    solicitacao: {
      id: 'invalid-uuid',
      titulo: 'Teste',
    }
  };

  const result = NegotiationContract.safeParse(invalidPayload);
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues[0].path).toContain('id');
  }
});

test('NegotiationContract should reject empty cotacoes', () => {
  const invalidPayload = {
    cotacoes: [],
    solicitacao: {
      id: '550e8400-e29b-411d-a716-446655440000',
      titulo: 'Teste',
    }
  };

  const result = NegotiationContract.safeParse(invalidPayload);
  expect(result.success).toBe(false);
});
