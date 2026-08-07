import { describe, it, expect } from 'vitest';
import { statusConfig, documentTypeConfig, mockSignatureRequests } from '../signatureHelpers';

vi.mock('lucide-react', () => ({
  Pen: {},
  Check: {},
  X: {},
  Calendar: {},
}));

// ─── statusConfig ─────────────────────────────────────────────────────────────

describe('statusConfig', () => {
  const statuses = ['pending', 'signed', 'rejected', 'expired'] as const;

  it('has entries for all 4 statuses', () => {
    statuses.forEach(s => {
      expect(statusConfig).toHaveProperty(s);
    });
  });

  it('each entry has label, color, and icon', () => {
    statuses.forEach(s => {
      expect(typeof statusConfig[s].label).toBe('string');
      expect(typeof statusConfig[s].color).toBe('string');
      expect(statusConfig[s].icon).toBeTruthy();
    });
  });

  it('pending label is "Pendente"', () => {
    expect(statusConfig.pending.label).toBe('Pendente');
  });

  it('signed label is "Assinado"', () => {
    expect(statusConfig.signed.label).toBe('Assinado');
  });

  it('rejected label is "Rejeitado"', () => {
    expect(statusConfig.rejected.label).toBe('Rejeitado');
  });

  it('expired label is "Expirado"', () => {
    expect(statusConfig.expired.label).toBe('Expirado');
  });

  it('pending color contains warning', () => {
    expect(statusConfig.pending.color).toContain('warning');
  });

  it('signed color contains success', () => {
    expect(statusConfig.signed.color).toContain('success');
  });

  it('rejected color contains destructive', () => {
    expect(statusConfig.rejected.color).toContain('destructive');
  });
});

// ─── documentTypeConfig ───────────────────────────────────────────────────────

describe('documentTypeConfig', () => {
  const types = ['contract', 'order', 'quote', 'other'] as const;

  it('has entries for all 4 document types', () => {
    types.forEach(t => {
      expect(documentTypeConfig).toHaveProperty(t);
    });
  });

  it('each entry has label and color', () => {
    types.forEach(t => {
      expect(typeof documentTypeConfig[t].label).toBe('string');
      expect(typeof documentTypeConfig[t].color).toBe('string');
    });
  });

  it('contract label is "Contrato"', () => {
    expect(documentTypeConfig.contract.label).toBe('Contrato');
  });

  it('order label is "Pedido"', () => {
    expect(documentTypeConfig.order.label).toBe('Pedido');
  });

  it('quote label is "Cotação"', () => {
    expect(documentTypeConfig.quote.label).toBe('Cotação');
  });

  it('other label is "Outro"', () => {
    expect(documentTypeConfig.other.label).toBe('Outro');
  });
});

// ─── mockSignatureRequests ────────────────────────────────────────────────────

describe('mockSignatureRequests', () => {
  it('has 3 mock requests', () => {
    expect(mockSignatureRequests).toHaveLength(3);
  });

  it('each request has required fields', () => {
    mockSignatureRequests.forEach(r => {
      expect(typeof r.id).toBe('string');
      expect(typeof r.documentName).toBe('string');
      expect(['contract', 'order', 'quote', 'other']).toContain(r.documentType);
      expect(['pending', 'signed', 'rejected', 'expired']).toContain(r.status);
      expect(typeof r.requestedBy).toBe('string');
      expect(typeof r.requestedAt).toBe('string');
      expect(typeof r.expiresAt).toBe('string');
    });
  });

  it('first request is pending', () => {
    expect(mockSignatureRequests[0].status).toBe('pending');
  });

  it('second request is signed and has signerName', () => {
    expect(mockSignatureRequests[1].status).toBe('signed');
    expect(mockSignatureRequests[1].signerName).toBeTruthy();
  });

  it('third request is rejected', () => {
    expect(mockSignatureRequests[2].status).toBe('rejected');
  });

  it('signed request has signedAt timestamp', () => {
    const signed = mockSignatureRequests.find(r => r.status === 'signed');
    expect(signed?.signedAt).toBeTruthy();
  });
});
