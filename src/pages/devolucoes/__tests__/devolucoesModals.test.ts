import { describe, it, expect, vi } from 'vitest';

vi.mock('@/hooks/useDevolucoes', () => ({}));
vi.mock('@/hooks/useFornecedores', () => ({}));
vi.mock('@/hooks/useFeedback', () => ({ useFeedbackPreferences: { getState: vi.fn(() => ({}) ) } }));
vi.mock('@/lib/feedbackToast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/ui/dialog', () => ({ Dialog: {}, DialogContent: {}, DialogHeader: {}, DialogTitle: {}, DialogFooter: {} }));
vi.mock('@/components/ui/button', () => ({ Button: {} }));
vi.mock('@/components/ui/input', () => ({ Input: {} }));
vi.mock('@/components/ui/label', () => ({ Label: {} }));
vi.mock('@/components/ui/select', () => ({ Select: {}, SelectTrigger: {}, SelectValue: {}, SelectContent: {}, SelectItem: {} }));
vi.mock('@/components/ui/textarea', () => ({ Textarea: {} }));
vi.mock('@/components/ui/badge', () => ({ Badge: {} }));
vi.mock('@/components/ui/separator', () => ({ Separator: {} }));
vi.mock('lucide-react', () => ({
  Plus: { displayName: 'Plus' },
  Trash2: { displayName: 'Trash2' },
  Package: { displayName: 'Package' },
}));

import { MOTIVO_LABELS, RESOLUCAO_LABELS } from '../DevolucoesModals';

// ─── MOTIVO_LABELS ────────────────────────────────────────────────────────────

const EXPECTED_MOTIVOS = [
  'defeito', 'divergencia', 'avaria_transporte', 'prazo_vencido',
  'quantidade_errada', 'especificacao_errada', 'outro',
];

describe('MOTIVO_LABELS', () => {
  it('has 7 motivo entries', () => {
    expect(Object.keys(MOTIVO_LABELS)).toHaveLength(7);
  });

  it('covers all expected motivo keys', () => {
    EXPECTED_MOTIVOS.forEach(motivo => {
      expect(MOTIVO_LABELS[motivo]).toBeDefined();
    });
  });

  it('every label is a non-empty string', () => {
    EXPECTED_MOTIVOS.forEach(motivo => {
      expect(typeof MOTIVO_LABELS[motivo]).toBe('string');
      expect(MOTIVO_LABELS[motivo].length).toBeGreaterThan(0);
    });
  });

  it('defeito label describes manufacturing defect', () => {
    expect(MOTIVO_LABELS.defeito).toBe('Defeito de Fabricação');
  });

  it('divergencia label describes order mismatch', () => {
    expect(MOTIVO_LABELS.divergencia).toBe('Divergência do Pedido');
  });

  it('outro label is "Outro"', () => {
    expect(MOTIVO_LABELS.outro).toBe('Outro');
  });

  it('all labels are unique', () => {
    const values = Object.values(MOTIVO_LABELS);
    expect(new Set(values).size).toBe(values.length);
  });

  it('avaria_transporte label contains "Transporte"', () => {
    expect(MOTIVO_LABELS.avaria_transporte).toContain('Transporte');
  });

  it('prazo_vencido label references "Validade"', () => {
    expect(MOTIVO_LABELS.prazo_vencido).toContain('Validade');
  });

  it('all motivo keys use snake_case (no spaces, no uppercase)', () => {
    Object.keys(MOTIVO_LABELS).forEach(key => {
      expect(key).not.toContain(' ');
      expect(key).toBe(key.toLowerCase());
    });
  });
});

// ─── RESOLUCAO_LABELS ─────────────────────────────────────────────────────────

const EXPECTED_RESOLUCOES = ['credito', 'reposicao', 'reembolso', 'desconto_futuro'];

describe('RESOLUCAO_LABELS', () => {
  it('has 4 resolucao entries', () => {
    expect(Object.keys(RESOLUCAO_LABELS)).toHaveLength(4);
  });

  it('covers all expected resolucao keys', () => {
    EXPECTED_RESOLUCOES.forEach(res => {
      expect(RESOLUCAO_LABELS[res]).toBeDefined();
    });
  });

  it('every label is a non-empty string', () => {
    EXPECTED_RESOLUCOES.forEach(res => {
      expect(typeof RESOLUCAO_LABELS[res]).toBe('string');
      expect(RESOLUCAO_LABELS[res].length).toBeGreaterThan(0);
    });
  });

  it('credito label references future purchases', () => {
    expect(RESOLUCAO_LABELS.credito).toBe('Crédito para Futuras Compras');
  });

  it('reembolso label references financial refund', () => {
    expect(RESOLUCAO_LABELS.reembolso).toBe('Reembolso Financeiro');
  });

  it('reposicao label references product replacement', () => {
    expect(RESOLUCAO_LABELS.reposicao).toBe('Reposição de Produto');
  });

  it('all labels are unique', () => {
    const values = Object.values(RESOLUCAO_LABELS);
    expect(new Set(values).size).toBe(values.length);
  });

  it('desconto_futuro label contains "Futuro"', () => {
    expect(RESOLUCAO_LABELS.desconto_futuro).toContain('Futuro');
  });

  it('all resolucao keys use snake_case (no spaces)', () => {
    Object.keys(RESOLUCAO_LABELS).forEach(key => {
      expect(key).not.toContain(' ');
    });
  });
});
