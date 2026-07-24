import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { solicitacaoSchema } from '../solicitacao.schema';

// ─── solicitacao.schema ───────────────────────────────────────────────────────

const FIXED_TODAY = new Date('2025-01-15T12:00:00.000Z');
const FUTURE_DATE = '2025-06-01';
const PAST_DATE = '2024-01-01';
const TODAY_DATE = '2025-01-15';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_TODAY);
});

afterEach(() => {
  vi.useRealTimers();
});

const validInput = {
  empresa: 'Acme Corp',
  vendedor: 'João Silva',
  produto: 'Caneta personalizada',
  categoriaId: VALID_UUID,
  quantidade: 100,
  tipo: 'PE_LISO' as const,
  prazoEntrega: FUTURE_DATE,
  prioridade: 'normal' as const,
  valorEstimado: 500,
  costCenterId: VALID_UUID,
};

describe('solicitacaoSchema', () => {
  it('accepts fully valid input', () => {
    expect(solicitacaoSchema.safeParse(validInput).success).toBe(true);
  });

  it('applies default observacoes as empty string', () => {
    const result = solicitacaoSchema.parse(validInput);
    expect(result.observacoes).toBe('');
  });

  it('applies default centroCusto as empty string', () => {
    const result = solicitacaoSchema.parse(validInput);
    expect(result.centroCusto).toBe('');
  });

  it('applies default anexos as empty array', () => {
    const result = solicitacaoSchema.parse(validInput);
    expect(result.anexos).toEqual([]);
  });

  it('rejects empty empresa', () => {
    expect(solicitacaoSchema.safeParse({ ...validInput, empresa: '' }).success).toBe(false);
  });

  it('rejects empty vendedor', () => {
    expect(solicitacaoSchema.safeParse({ ...validInput, vendedor: '' }).success).toBe(false);
  });

  it('rejects produto shorter than 2 characters', () => {
    expect(solicitacaoSchema.safeParse({ ...validInput, produto: 'A' }).success).toBe(false);
  });

  it('accepts produto of exactly 2 characters', () => {
    expect(solicitacaoSchema.safeParse({ ...validInput, produto: 'AB' }).success).toBe(true);
  });

  it('rejects produto longer than 200 characters', () => {
    expect(solicitacaoSchema.safeParse({ ...validInput, produto: 'X'.repeat(201) }).success).toBe(false);
  });

  it('rejects empty categoriaId', () => {
    expect(solicitacaoSchema.safeParse({ ...validInput, categoriaId: '' }).success).toBe(false);
  });

  it('rejects zero quantidade', () => {
    expect(solicitacaoSchema.safeParse({ ...validInput, quantidade: 0 }).success).toBe(false);
  });

  it('rejects negative quantidade', () => {
    expect(solicitacaoSchema.safeParse({ ...validInput, quantidade: -5 }).success).toBe(false);
  });

  it('rejects non-integer quantidade', () => {
    expect(solicitacaoSchema.safeParse({ ...validInput, quantidade: 1.5 }).success).toBe(false);
  });

  it('accepts valid tipo PE_LISO', () => {
    expect(solicitacaoSchema.safeParse({ ...validInput, tipo: 'PE_LISO' }).success).toBe(true);
  });

  it('accepts valid tipo FAB_LISO', () => {
    expect(solicitacaoSchema.safeParse({ ...validInput, tipo: 'FAB_LISO' }).success).toBe(true);
  });

  it('accepts valid tipo FAB_PERSONALIZADO', () => {
    expect(solicitacaoSchema.safeParse({ ...validInput, tipo: 'FAB_PERSONALIZADO' }).success).toBe(true);
  });

  it('rejects invalid tipo', () => {
    expect(solicitacaoSchema.safeParse({ ...validInput, tipo: 'INVALID' }).success).toBe(false);
  });

  it('rejects past prazoEntrega', () => {
    expect(solicitacaoSchema.safeParse({ ...validInput, prazoEntrega: PAST_DATE }).success).toBe(false);
  });

  it('accepts today as prazoEntrega (>=today)', () => {
    expect(solicitacaoSchema.safeParse({ ...validInput, prazoEntrega: TODAY_DATE }).success).toBe(true);
  });

  it('accepts future prazoEntrega', () => {
    expect(solicitacaoSchema.safeParse({ ...validInput, prazoEntrega: FUTURE_DATE }).success).toBe(true);
  });

  it('rejects empty prazoEntrega', () => {
    expect(solicitacaoSchema.safeParse({ ...validInput, prazoEntrega: '' }).success).toBe(false);
  });

  it('rejects observacoes longer than 2000 characters', () => {
    expect(solicitacaoSchema.safeParse({ ...validInput, observacoes: 'A'.repeat(2001) }).success).toBe(false);
  });

  it('accepts observacoes of exactly 2000 characters', () => {
    expect(solicitacaoSchema.safeParse({ ...validInput, observacoes: 'A'.repeat(2000) }).success).toBe(true);
  });

  it('accepts valid prioridade baixa', () => {
    expect(solicitacaoSchema.safeParse({ ...validInput, prioridade: 'baixa' }).success).toBe(true);
  });

  it('accepts valid prioridade alta', () => {
    expect(solicitacaoSchema.safeParse({ ...validInput, prioridade: 'alta' }).success).toBe(true);
  });

  it('accepts valid prioridade urgente', () => {
    expect(solicitacaoSchema.safeParse({ ...validInput, prioridade: 'urgente' }).success).toBe(true);
  });

  it('rejects invalid prioridade', () => {
    expect(solicitacaoSchema.safeParse({ ...validInput, prioridade: 'media' }).success).toBe(false);
  });

  it('rejects negative valorEstimado', () => {
    expect(solicitacaoSchema.safeParse({ ...validInput, valorEstimado: -1 }).success).toBe(false);
  });

  it('accepts zero valorEstimado (nonnegative)', () => {
    expect(solicitacaoSchema.safeParse({ ...validInput, valorEstimado: 0 }).success).toBe(true);
  });

  it('rejects empty costCenterId', () => {
    expect(solicitacaoSchema.safeParse({ ...validInput, costCenterId: '' }).success).toBe(false);
  });
});
