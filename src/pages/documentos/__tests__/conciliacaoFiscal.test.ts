import { describe, it, expect } from 'vitest';
import {
  conciliarNotaComPedido,
  normalizarCnpj,
  resolverFornecedorPorCnpj,
} from '../conciliacaoFiscal';

const pedido = (id: string, numero: string, valor_total: number, fornecedor_id: string | null) => ({
  id,
  numero,
  valor_total,
  fornecedor_id,
});

describe('conciliacao de NF-e com pedido', () => {
  it('nao casa a nota com pedido de outro fornecedor so porque o valor e igual', () => {
    const resultado = conciliarNotaComPedido(
      { valor_total: 1200, fornecedor_id: 'fornecedor-A' },
      [
        pedido('p1', 'PED-1', 1200, 'fornecedor-A'),
        pedido('p2', 'PED-2', 1200, 'fornecedor-B'),
      ],
    );

    expect(resultado.status).toBe('matched');
    expect(resultado.pedido?.id).toBe('p1');
    expect(resultado.motivoCodigo).toBe('vinculo-unico');
  });

  it('deixa sem vinculo quando o valor so existe em pedido de outro fornecedor', () => {
    const resultado = conciliarNotaComPedido(
      { valor_total: 1200, fornecedor_id: 'fornecedor-A' },
      [pedido('p2', 'PED-2', 1200, 'fornecedor-B')],
    );

    expect(resultado.status).toBe('unmatched');
    expect(resultado.pedido).toBeNull();
    expect(resultado.motivoCodigo).toBe('valor-em-outro-fornecedor');
    expect(resultado.candidatosMesmoValor.map((c) => c.id)).toEqual(['p2']);
  });

  it('nao escolhe quando dois pedidos do mesmo fornecedor tem o mesmo valor', () => {
    const resultado = conciliarNotaComPedido(
      { valor_total: 500.5, fornecedor_id: 'fornecedor-A' },
      [
        pedido('p1', 'PED-1', 500.5, 'fornecedor-A'),
        pedido('p3', 'PED-3', 500.5, 'fornecedor-A'),
      ],
    );

    expect(resultado.status).toBe('unmatched');
    expect(resultado.pedido).toBeNull();
    expect(resultado.motivoCodigo).toBe('ambiguo');
    expect(resultado.motivo).toContain('PED-1');
    expect(resultado.motivo).toContain('PED-3');
  });

  it('nao adivinha quando a nota nao tem fornecedor identificado', () => {
    const resultado = conciliarNotaComPedido({ valor_total: 1200, fornecedor_id: null }, [
      pedido('p1', 'PED-1', 1200, 'fornecedor-A'),
    ]);

    expect(resultado.status).toBe('unmatched');
    expect(resultado.pedido).toBeNull();
    expect(resultado.motivoCodigo).toBe('fornecedor-desconhecido');
  });

  it('mantem a tolerancia de um centavo e ignora valor ausente', () => {
    const resultado = conciliarNotaComPedido(
      { valor_total: 100, fornecedor_id: 'fornecedor-A' },
      [pedido('p1', 'PED-1', 100.004, 'fornecedor-A')],
    );
    expect(resultado.status).toBe('matched');

    const semValor = conciliarNotaComPedido(
      { valor_total: null, fornecedor_id: 'fornecedor-A' },
      [pedido('p2', 'PED-2', 0, 'fornecedor-A')],
    );
    expect(semValor.status).toBe('unmatched');
    expect(semValor.motivoCodigo).toBe('sem-candidato');
  });
});

describe('fornecedor do emitente da nota', () => {
  it('normaliza o CNPJ para digitos e resolve o cadastro', () => {
    expect(normalizarCnpj('12.345.678/0001-90')).toBe('12345678000190');
    expect(normalizarCnpj(null)).toBe('');

    const fornecedores = [
      { id: 'f1', cnpj: '11.111.111/0001-11' },
      { id: 'f2', cnpj: '12.345.678/0001-90' },
    ];
    expect(resolverFornecedorPorCnpj(fornecedores, '12345678000190')).toBe('f2');
    expect(resolverFornecedorPorCnpj(fornecedores, '99.999.999/0001-99')).toBeNull();
    expect(resolverFornecedorPorCnpj(fornecedores, '')).toBeNull();
  });
});
