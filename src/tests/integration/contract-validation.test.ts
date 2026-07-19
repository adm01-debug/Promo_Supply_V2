import { describe, it, expect } from 'vitest';
import { NegotiationSchema as NegotiationContract, WorkflowSchema as WorkflowContract } from './shared-schemas';

describe('Edge Function Contract Tests', () => {
  describe('Negotiation Workflow', () => {
    it('should pass with valid data', () => {
      const payload = {
        cotacoes: [{ id: '550e8400-e29b-41d4-a716-446655440000', fornecedor: 'AluTech', total: 1500.50 }],
        solicitacao: { id: '550e8400-e29b-41d4-a716-446655440001', titulo: 'Aluminum Mugs Order' }
      };
      expect(NegotiationContract.safeParse(payload).success).toBe(true);
    });

    it('should fail with invalid currency (negative total)', () => {
      const payload = {
        cotacoes: [{ id: '550e8400-e29b-41d4-a716-446655440000', fornecedor: 'AluTech', total: -10 }],
        solicitacao: { id: '550e8400-e29b-41d4-a716-446655440001', titulo: 'Invalid' }
      };
      expect(NegotiationContract.safeParse(payload).success).toBe(false);
    });

    it('should fail with malformed UUID', () => {
      const payload = {
        cotacoes: [{ id: 'invalid-uuid', fornecedor: 'AluTech', total: 100 }],
        solicitacao: { id: '550e8400-e29b-41d4-a716-446655440001', titulo: 'Invalid' }
      };
      expect(NegotiationContract.safeParse(payload).success).toBe(false);
    });
  });

  describe('Workflow Engine', () => {
    it('should accept valid actions', () => {
      expect(WorkflowContract.safeParse({ action: 'start_workflow' }).success).toBe(true);
    });

    it('should reject unsupported actions', () => {
      expect(WorkflowContract.safeParse({ action: 'delete_everything' }).success).toBe(false);
    });
  });
});
