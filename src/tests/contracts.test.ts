import { test, expect } from 'vitest';
import { NegotiationContract } from '../../supabase/functions/_shared/contracts';

/**
 * Suite de Testes de Regressão: Contratos e Validação de Dados
 * Importa o contrato REAL das Edge Functions (supabase/functions/_shared/contracts.ts).
 * Antes este arquivo redeclarava um espelho local do NegotiationContract, o que
 * permitia que o contrato de producao mudasse sem quebrar nenhum teste.
 */

// O contrato real carrega zod por um import Deno marcado com @ts-ignore, entao o
// tipo de `error` chega como any: anotamos o parametro para nao cair em implicit any.
type ContractIssue = { path: (string | number)[] };

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
    cotacoes: [{ id: '1', fornecedor: 'Test', valor: 100 }],
    solicitacao: {
      id: 'invalid-uuid',
      titulo: 'Teste',
    }
  };

  const result = NegotiationContract.safeParse(invalidPayload);
  expect(result.success).toBe(false);
  if (!result.success) {
    const hasIdError = result.error.issues.some((issue: ContractIssue) => issue.path.includes('id'));
    expect(hasIdError).toBe(true);
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

test('NegotiationContract should reject payload without solicitacao', () => {
  const semSolicitacao = {
    cotacoes: [{ id: '550e8400-e29b-411d-a716-446655440001', fornecedor: 'Test', valor: 100 }],
  };

  const result = NegotiationContract.safeParse(semSolicitacao);
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues.some((issue: ContractIssue) => issue.path.includes('solicitacao'))).toBe(true);
  }
});