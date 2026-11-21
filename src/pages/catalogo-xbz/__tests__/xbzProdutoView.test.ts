import { describe, expect, it } from 'vitest';
import { parseXbzNumber, produtoView } from '../xbzHelpers';

/** Recorte real de `consultaEstoque`/`mxbzConsultaEstoque` (21/11/2026, DOCS/INTEGRACOES/XBZ.md §4.3). */
const ITEM = {
  IdProduto: 23520,
  CodigoXbz: 'X235202',
  CodigoComposto: '09211-AZU/PRE',
  Nome: 'Caneta Plástica',
  CorPredominante: { Id: 1, NomeCor: 'AZUL', SiglaCor: 'AZU' },
  PrecoVenda: 1.2,
  VendaMinima: 100,
  Multiplos: 50,
  ImageLink: 'https://cdn.xbzbrindes.com.br/img/produtos/09211-AZU.jpg',
  Disponivel: 'SIM',
  QtdDisponivel: 0,
  QtdDisponivelExibicao: '8.044',
};

describe('produtoView', () => {
  it('lê os campos reais da API (IdProduto, CodigoXbz, PrecoVenda, CorPredominante, ImageLink)', () => {
    const v = produtoView(ITEM);
    expect(v.id).toBe(23520);
    expect(v.sku).toBe('X235202');
    expect(v.nome).toBe('Caneta Plástica');
    expect(v.cor).toBe('AZUL');
    expect(v.preco).toBe(1.2);
    expect(v.vendaMinima).toBe(100);
    expect(v.multiplos).toBe(50);
    expect(v.disponivel).toBe('SIM');
    expect(v.imagem).toBe(ITEM.ImageLink);
  });

  it('usa QtdDisponivelExibicao ("8.044") quando QtdDisponivel vem 0', () => {
    expect(produtoView(ITEM).quantidade).toBe(8044);
    expect(produtoView({ ...ITEM, QtdDisponivel: 25 }).quantidade).toBe(25);
    expect(produtoView({ IdProduto: 1 }).quantidade).toBeNull();
  });

  it('item sem IdProduto vira id 0 (botão "Adicionar" fica desabilitado)', () => {
    const v = produtoView({ Nome: 'x', ProdutoId: 5 });
    expect(v.id).toBe(0);
    expect(v.cor).toBeNull();
    expect(v.preco).toBeNull();
    expect(v.vendaMinima).toBe(1);
  });
});

describe('parseXbzNumber', () => {
  it('converte pt-BR e números', () => {
    expect(parseXbzNumber('8.044')).toBe(8044);
    expect(parseXbzNumber('12,50')).toBe(12.5);
    expect(parseXbzNumber(3)).toBe(3);
    expect(parseXbzNumber('')).toBeNull();
    expect(parseXbzNumber(undefined)).toBeNull();
  });
});
