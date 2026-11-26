import { describe, it, expect } from 'vitest';
import {
  SolicitacaoStatusSchema,
  SolicitacaoPrioridadeSchema,
  CreateSolicitacaoSchema,
} from '../solicitacao.schemas';

// ─── solicitacao.schemas ──────────────────────────────────────────────────────

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';

// ── SolicitacaoStatusSchema ───────────────────────────────────────────────────

describe('SolicitacaoStatusSchema', () => {
  const validStatuses = [
    'pendente', 'em_cotacao', 'aprovada', 'rejeitada',
    'em_andamento', 'concluida', 'cancelada',
  ] as const;

  it('has exactly 7 valid status values', () => {
    validStatuses.forEach(s => {
      expect(SolicitacaoStatusSchema.safeParse(s).success).toBe(true);
    });
  });

  it('rejects unknown status', () => {
    expect(SolicitacaoStatusSchema.safeParse('em_espera').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(SolicitacaoStatusSchema.safeParse('').success).toBe(false);
  });

  it('rejects null', () => {
    expect(SolicitacaoStatusSchema.safeParse(null).success).toBe(false);
  });

  it('accepts pendente', () => {
    expect(SolicitacaoStatusSchema.parse('pendente')).toBe('pendente');
  });

  it('accepts concluida', () => {
    expect(SolicitacaoStatusSchema.parse('concluida')).toBe('concluida');
  });
});

// ── SolicitacaoPrioridadeSchema ───────────────────────────────────────────────

describe('SolicitacaoPrioridadeSchema', () => {
  it('accepts baixa', () => {
    expect(SolicitacaoPrioridadeSchema.safeParse('baixa').success).toBe(true);
  });

  it('accepts media', () => {
    expect(SolicitacaoPrioridadeSchema.safeParse('media').success).toBe(true);
  });

  it('accepts alta', () => {
    expect(SolicitacaoPrioridadeSchema.safeParse('alta').success).toBe(true);
  });

  it('accepts urgente', () => {
    expect(SolicitacaoPrioridadeSchema.safeParse('urgente').success).toBe(true);
  });

  it('rejects invalid priority', () => {
    expect(SolicitacaoPrioridadeSchema.safeParse('normal').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(SolicitacaoPrioridadeSchema.safeParse('').success).toBe(false);
  });
});

// ── CreateSolicitacaoSchema ───────────────────────────────────────────────────

describe('CreateSolicitacaoSchema', () => {
  const validInput = {
    titulo: 'Compra de material de escritório',
    tipo: 'material',
  };

  it('accepts minimal valid input', () => {
    expect(CreateSolicitacaoSchema.safeParse(validInput).success).toBe(true);
  });

  it('applies default prioridade "media" when not provided', () => {
    const result = CreateSolicitacaoSchema.parse(validInput);
    expect(result.prioridade).toBe('media');
  });

  it('applies default quantidade 1 when not provided', () => {
    const result = CreateSolicitacaoSchema.parse(validInput);
    expect(result.quantidade).toBe(1);
  });

  it('applies default unidade "un" when not provided', () => {
    const result = CreateSolicitacaoSchema.parse(validInput);
    expect(result.unidade).toBe('un');
  });

  it('rejects titulo shorter than 3 characters', () => {
    const result = CreateSolicitacaoSchema.safeParse({ ...validInput, titulo: 'AB' });
    expect(result.success).toBe(false);
  });

  it('rejects titulo longer than 200 characters', () => {
    const result = CreateSolicitacaoSchema.safeParse({ ...validInput, titulo: 'A'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('accepts titulo of exactly 3 characters', () => {
    expect(CreateSolicitacaoSchema.safeParse({ ...validInput, titulo: 'ABC' }).success).toBe(true);
  });

  it('accepts titulo of exactly 200 characters', () => {
    expect(CreateSolicitacaoSchema.safeParse({ ...validInput, titulo: 'A'.repeat(200) }).success).toBe(true);
  });

  it('rejects missing titulo', () => {
    const { titulo: _, ...rest } = validInput;
    expect(CreateSolicitacaoSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects missing tipo', () => {
    const { tipo: _, ...rest } = validInput;
    expect(CreateSolicitacaoSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects non-positive valor_estimado', () => {
    const result = CreateSolicitacaoSchema.safeParse({ ...validInput, valor_estimado: -100 });
    expect(result.success).toBe(false);
  });

  it('rejects zero valor_estimado', () => {
    const result = CreateSolicitacaoSchema.safeParse({ ...validInput, valor_estimado: 0 });
    expect(result.success).toBe(false);
  });

  it('accepts positive valor_estimado', () => {
    expect(CreateSolicitacaoSchema.safeParse({ ...validInput, valor_estimado: 150.5 }).success).toBe(true);
  });

  it('accepts null valor_estimado', () => {
    expect(CreateSolicitacaoSchema.safeParse({ ...validInput, valor_estimado: null }).success).toBe(true);
  });

  it('rejects non-positive quantidade', () => {
    const result = CreateSolicitacaoSchema.safeParse({ ...validInput, quantidade: 0 });
    expect(result.success).toBe(false);
  });

  it('accepts valid cost_center_id UUID', () => {
    expect(CreateSolicitacaoSchema.safeParse({ ...validInput, cost_center_id: VALID_UUID }).success).toBe(true);
  });

  it('rejects invalid cost_center_id (non-UUID)', () => {
    expect(CreateSolicitacaoSchema.safeParse({ ...validInput, cost_center_id: 'bad-id' }).success).toBe(false);
  });

  it('accepts null cost_center_id', () => {
    expect(CreateSolicitacaoSchema.safeParse({ ...validInput, cost_center_id: null }).success).toBe(true);
  });

  it('accepts valid categoria_id UUID', () => {
    expect(CreateSolicitacaoSchema.safeParse({ ...validInput, categoria_id: VALID_UUID }).success).toBe(true);
  });

  it('accepts all optional nullable fields as null', () => {
    const full = {
      ...validInput,
      descricao: null,
      valor_estimado: null,
      data_necessidade: null,
      departamento: null,
      centro_custo: null,
      cost_center_id: null,
      justificativa: null,
      categoria_id: null,
    };
    expect(CreateSolicitacaoSchema.safeParse(full).success).toBe(true);
  });

  it('accepts custom prioridade "urgente"', () => {
    const result = CreateSolicitacaoSchema.parse({ ...validInput, prioridade: 'urgente' });
    expect(result.prioridade).toBe('urgente');
  });

  it('rejects invalid prioridade', () => {
    expect(CreateSolicitacaoSchema.safeParse({ ...validInput, prioridade: 'muito_alta' }).success).toBe(false);
  });
});
