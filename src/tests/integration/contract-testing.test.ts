import { describe, it, expect } from 'vitest';
import { NegotiationContract } from '../../../supabase/functions/_shared/contracts';

/**
 * Suite de Testes de Contrato - Edge Functions
 * Importa o contrato REAL das edges (supabase/functions/_shared/contracts.ts) em vez
 * do espelho ./shared-schemas, que era a terceira copia dos schemas no repo e ja
 * divergia do contrato de producao.
 */

// O contrato real carrega zod por um import Deno marcado com @ts-ignore, entao o
// tipo de `error` chega como any: anotamos o parametro para nao cair em implicit any.
type ContractIssue = { path: (string | number)[] };

const UUID_SOLICITACAO = '550e8400-e29b-41d4-a716-446655440000';

describe('Edge Function Contract Validation', () => {
  it('should validate a correct negotiation payload', () => {
    const validPayload = {
      cotacoes: [{ id: '550e8400-e29b-41d4-a716-446655440000', fornecedor: 'Test', total: 100 }],
      solicitacao: { id: UUID_SOLICITACAO, titulo: 'Project Alpha' }
    };
    expect(NegotiationContract.safeParse(validPayload).success).toBe(true);
  });

  it('should reject negotiation payload without cotacoes', () => {
    const incompletePayload = {
      cotacoes: [],
      solicitacao: { id: UUID_SOLICITACAO, titulo: 'Project Alpha' }
    };
    expect(NegotiationContract.safeParse(incompletePayload).success).toBe(false);
  });

  it('should reject solicitacao with a malformed UUID', () => {
    const invalidPayload = {
      cotacoes: [{ id: '550e8400-e29b-41d4-a716-446655440000', fornecedor: 'Test', total: 100 }],
      solicitacao: { id: 'not-a-uuid', titulo: 'Project Alpha' }
    };
    const result = NegotiationContract.safeParse(invalidPayload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue: ContractIssue) => issue.path.join('.') === 'solicitacao.id')).toBe(true);
    }
  });

  // Caracterizacao do contrato real, nao um elogio: com `cotacoes: z.array(z.any())`
  // a edge aceita qualquer conteudo na cotacao. O espelho antigo afirmava rejeitar
  // UUID invalido dentro da cotacao e dava falsa seguranca ao chamador. Se o contrato
  // real ganhar essa validacao, este teste falha de proposito para o achado ser revisto.
  it('documents that a malformed UUID inside cotacoes is not rejected', () => {
    const payload = {
      cotacoes: [{ id: 'not-a-uuid', fornecedor: 'Test', total: 100 }],
      solicitacao: { id: UUID_SOLICITACAO, titulo: 'Project Alpha' }
    };
    expect(NegotiationContract.safeParse(payload).success).toBe(true);
  });
});