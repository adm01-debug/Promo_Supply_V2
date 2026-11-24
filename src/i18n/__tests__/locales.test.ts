import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import pt from '@/locales/pt/translation.json';
import en from '@/locales/en/translation.json';
import es from '@/locales/es/translation.json';

const caminhos = (obj: unknown, prefixo = ''): string[] =>
  Object.entries(obj as Record<string, unknown>).flatMap(([chave, valor]) =>
    valor && typeof valor === 'object'
      ? caminhos(valor, `${prefixo}${chave}.`)
      : [`${prefixo}${chave}`],
  );

const textosVazios = (obj: unknown): string[] => {
  const vazios: string[] = [];
  const coletar = (no: unknown, prefixo = ''): void => {
    Object.entries(no as Record<string, unknown>).forEach(([chave, valor]) => {
      if (valor && typeof valor === 'object') coletar(valor, `${prefixo}${chave}.`);
      else if (String(valor).trim() === '') vazios.push(`${prefixo}${chave}`);
    });
  };
  coletar(obj);
  return vazios;
};

describe('chaves que a tela do catalogo usa existem de verdade', () => {
  it('pt, en e es trazem catalog.title, catalog.subtitle e common.new com texto real', () => {
    expect(pt.catalog.title).toBe('Catálogo de Produtos');
    expect(pt.catalog.subtitle).toBe('Gerencie produtos, preços e categorias');
    expect(pt.common.new).toBe('Novo');

    expect(en.catalog.title).toBe('Product Catalog');
    expect(en.catalog.subtitle).toBe('Manage products, prices and categories');
    expect(en.common.new).toBe('New');

    expect(es.catalog.title).toBe('Catálogo de Productos');
    expect(es.catalog.subtitle).toBe('Gestione productos, precios y categorías');
    expect(es.common.new).toBe('Nuevo');
  });

  it('CatalogoProdutos.tsx chama exatamente essas chaves (senao elas ficam mortas)', () => {
    const arquivo = path.resolve(process.cwd(), 'src/pages/catalogo-produtos/CatalogoProdutos.tsx');
    const fonte = fs.readFileSync(arquivo, 'utf-8');
    for (const chave of ['catalog.title', 'catalog.subtitle', 'common.new']) {
      expect(fonte).toContain(`t("${chave}"`);
    }
  });
});

describe('pt, en e es cobrem as mesmas chaves', () => {
  it('nenhuma chave de pt falta em en', () => {
    const emEn = new Set(caminhos(en));
    expect(caminhos(pt).filter((c) => !emEn.has(c)).sort()).toEqual([]);
  });

  it('nenhuma chave de pt falta em es', () => {
    const emEs = new Set(caminhos(es));
    expect(caminhos(pt).filter((c) => !emEs.has(c)).sort()).toEqual([]);
  });

  it('nenhum texto e vazio ou so espaco nos tres idiomas', () => {
    expect([
      ...textosVazios(pt),
      ...textosVazios(en),
      ...textosVazios(es),
    ]).toEqual([]);
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

  it('es diz Esperando Cotizacion pelo mesmo motivo', () => {
    expect(es.dashboard.kpis.pending_approval).toBe('Esperando Cotización');
    expect(es.dashboard.kpis.pending_approval).not.toBe('Pendiente de Aprobación');
  });
});

describe('nenhuma tela esconde chave faltando atras de fallback embutido', () => {
  it('zero chamadas t("chave", "texto") em src fora de testes', () => {
    const raiz = path.resolve(process.cwd(), 'src');
    const chamadaComFallback = /(?<![ \w.])t\(\s*['"][^'"]+['"]\s*,\s*(?!\{)/g;
    const ocorrencias: string[] = [];
    const visitar = (dir: string): void => {
      for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
        const completo = path.join(dir, entrada.name);
        if (entrada.isDirectory()) {
          if (entrada.name !== '__tests__') visitar(completo);
          continue;
        }
        if (!/\.tsx?$/.test(entrada.name)) continue;
        const fonte = fs.readFileSync(completo, 'utf-8');
        for (const achado of fonte.matchAll(chamadaComFallback)) {
          const linha = fonte.slice(0, achado.index ?? 0).split('\n').length;
          ocorrencias.push(`${path.relative(raiz, completo)}:${linha} ${achado[0]}`);
        }
      }
    };
    visitar(raiz);
    expect(ocorrencias).toEqual([]);
  });
});
