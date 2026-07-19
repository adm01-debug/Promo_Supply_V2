import { describe, it, expect } from 'vitest';
import { NegotiationSchema } from './shared-schemas';

describe('Edge Function Contract Validation', () => {
  it('should validate a correct negotiation payload', () => {
    const validPayload = {
      cotacoes: [{ id: '550e8400-e29b-41d4-a716-446655440000', fornecedor: 'Test', total: 100 }],
      solicitacao: { id: '550e8400-e29b-41d4-a716-446655440000', titulo: 'Project Alpha' }
    };
    expect(NegotiationSchema.safeParse(validPayload).success).toBe(true);
  });

  it('should reject negotiation payload with invalid UUID', () => {
    const invalidPayload = {
      cotacoes: [{ id: 'not-a-uuid', fornecedor: 'Test', total: 100 }],
      solicitacao: { id: '550e8400-e29b-41d4-a716-446655440000', titulo: 'Project Alpha' }
    };
    const result = NegotiationSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('should reject negotiation payload with missing fields', () => {
    const incompletePayload = {
      cotacoes: [],
      solicitacao: { id: '550e8400-e29b-41d4-a716-446655440000' }
    };
    expect(NegotiationSchema.safeParse(incompletePayload).success).toBe(false);
  });
});
