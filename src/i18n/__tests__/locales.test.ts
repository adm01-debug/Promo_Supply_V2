import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import pt from '@/locales/pt/translation.json';
import en from '@/locales/en/translation.json';

const caminhos = (obj: unknown, prefixo = ''): string[] =>
  Object.entries(obj as Record<string, unknown>).flatMap(([chave, valor]) =>
    valor && typeof valor === 'object'
      ? caminhos(valor, `${prefixo}${chave}.`)
      : [`${prefixo}${chave}`],
  );

describe('chaves que a tela do catalogo usa existem de verdade', () => {
  it('pt e en trazem catalog.title, catalog.subtitle e common.new com texto real', () => {
    expect(pt.catalog.title).toBe('Catálogo de Produtos');
    expect(pt.catalog.subtitle).toBe('Gerencie produtos, preços e categorias');
    expect(pt.common.new).toBe('Novo');

    expect(en.catalog.title).toBe('Product Catalog');
    expect(en.catalog.subtitle).toBe('Manage products, prices and categories');
    expect(en.common.new).toBe('New');
  });

  it('CatalogoProdutos.tsx chama exatamente essas chaves (senao elas ficam mortas)', () => {
    const arquivo = path.resolve(process.cwd(), 'src/pages/catalogo-produtos/CatalogoProdutos.tsx');
    const fonte = fs.readFileSync(arquivo, 'utf-8');
    for (const chave of ['catalog.title', 'catalog.subtitle', 'common.new']) {
      expect(fonte).toContain(`t("${chave}"`);
    }
  });

  it('nenhuma chave de pt falta em en', () => {
    const emPt = caminhos(pt).sort();
    const emEn = new Set(caminhos(en));
    expect(emPt.filter((c) => !emEn.has(c))).toEqual([]);
  });

  it('nenhum texto e vazio ou so espaco', () => {
    const valores: [string, string][] = [];
    const coletar = (obj: unknown, prefixo = ''): void => {
      Object.entries(obj as Record<string, unknown>).forEach(([chave, valor]) => {
        if (valor && typeof valor === 'object') coletar(valor, `${prefixo}${chave}.`);
        else valores.push([`${prefixo}${chave}`, String(valor)]);
      });
    };
    coletar(pt);
    coletar(en);
    expect(valores.filter(([, v]) => v.trim() === '')).toEqual([]);
  });
});

describe('o KPI do dashboard nomeia a etapa que a RPC conta', () => {
  it('pt diz Aguardando Cotacao (status pendente/em_cotacao na RPC)', () => {
    expect(pt.dashboard.kpis.pending_approval).toBe('Aguardando Cotação');
  });

  it('en diz Awaiting Quote e nao Pending Approval, que e outra etapa do fluxo', () => {
    expect(en.dashboard.kpis.pending_approval).toBe('Awaiting Quote');
    expect(en.dashboard.kpis.pending_approval).not.toBe('Pending Approval');
  });
});
