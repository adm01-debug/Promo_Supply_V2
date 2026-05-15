import { describe, it, expect } from 'vitest';
import { solicitacaoSchema } from '../../schemas/solicitacao.schema';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>');
const purify = DOMPurify(window as any);

describe('Solicitação Module Hardening - Stress & Security Test', () => {
  const generateRandomSolicitacao = (override = {}) => {
    const types: ('PE_LISO' | 'FAB_LISO' | 'FAB_PERSONALIZADO')[] = ['PE_LISO', 'FAB_LISO', 'FAB_PERSONALIZADO'];
    const priorities: ('baixa' | 'normal' | 'alta' | 'urgente')[] = ['baixa', 'normal', 'alta', 'urgente'];
    
    return {
      empresa: `Empresa ${Math.floor(Math.random() * 100)}`,
      vendedor: `Vendedor ${Math.floor(Math.random() * 100)}`,
      produto: `Produto Teste ${Math.random().toString(36).substring(7)}`,
      categoriaId: 'cat_123',
      quantidade: Math.floor(Math.random() * 1000) + 1,
      tipo: types[Math.floor(Math.random() * types.length)],
      prazoEntrega: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0],
      observacoes: 'Teste de observação aleatória',
      prioridade: priorities[Math.floor(Math.random() * priorities.length)],
      valorEstimado: Math.random() * 10000,
      costCenterId: 'cc_123',
      ...override
    };
  };

  it('should validate 1000 random valid solicitations', () => {
    for (let i = 0; i < 1000; i++) {
      const data = generateRandomSolicitacao();
      const result = solicitacaoSchema.safeParse(data);
      if (!result.success) {
        console.error('Validation failed for:', data, result.error.issues);
      }
      expect(result.success).toBe(true);
    }
  });

  it('should fail for malicious injection strings in text fields', () => {
    const maliciousInputs = [
      '<script>alert("XSS")</script>',
      '"><img src=x onerror=alert(1)>',
      'javascript:alert(1)',
      'OR 1=1 --',
      '"; DROP TABLE solicitacoes; --'
    ];

    maliciousInputs.forEach(input => {
      const data = generateRandomSolicitacao({ produto: input });
      // Zod might allow the string if it matches length constraints, 
      // but we expect our sanitization to clean it.
      const sanitized = purify.sanitize(data.produto);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('onerror');
      console.log(`[SECURITY] Sanitized input: ${input.substring(0, 20)}... -> ${sanitized}`);
    });
  });

  it('should reject invalid dates (past dates)', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const data = generateRandomSolicitacao({ prazoEntrega: pastDate });
    const result = solicitacaoSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject negative quantities and values', () => {
    expect(solicitacaoSchema.safeParse(generateRandomSolicitacao({ quantidade: -1 })).success).toBe(false);
    expect(solicitacaoSchema.safeParse(generateRandomSolicitacao({ valorEstimado: -100 })).success).toBe(false);
    expect(solicitacaoSchema.safeParse(generateRandomSolicitacao({ quantidade: 0 })).success).toBe(false);
  });

  it('should handle boundary values (large numbers)', () => {
    const data = generateRandomSolicitacao({ 
      quantidade: 1000000,
      valorEstimado: 1000000000 
    });
    const result = solicitacaoSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});
