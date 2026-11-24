import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getStatusLabel,
  getTipoLabel,
  getStatusBadgeColor,
  mapPedidoStatus,
  calcularSLA,
  gerarEtapasPipeline,
} from '../AcompanhamentoHelpers';

vi.mock('lucide-react', () => ({
  AlertTriangle: {},
  AlertCircle: {},
  CheckCircle2: {},
  Timer: {},
}));

// ─── getStatusLabel ───────────────────────────────────────────────────────────

describe('getStatusLabel', () => {
  const cases: [string, string][] = [
    ['pendente', 'Pendente'],
    ['aprovada', 'Aprovada'],
    ['em_cotacao', 'Em Cotação'],
    ['entregue', 'Entregue'],
    ['cancelada', 'Cancelada'],
    ['concluida', 'Concluída'],
    ['AGUARDANDO_COTACAO', 'Aguardando Cotação'],
    ['EM_COTACAO', 'Em Cotação'],
    ['FORNECEDOR_SELECIONADO', 'Fornecedor Selecionado'],
    ['PEDIDO_GERADO', 'Pedido Gerado'],
    ['AGUARDANDO_PAGAMENTO', 'Aguardando Pagamento'],
    ['PAGO', 'Pago'],
    ['EM_TRANSITO', 'Em Trânsito'],
    ['ENTREGUE', 'Entregue'],
  ];

  it.each(cases)('maps %s → %s', (status, expected) => {
    expect(getStatusLabel(status)).toBe(expected);
  });

  it('returns the raw status for unknown values', () => {
    expect(getStatusLabel('UNKNOWN_STATUS')).toBe('UNKNOWN_STATUS');
  });

  it('returns empty string for empty input', () => {
    expect(getStatusLabel('')).toBe('');
  });
});

// ─── getTipoLabel ─────────────────────────────────────────────────────────────

describe('getTipoLabel', () => {
  const cases: [string, string][] = [
    ['produto', 'Produto'],
    ['servico', 'Serviço'],
    ['material', 'Material'],
    ['pe_liso', 'P.E. Liso'],
    ['fabricacao_liso', 'Fab. Liso'],
    ['fabricacao_personalizado', 'Fab. Personalizado'],
  ];

  it.each(cases)('maps %s → %s', (tipo, expected) => {
    expect(getTipoLabel(tipo)).toBe(expected);
  });

  it('returns the raw tipo for unknown values', () => {
    expect(getTipoLabel('unknown_tipo')).toBe('unknown_tipo');
  });
});

// ─── getStatusBadgeColor ──────────────────────────────────────────────────────

describe('getStatusBadgeColor', () => {
  it('returns color for FORNECEDOR_SELECIONADO', () => {
    const color = getStatusBadgeColor('FORNECEDOR_SELECIONADO');
    expect(color).toContain('blue');
  });

  it('returns color for ENTREGUE', () => {
    const color = getStatusBadgeColor('ENTREGUE');
    expect(color).toContain('success');
  });

  it('returns color for AGUARDANDO_PAGAMENTO', () => {
    const color = getStatusBadgeColor('AGUARDANDO_PAGAMENTO');
    expect(color).toContain('warning');
  });

  it('returns fallback for unknown status', () => {
    const color = getStatusBadgeColor('UNKNOWN');
    expect(color).toContain('muted');
  });

  it('returns a non-empty string for all known statuses', () => {
    const statuses = ['FORNECEDOR_SELECIONADO', 'PEDIDO_GERADO', 'AGUARDANDO_PAGAMENTO', 'PAGO', 'EM_TRANSITO', 'ENTREGUE'];
    statuses.forEach(s => {
      expect(getStatusBadgeColor(s).length).toBeGreaterThan(0);
    });
  });
});

// ─── mapPedidoStatus ──────────────────────────────────────────────────────────

describe('mapPedidoStatus', () => {
  it('maps pendente to PEDIDO_GERADO', () => {
    expect(mapPedidoStatus('pendente')).toBe('PEDIDO_GERADO');
  });

  it('maps aprovado to PEDIDO_GERADO', () => {
    expect(mapPedidoStatus('aprovado')).toBe('PEDIDO_GERADO');
  });

  it('maps em_transito to EM_TRANSITO', () => {
    expect(mapPedidoStatus('em_transito')).toBe('EM_TRANSITO');
  });

  it('maps entregue to ENTREGUE', () => {
    expect(mapPedidoStatus('entregue')).toBe('ENTREGUE');
  });

  it('maps cancelado to CANCELADO', () => {
    expect(mapPedidoStatus('cancelado')).toBe('CANCELADO');
  });

  it('uppercases unknown statuses', () => {
    expect(mapPedidoStatus('custom_status')).toBe('CUSTOM_STATUS');
  });
});

// ─── calcularSLA ──────────────────────────────────────────────────────────────

describe('calcularSLA', () => {
  const FIXED_NOW = new Date('2024-06-15T12:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns entregue status for ENTREGUE orders regardless of date', () => {
    const result = calcularSLA('2024-01-01', 'ENTREGUE');
    expect(result.status).toBe('entregue');
    expect(result.label).toBe('Entregue');
  });

  it('returns atrasado for past deadline', () => {
    // 5 days before now
    const result = calcularSLA('2024-06-10', 'EM_TRANSITO');
    expect(result.status).toBe('atrasado');
    expect(result.diasRestantes).toBeLessThan(0);
  });

  it('atrasado label mentions number of days late', () => {
    const result = calcularSLA('2024-06-10', 'EM_TRANSITO');
    expect(result.label).toMatch(/dia/);
  });

  it('returns no_prazo for deadline far in the future', () => {
    const result = calcularSLA('2024-06-25', 'EM_COTACAO');
    expect(result.status).toBe('no_prazo');
    expect(result.diasRestantes).toBeGreaterThan(3);
  });

  it('returns atencao for deadline within 3 days', () => {
    // FIXED_NOW = 2024-06-15T12:00Z; June 18 midnight is ~2.5 days away (truncated to 2 by date-fns)
    const result = calcularSLA('2024-06-17', 'EM_COTACAO');
    expect(result.status).toBe('atencao');
    expect(result.diasRestantes).toBeGreaterThan(0);
    expect(result.diasRestantes).toBeLessThanOrEqual(3);
  });

  it('has color and bgColor in every result', () => {
    const results = [
      calcularSLA('2024-06-10', 'EM_TRANSITO'), // atrasado
      calcularSLA('2024-06-18', 'EM_COTACAO'),  // atencao
      calcularSLA('2024-06-25', 'EM_COTACAO'),  // no_prazo
      calcularSLA('2024-01-01', 'ENTREGUE'),     // entregue
    ];
    results.forEach(r => {
      expect(typeof r.color).toBe('string');
      expect(typeof r.bgColor).toBe('string');
    });
  });
});

// ─── gerarEtapasPipeline ─────────────────────────────────────────────────────

describe('gerarEtapasPipeline', () => {
  it('returns 6 stages', () => {
    const result = gerarEtapasPipeline('AGUARDANDO_COTACAO');
    expect(result).toHaveLength(6);
  });

  it('first stage is atual for AGUARDANDO_COTACAO (etapaAtual=0)', () => {
    const result = gerarEtapasPipeline('AGUARDANDO_COTACAO');
    expect(result[0].status).toBe('atual');
    expect(result[1].status).toBe('pendente');
  });

  it('all stages before current are concluido', () => {
    // PEDIDO_GERADO = statusOrdem 2 → stages 0,1 concluido, stage 2 atual
    const result = gerarEtapasPipeline('PEDIDO_GERADO');
    expect(result[0].status).toBe('concluido');
    expect(result[1].status).toBe('concluido');
    expect(result[2].status).toBe('atual');
    expect(result[3].status).toBe('pendente');
  });

  it('returns all stages concluido except last for ENTREGUE (etapaAtual=5)', () => {
    const result = gerarEtapasPipeline('ENTREGUE');
    for (let i = 0; i < 5; i++) {
      expect(result[i].status).toBe('concluido');
    }
    expect(result[5].status).toBe('atual');
  });

  it('each stage has id, nome, and status', () => {
    const result = gerarEtapasPipeline('EM_COTACAO');
    result.forEach(stage => {
      expect(typeof stage.id).toBe('string');
      expect(typeof stage.nome).toBe('string');
      expect(['concluido', 'atual', 'pendente']).toContain(stage.status);
    });
  });

  it('handles unknown status gracefully (defaults to 0)', () => {
    const result = gerarEtapasPipeline('UNKNOWN_STATUS');
    expect(result[0].status).toBe('atual');
    expect(result.filter(s => s.status === 'concluido')).toHaveLength(0);
  });

  it('mostra a data real do marco e nao inventa nas etapas sem marco', () => {
    const result = gerarEtapasPipeline('PEDIDO_GERADO', {
      solicitacao: '2025-12-01',
      emissao: '2025-12-03',
    });
    expect(result[0].data).toBe('01/12/2025');
    expect(result[1].data).toBeUndefined();
    expect(result[2].data).toBe('03/12/2025');
    expect(result[3].data).toBeUndefined();
    expect(result[4].data).toBeUndefined();
    expect(result[5].data).toBeUndefined();
  });

  it('etapa em andamento sem marco diz Agora e as outras ficam sem data', () => {
    const result = gerarEtapasPipeline('EM_COTACAO');
    expect(result[0].data).toBeUndefined();
    expect(result[1].data).toBe('Agora');
    expect(result[2].data).toBeUndefined();
  });

  it('nao devolve mais a data fixa 15/12/2025 nas etapas concluidas', () => {
    const result = gerarEtapasPipeline('ENTREGUE');
    expect(result.map(e => e.data)).not.toContain('15/12/2025');
    for (let i = 0; i < 5; i++) {
      expect(result[i].data).toBeUndefined();
    }
  });

  it('etapa entregue usa a data de entrega real quando existe', () => {
    const comEntrega = gerarEtapasPipeline('ENTREGUE', { entrega: '2025-12-20' });
    expect(comEntrega[5].data).toBe('20/12/2025');
    const semEntrega = gerarEtapasPipeline('ENTREGUE');
    expect(semEntrega[5].data).toBe('Agora');
  });

  it('marco invalido ou vazio e ignorado em vez de virar data', () => {
    const invalido = gerarEtapasPipeline('PEDIDO_GERADO', { emissao: 'nao-e-data' });
    expect(invalido[2].data).toBe('Agora');
    const vazio = gerarEtapasPipeline('PEDIDO_GERADO', { emissao: null, solicitacao: '' });
    expect(vazio[0].data).toBeUndefined();
    expect(vazio[2].data).toBe('Agora');
  });
});
