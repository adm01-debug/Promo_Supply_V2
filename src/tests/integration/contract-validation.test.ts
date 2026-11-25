import { describe, it, expect } from 'vitest';
import {
  NegotiationContract,
  WorkflowContract,
} from '../../../supabase/functions/_shared/contracts';

/**
 * Suite de Testes de Contrato - Edge Functions
 * Importa o contrato REAL usado pelas edges (supabase/functions/_shared/contracts.ts).
 * Antes importava ./shared-schemas, uma terceira copia dos schemas que ja tinha
 * divergido: o espelho validava o interior da cotacao (total positivo, UUID) e o
 * WorkflowSchema era um z.object plano com tudo opcional, enquanto o real e um
 * z.discriminatedUnion com campos obrigatorios por acao.
 * O import Deno (https://esm.sh/zod@3.22.4) e resolvido pelo alias em vitest.config.ts.
 */

// O contrato real carrega zod por um import Deno marcado com @ts-ignore, entao o
// tipo de `error` chega como any: anotamos o parametro para nao cair em implicit any.
type ContractIssue = { path: (string | number)[] };

const UUID_COTACAO = '550e8400-e29b-41d4-a716-446655440000';
const UUID_SOLICITACAO = '550e8400-e29b-41d4-a716-446655440001';

describe('Edge Function Contract Tests', () => {
  describe('Negotiation Workflow', () => {
    it('should pass with valid data', () => {
      const payload = {
        cotacoes: [{ id: UUID_COTACAO, fornecedor: 'AluTech', total: 1500.50 }],
        solicitacao: { id: UUID_SOLICITACAO, titulo: 'Aluminum Mugs Order' }
      };
      expect(NegotiationContract.safeParse(payload).success).toBe(true);
    });

    it('should reject payload without cotacoes', () => {
      const payload = {
        cotacoes: [],
        solicitacao: { id: UUID_SOLICITACAO, titulo: 'Aluminum Mugs Order' }
      };
      const result = NegotiationContract.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i: ContractIssue) => i.path.includes('cotacoes'))).toBe(true);
      }
    });

    it('should reject solicitacao without titulo', () => {
      const payload = {
        cotacoes: [{ id: UUID_COTACAO, fornecedor: 'AluTech', total: 100 }],
        solicitacao: { id: UUID_SOLICITACAO }
      };
      const result = NegotiationContract.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i: ContractIssue) => i.path.join('.') === 'solicitacao.titulo')).toBe(true);
      }
    });

    // Caracterizacao do contrato real, nao um elogio: `cotacoes` e `z.array(z.any())`,
    // entao a edge aceita qualquer conteudo na cotacao (total negativo, UUID invalido).
    // O espelho antigo afirmava validar isso e dava falsa seguranca. Se o contrato real
    // ganhar validacao de cotacao, este teste falha de proposito para o achado ser revisto.
    it('documents that the real contract does not validate cotacao internals', () => {
      const payload = {
        cotacoes: [{ id: 'not-a-uuid', fornecedor: 'AluTech', total: -10 }],
        solicitacao: { id: UUID_SOLICITACAO, titulo: 'Invalid' }
      };
      expect(NegotiationContract.safeParse(payload).success).toBe(true);
    });
  });

  describe('Workflow Engine', () => {
    it('should accept a complete start_workflow action', () => {
      const payload = {
        action: 'start_workflow',
        template_id: UUID_COTACAO,
        entity_type: 'pedido',
        entity_id: UUID_SOLICITACAO,
      };
      expect(WorkflowContract.safeParse(payload).success).toBe(true);
    });

    it('should require template_id, entity_type and entity_id on start_workflow', () => {
      const result = WorkflowContract.safeParse({ action: 'start_workflow' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const faltando = result.error.issues.map((i: ContractIssue) => i.path[0]);
        expect(faltando).toContain('template_id');
        expect(faltando).toContain('entity_type');
        expect(faltando).toContain('entity_id');
      }
    });

    it('should reject unsupported actions', () => {
      expect(WorkflowContract.safeParse({ action: 'delete_everything' }).success).toBe(false);
    });
  });
});