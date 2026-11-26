import { describe, it, expect } from 'vitest';
import {
  getTipoLabel,
  buildWhatsAppMessage,
  buildEmailMessage,
  formatarEnderecoEntrega,
} from '../gerarOrdemHelpers';

const makeSupplier = (overrides = {}) => ({
  nome_fantasia: 'Acme Ltda',
  razao_social: 'Acme Comércio e Distribuição Ltda',
  ...overrides,
});

const makeOrder = (overrides = {}) => ({
  produto: 'Canetas Personalizadas',
  quantidadeReal: 500,
  valorUnitario: 2.5,
  prazoEntrega: '2024-12-31',
  tipo: 'produto',
  ...overrides,
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
    ['PE_LISO', 'P.E. Liso'],
    ['FAB_LISO', 'Fab. Liso'],
    ['FAB_PERSONALIZADO', 'Fab. Personalizado'],
  ];

  it.each(cases)('maps %s → %s', (tipo, expected) => {
    expect(getTipoLabel(tipo)).toBe(expected);
  });

  it('returns the raw value for unknown tipo', () => {
    expect(getTipoLabel('CUSTOM_TYPE')).toBe('CUSTOM_TYPE');
  });
});

// ─── buildWhatsAppMessage ─────────────────────────────────────────────────────

describe('buildWhatsAppMessage', () => {
  it('includes the order number', () => {
    const msg = buildWhatsAppMessage(makeSupplier(), makeOrder(), 'OC-001', 1250, 0, 0, '');
    expect(msg).toContain('OC-001');
  });

  it('uses nome_fantasia when available', () => {
    const msg = buildWhatsAppMessage(makeSupplier(), makeOrder(), 'OC-001', 1250, 0, 0, '');
    expect(msg).toContain('Acme Ltda');
  });

  it('falls back to razao_social when nome_fantasia is empty', () => {
    const supplier = makeSupplier({ nome_fantasia: '' });
    const msg = buildWhatsAppMessage(supplier, makeOrder(), 'OC-001', 1250, 0, 0, '');
    expect(msg).toContain('Acme Comércio e Distribuição Ltda');
  });

  it('includes the product name', () => {
    const msg = buildWhatsAppMessage(makeSupplier(), makeOrder(), 'OC-001', 1250, 0, 0, '');
    expect(msg).toContain('Canetas Personalizadas');
  });

  it('includes the quantity', () => {
    const msg = buildWhatsAppMessage(makeSupplier(), makeOrder(), 'OC-001', 1250, 0, 0, '');
    expect(msg).toContain('500');
  });

  it('shows Grátis when frete is 0', () => {
    const msg = buildWhatsAppMessage(makeSupplier(), makeOrder(), 'OC-001', 1250, 0, 0, '');
    expect(msg).toContain('Grátis');
  });

  it('shows frete value when frete > 0', () => {
    const msg = buildWhatsAppMessage(makeSupplier(), makeOrder(), 'OC-001', 1400, 150, 0, '');
    expect(msg).toContain('150,00');
  });

  it('includes discount line when desconto > 0', () => {
    const msg = buildWhatsAppMessage(makeSupplier(), makeOrder(), 'OC-001', 1150, 0, 100, '');
    expect(msg).toContain('Desconto');
  });

  it('omits discount line when desconto is 0', () => {
    const msg = buildWhatsAppMessage(makeSupplier(), makeOrder(), 'OC-001', 1250, 0, 0, '');
    expect(msg).not.toContain('Desconto');
  });

  it('includes observacoes when provided', () => {
    const msg = buildWhatsAppMessage(makeSupplier(), makeOrder(), 'OC-001', 1250, 0, 0, 'Urgente!');
    expect(msg).toContain('Urgente!');
  });

  it('omits observacoes line when empty', () => {
    const msg = buildWhatsAppMessage(makeSupplier(), makeOrder(), 'OC-001', 1250, 0, 0, '');
    expect(msg).not.toContain('Observações');
  });

  it('returns a non-empty string', () => {
    const msg = buildWhatsAppMessage(makeSupplier(), makeOrder(), 'OC-001', 1250, 0, 0, '');
    expect(msg.length).toBeGreaterThan(0);
  });
});

// ─── buildEmailMessage ────────────────────────────────────────────────────────

describe('buildEmailMessage', () => {
  it('returns an object with assunto and corpo', () => {
    const result = buildEmailMessage(makeOrder(), 'OC-001', 1250, 1250, 0, 0, '');
    expect(result).toHaveProperty('assunto');
    expect(result).toHaveProperty('corpo');
  });

  it('includes order number in assunto', () => {
    const { assunto } = buildEmailMessage(makeOrder(), 'OC-001', 1250, 1250, 0, 0, '');
    expect(assunto).toContain('OC-001');
  });

  it('includes product name in assunto', () => {
    const { assunto } = buildEmailMessage(makeOrder(), 'OC-001', 1250, 1250, 0, 0, '');
    expect(assunto).toContain('Canetas Personalizadas');
  });

  it('includes product name in corpo', () => {
    const { corpo } = buildEmailMessage(makeOrder(), 'OC-001', 1250, 1250, 0, 0, '');
    expect(corpo).toContain('Canetas Personalizadas');
  });

  it('includes quantity in corpo', () => {
    const { corpo } = buildEmailMessage(makeOrder(), 'OC-001', 1250, 1250, 0, 0, '');
    expect(corpo).toContain('500');
  });

  it('shows Grátis when frete is 0', () => {
    const { corpo } = buildEmailMessage(makeOrder(), 'OC-001', 1250, 1250, 0, 0, '');
    expect(corpo).toContain('Grátis');
  });

  it('shows frete value when frete > 0', () => {
    const { corpo } = buildEmailMessage(makeOrder(), 'OC-001', 1250, 1400, 150, 0, '');
    expect(corpo).toContain('150,00');
  });

  it('includes desconto line when desconto > 0', () => {
    const { corpo } = buildEmailMessage(makeOrder(), 'OC-001', 1350, 1250, 0, 100, '');
    expect(corpo).toContain('Desconto');
  });

  it('omits desconto line when 0', () => {
    const { corpo } = buildEmailMessage(makeOrder(), 'OC-001', 1250, 1250, 0, 0, '');
    expect(corpo).not.toContain('Desconto');
  });

  it('includes observacoes section when provided', () => {
    const { corpo } = buildEmailMessage(makeOrder(), 'OC-001', 1250, 1250, 0, 0, 'Nota fiscal obrigatória');
    expect(corpo).toContain('Nota fiscal obrigatória');
  });

  it('omits OBSERVAÇÕES section when empty', () => {
    const { corpo } = buildEmailMessage(makeOrder(), 'OC-001', 1250, 1250, 0, 0, '');
    expect(corpo).not.toContain('OBSERVAÇÕES');
  });

  it('includes tipo label for the order type', () => {
    const { corpo } = buildEmailMessage(makeOrder({ tipo: 'servico' }), 'OC-001', 1250, 1250, 0, 0, '');
    expect(corpo).toContain('Serviço');
  });
});

// ─── NEG-03: o preco da OC vem da cotacao, nunca de um valor fixo ─────────────

describe('buildWhatsAppMessage/buildEmailMessage sem fallback de R$ 12', () => {
  it('nao inventa R$ 12,00 quando o valor unitario e zero', () => {
    const zerado = makeOrder({ valorUnitario: 0 });

    expect(buildWhatsAppMessage(makeSupplier(), zerado, 'OC-001', 0, 0, 0, '')).not.toContain('R$ 12,00');
    expect(buildWhatsAppMessage(makeSupplier(), zerado, 'OC-001', 0, 0, 0, '')).toContain('0,00');

    const { corpo } = buildEmailMessage(zerado, 'OC-001', 0, 0, 0, 0, '');
    expect(corpo).not.toContain('R$ 12,00');
  });

  it('reproduz o valor unitario da cotacao vencedora', () => {
    const daCotacao = makeOrder({ valorUnitario: 23, quantidadeReal: 200 });

    expect(buildWhatsAppMessage(makeSupplier(), daCotacao, 'OC-001', 4600, 200, 0, '')).toContain('23,00');
    const { corpo } = buildEmailMessage(daCotacao, 'OC-001', 4600, 4800, 200, 0, '');
    expect(corpo).toContain('23,00');
  });
});

// --- QA 227: endereco real da empresa no e-mail, nunca placeholder ---

describe('formatarEnderecoEntrega', () => {
  it('monta a linha completa a partir do jsonb do tenant', () => {
    const endereco = {
      logradouro: 'Av. Paulista',
      numero: '1000',
      complemento: '10o andar',
      bairro: 'Bela Vista',
      cidade: 'Sao Paulo',
      uf: 'SP',
      cep: '01310-100',
    };
    expect(formatarEnderecoEntrega(endereco)).toBe(
      'Av. Paulista, 1000 - 10o andar - Bela Vista - Sao Paulo/SP - CEP 01310-100'
    );
  });

  it('devolve null para jsonb vazio e para valores ausentes', () => {
    expect(formatarEnderecoEntrega({})).toBeNull();
    expect(formatarEnderecoEntrega(null)).toBeNull();
    expect(formatarEnderecoEntrega(undefined)).toBeNull();
    expect(formatarEnderecoEntrega([])).toBeNull();
    expect(formatarEnderecoEntrega(42)).toBeNull();
    expect(formatarEnderecoEntrega({ numero: '   ' })).toBeNull();
  });

  it('aceita campos numericos (jsonb com numero sem aspas)', () => {
    expect(
      formatarEnderecoEntrega({ logradouro: 'Rua A', numero: 1200, cidade: 'Osasco', uf: 'SP' })
    ).toBe('Rua A, 1200 - Osasco/SP');
  });

  it('aceita cidade/UF sem logradouro', () => {
    expect(formatarEnderecoEntrega({ cidade: 'Campinas', uf: 'SP' })).toBe('Campinas/SP');
  });

  it('aceita endereco ja em texto', () => {
    expect(formatarEnderecoEntrega('  Rua das Flores, 12  ')).toBe('Rua das Flores, 12');
  });
});

describe('buildEmailMessage - bloco DADOS PARA ENTREGA', () => {
  it('omite o bloco quando a empresa nao tem endereco', () => {
    const { corpo } = buildEmailMessage(makeOrder(), 'OC-001', 1250, 1250, 0, 0, '', {
      empresa: 'Promo Supply',
      endereco: null,
    });
    expect(corpo).not.toContain('DADOS PARA ENTREGA');
    expect(corpo).not.toContain('Endere\u00e7o da empresa');
  });

  it('omite o bloco quando o parametro de entrega nem e passado', () => {
    const { corpo } = buildEmailMessage(makeOrder(), 'OC-001', 1250, 1250, 0, 0, '');
    expect(corpo).not.toContain('DADOS PARA ENTREGA');
    expect(corpo).not.toContain('Endere\u00e7o da empresa');
  });

  it('imprime o endereco da empresa selecionada quando existe', () => {
    const { corpo } = buildEmailMessage(makeOrder(), 'OC-001', 1250, 1250, 0, 0, '', {
      empresa: 'Promo Supply Filial Sul',
      endereco: 'Av. Paulista, 1000 - Sao Paulo/SP',
    });
    expect(corpo).toContain('DADOS PARA ENTREGA');
    expect(corpo).toContain('Promo Supply Filial Sul');
    expect(corpo).toContain('Av. Paulista, 1000 - Sao Paulo/SP');
    expect(corpo).not.toContain('Endere\u00e7o da empresa');
  });
});

describe('buildEmailMessage - formato real do dinheiro (sem mock de @/lib/utils)', () => {
  it('usa o formatCurrency real, com separador de milhar', () => {
    const { corpo } = buildEmailMessage(makeOrder(), 'OC-001', 1250, 1250, 0, 0, '');
    expect(corpo).toContain('1.250,00');
  });

  it('nao inventa valor unitario quando a cotacao veio zerada', () => {
    const { corpo } = buildEmailMessage(makeOrder({ valorUnitario: 0 }), 'OC-001', 0, 0, 0, 0, '');
    expect(corpo).not.toContain('R$ 12,00');
    expect(corpo).toContain('0,00');
  });
});
