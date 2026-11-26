import { describe, it, expect } from 'vitest';
import {
  normalizarTelefone,
  buildWhatsAppText,
  buildEmailAssunto,
  buildEmailCorpo,
  buildWhatsAppUrl,
  buildMailtoUrl,
  type SugestaoNegociacao,
} from '../negotiationOutreach';

const sugestao: SugestaoNegociacao = {
  fornecedor: 'Brindes Aurora',
  estrategia: 'Ancorar no volume acumulado do trimestre.',
  valor_contraproposta: 12.5,
  valor_ponto_recuo: 15,
  argumentos: ['Volume de 5.000 un', 'Pagamento a vista'],
};

describe('normalizarTelefone', () => {
  it('prefixa 55 em celular de 11 digitos', () => {
    expect(normalizarTelefone('(11) 98765-4321')).toBe('5511987654321');
  });

  it('nao duplica o 55 quando ja veio com pais', () => {
    expect(normalizarTelefone('5511987654321')).toBe('5511987654321');
  });

  it('rejeita telefone curto demais', () => {
    expect(normalizarTelefone('1234')).toBeNull();
    expect(normalizarTelefone(null)).toBeNull();
  });
});

describe('buildWhatsAppText', () => {
  it('inclui meta formatada em BRL e todos os argumentos', () => {
    const texto = buildWhatsAppText(sugestao, { numeroSolicitacao: 'SOL-2026-1000' });
    expect(texto).toContain('Brindes Aurora');
    expect(texto).toContain('SOL-2026-1000');
    expect(texto).toContain('R$ 12,50');
    expect(texto).toContain('- Volume de 5.000 un');
    expect(texto).toContain('- Pagamento a vista');
  });

  it('omite a linha da meta quando nao ha contraproposta', () => {
    const texto = buildWhatsAppText({ ...sugestao, valor_contraproposta: undefined });
    expect(texto).not.toContain('cenario alvo');
  });
});

describe('buildEmailCorpo', () => {
  it('inclui estrategia, meta, recuo e fundamentos', () => {
    const corpo = buildEmailCorpo(sugestao, { tituloSolicitacao: 'Campanha de fim de ano' });
    expect(corpo).toContain('Ancorar no volume acumulado do trimestre.');
    expect(corpo).toContain('Meta de fechamento: R$ 12,50');
    expect(corpo).toContain('Limite maximo de recuo: R$ 15,00');
    expect(corpo).toContain('Campanha de fim de ano');
  });

  it('assunto usa a solicitacao como referencia', () => {
    expect(buildEmailAssunto(sugestao, { numeroSolicitacao: 'SOL-42' })).toBe(
      'Revisao de proposta - SOL-42',
    );
  });
});

describe('URLs', () => {
  it('gera wa.me apenas com telefone valido', () => {
    expect(buildWhatsAppUrl('11987654321', 'oi')).toBe('https://wa.me/5511987654321?text=oi');
    expect(buildWhatsAppUrl(null, 'oi')).toBeNull();
  });

  it('gera mailto apenas com e-mail plausivel', () => {
    expect(buildMailtoUrl('compras@fornecedor.com', 'a b', 'c d')).toBe(
      'mailto:compras@fornecedor.com?subject=a%20b&body=c%20d',
    );
    expect(buildMailtoUrl('sem-arroba', 'a', 'b')).toBeNull();
  });
});