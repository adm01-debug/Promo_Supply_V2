import { test, expect } from 'vitest';
import { z } from 'zod';

/**
 * Suite de Testes de Regressão: Contratos e Validação de Dados
 * Valida schemas que espelham os contratos usados nas Edge Functions.
 * Estes schemas são definidos localmente (zod Node.js) para compatibilidade com vitest.
 * Os contratos reais em supabase/functions/_shared/contracts.ts usam import Deno.
 */

// Mirror of NegotiationContract (matches edge function schema)
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
    const hasIdError = result.error.issues.some(issue => issue.path.includes('id'));
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
