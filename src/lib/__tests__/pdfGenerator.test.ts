import { describe, it, expect, vi } from 'vitest';

// Mock jsPDF and autotable to avoid canvas/browser dependencies in tests
vi.mock('jspdf', () => {
  const MockJsPDF = vi.fn().mockImplementation(() => ({
    internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
    setFillColor: vi.fn(),
    setTextColor: vi.fn(),
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    rect: vi.fn(),
    text: vi.fn(),
    line: vi.fn(),
    lastAutoTable: { finalY: 120 },
    save: vi.fn(),
    output: vi.fn().mockReturnValue('pdf-data'),
  }));
  return { jsPDF: MockJsPDF };
});

vi.mock('jspdf-autotable', () => ({
  default: vi.fn().mockImplementation((doc) => {
    doc.lastAutoTable = { finalY: 120 };
  }),
}));

vi.mock('@/lib/utils', () => ({
  formatCurrency: (v: number) => `R$ ${v.toFixed(2)}`,
}));

vi.mock('@/types/legacyTypes', () => ({}));

import { generateOrderPDF } from '../pdfGenerator';
import type { OrderPDFData, OrderPDFCompany } from '../pdfGenerator';

// ─── pdfGenerator ─────────────────────────────────────────────────────────────

const validData: OrderPDFData = {
  numero: 'OC-2025-001',
  data: '2025-01-15',
  fornecedor: {
    razao_social: 'Fornecedor Exemplo Ltda',
    cnpj: '12.345.678/0001-99',
    email: 'contato@fornecedor.com',
    telefone: '(11) 99999-9999',
  },
  solicitante: { nome: 'João Silva', email: 'joao@empresa.com' },
  itens: [
    { descricao: 'Caneta Personalizada', quantidade: 100, unidade: 'un', valor_unitario: 2.50 },
    { descricao: 'Bloco de Notas', quantidade: 50, unidade: 'un', valor_unitario: 5.00 },
  ],
  subtotal: 500,
  frete: 30,
  desconto: 20,
  total: 510,
  observacoes: 'Entrega em até 15 dias úteis.',
};

describe('generateOrderPDF', () => {
  it('is a function', () => {
    expect(typeof generateOrderPDF).toBe('function');
  });

  it('returns a jsPDF document instance', () => {
    const doc = generateOrderPDF(validData);
    expect(doc).toBeDefined();
  });

  it('does not throw with valid data', () => {
    expect(() => generateOrderPDF(validData)).not.toThrow();
  });

  it('does not throw when observacoes is omitted', () => {
    const { observacoes: _, ...rest } = validData;
    expect(() => generateOrderPDF(rest as OrderPDFData)).not.toThrow();
  });

  it('does not throw when company is omitted (uses defaults)', () => {
    const { company: _, ...rest } = validData;
    expect(() => generateOrderPDF(rest as OrderPDFData)).not.toThrow();
  });

  it('does not throw when custom company is provided', () => {
    const company: Partial<OrderPDFCompany> = {
      nome: 'Acme Corp',
      endereco: 'Rua Teste, 123',
      footerLabel: 'Acme Corp - Gestão',
    };
    expect(() => generateOrderPDF({ ...validData, company })).not.toThrow();
  });

  it('does not throw when fornecedor fields are missing (partial)', () => {
    expect(() => generateOrderPDF({ ...validData, fornecedor: {} })).not.toThrow();
  });

  it('does not throw when solicitante has only email', () => {
    expect(() => generateOrderPDF({ ...validData, solicitante: { email: 'x@y.com' } })).not.toThrow();
  });

  it('does not throw when itens is empty', () => {
    expect(() => generateOrderPDF({ ...validData, itens: [] })).not.toThrow();
  });

  it('does not throw with zero frete and desconto', () => {
    expect(() => generateOrderPDF({ ...validData, frete: 0, desconto: 0 })).not.toThrow();
  });
});

describe('OrderPDFData interface shape', () => {
  it('validData satisfies required fields', () => {
    expect(typeof validData.numero).toBe('string');
    expect(typeof validData.data).toBe('string');
    expect(typeof validData.subtotal).toBe('number');
    expect(typeof validData.frete).toBe('number');
    expect(typeof validData.desconto).toBe('number');
    expect(typeof validData.total).toBe('number');
    expect(Array.isArray(validData.itens)).toBe(true);
  });

  it('each item has descricao, quantidade, valor_unitario', () => {
    validData.itens.forEach(item => {
      expect(typeof item.descricao).toBe('string');
      expect(typeof item.quantidade).toBe('number');
      expect(typeof item.valor_unitario).toBe('number');
    });
  });
});

describe('generateOrderPDF — return value shape', () => {
  it('returned object has a save method', () => {
    const doc = generateOrderPDF(validData);
    expect(typeof doc.save).toBe('function');
  });

  it('returned object has an output method', () => {
    const doc = generateOrderPDF(validData);
    expect(typeof doc.output).toBe('function');
  });

  it('calling output() returns a value', () => {
    const doc = generateOrderPDF(validData);
    const out = doc.output();
    expect(out).toBeDefined();
  });

  it('does not throw with only 1 item in itens', () => {
    expect(() => generateOrderPDF({
      ...validData,
      itens: [{ descricao: 'Único Item', quantidade: 1, unidade: 'un', valor_unitario: 10 }],
    })).not.toThrow();
  });

  it('does not throw when total is 0', () => {
    expect(() => generateOrderPDF({ ...validData, total: 0, subtotal: 0, frete: 0, desconto: 0 })).not.toThrow();
  });

  it('does not throw with very large values', () => {
    expect(() => generateOrderPDF({
      ...validData,
      subtotal: 9_999_999,
      frete: 999,
      desconto: 100,
      total: 10_000_898,
    })).not.toThrow();
  });
});
