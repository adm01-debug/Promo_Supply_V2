#!/usr/bin/env node
/**
 * reconcilia-produtos-pim.mjs
 *
 * Uso:
 *   node scripts/migracao/reconcilia-produtos-pim.mjs [--out <dir>] [--json] [--help]
 *
 * O que faz:
 *   PR 4.1 do plano de integracao XBZ/Promo Supply V2 (catalogo so no PIM).
 *   Para cada linha de `produtos` (Promo Supply V2), procura o produto
 *   correspondente no PIM (Promo Gifts V4) nesta ordem de criterio:
 *     1. sku            -> products.sku
 *     2. sku_promo      -> products.sku
 *     3. supplier_reference (via produto_fornecedores.codigo_no_fornecedor)
 *                       -> product_variants.supplier_reference (join suppliers)
 *     4. nome normalizado + fornecedor -> products.name normalizado
 *
 *   Script somente leitura: NAO escreve em nenhum banco. Gera um CSV local
 *   com o resultado (match_exato | match_provavel | sem_match) e um
 *   relatorio de cobertura por fornecedor no stdout.
 *
 * Ambiente (via GitHub Actions secrets ou .env local):
 *   SUPABASE_URL                     - Promo Supply V2 (produtos, produto_fornecedores)
 *   SUPABASE_SERVICE_ROLE_KEY        - idem, service role (bypassa RLS, ve todos os tenants)
 *   PROMO_GIFTS_SUPABASE_URL         - PIM (products, product_variants, suppliers)
 *   PROMO_GIFTS_SUPABASE_SECRET_KEY  - idem, service role
 *
 * Saida:
 *   <out>/reconcilia-produtos-pim-<timestamp>.csv
 *   Relatorio por fornecedor impresso no stdout (ou --json para stdout em JSON)
 *
 * Exit codes:
 *   0 - execucao concluida (independente da cobertura encontrada)
 *   1 - erro de configuracao (env var ausente) ou de rede/API
 *   2 - argumentos invalidos
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { realpathSync } from "node:fs";

function lerArgs(argv) {
  const opcoes = { out: "docs/migracao", json: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") {
      opcoes.out = argv[++i];
      if (!opcoes.out) {
        throw new ErroArgumentos("--out requer um diretorio");
      }
    } else if (a === "--json") {
      opcoes.json = true;
    } else if (a === "--help" || a === "-h") {
      opcoes.help = true;
    } else {
      throw new ErroArgumentos(`argumento desconhecido: ${a}`);
    }
  }
  return opcoes;
}

class ErroArgumentos extends Error {}

function normalizarNome(nome) {
  return (nome ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

async function paginarPostgrest(baseUrl, apiKey, tabela, select, filtro = "") {
  const linhas = [];
  const limite = 1000;
  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const url = `${baseUrl}/rest/v1/${tabela}?select=${encodeURIComponent(select)}${filtro ? `&${filtro}` : ""}&limit=${limite}&offset=${offset}`;
    const resp = await fetch(url, {
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        "Accept-Profile": "public",
      },
    });
    if (!resp.ok) {
      throw new Error(
        `falha ao consultar ${tabela} em ${baseUrl}: ${resp.status} ${resp.statusText} - ${await resp.text()}`,
      );
    }
    const pagina = await resp.json();
    linhas.push(...pagina);
    if (pagina.length < limite) break;
    offset += limite;
  }
  return linhas;
}

function montarCliente(env) {
  const supplyUrl = env.SUPABASE_URL;
  const supplyKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const pimUrl = env.PROMO_GIFTS_SUPABASE_URL;
  const pimKey = env.PROMO_GIFTS_SUPABASE_SECRET_KEY;

  const faltando = [];
  if (!supplyUrl) faltando.push("SUPABASE_URL");
  if (!supplyKey) faltando.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!pimUrl) faltando.push("PROMO_GIFTS_SUPABASE_URL");
  if (!pimKey) faltando.push("PROMO_GIFTS_SUPABASE_SECRET_KEY");
  if (faltando.length > 0) {
    throw new Error(`variaveis de ambiente ausentes: ${faltando.join(", ")}`);
  }

  return {
    produtos: () =>
      paginarPostgrest(supplyUrl, supplyKey, "produtos", "id,sku,sku_promo,nome,fornecedor_preferencial_id"),
    produtoFornecedores: () =>
      paginarPostgrest(
        supplyUrl,
        supplyKey,
        "produto_fornecedores",
        "produto_id,fornecedor_id,codigo_no_fornecedor",
      ),
    pimProducts: () => paginarPostgrest(pimUrl, pimKey, "products", "id,sku,name,supplier_id"),
    pimVariants: () =>
      paginarPostgrest(pimUrl, pimKey, "product_variants", "id,product_id,supplier_reference"),
    pimSuppliers: () => paginarPostgrest(pimUrl, pimKey, "suppliers", "id,name"),
  };
}

function indexarPim(pimProducts, pimVariants, pimSuppliers) {
  const porSku = new Map();
  const porNomeNormalizado = new Map();
  for (const p of pimProducts) {
    if (p.sku) porSku.set(p.sku, p);
    const chaveNome = normalizarNome(p.name);
    if (chaveNome) {
      if (!porNomeNormalizado.has(chaveNome)) porNomeNormalizado.set(chaveNome, []);
      porNomeNormalizado.get(chaveNome).push(p);
    }
  }

  const porSupplierReference = new Map();
  for (const v of pimVariants) {
    if (v.supplier_reference) {
      porSupplierReference.set(v.supplier_reference, v);
    }
  }

  const fornecedoresPorId = new Map(pimSuppliers.map((f) => [f.id, f]));
  const produtosPorId = new Map(pimProducts.map((p) => [p.id, p]));

  return { porSku, porNomeNormalizado, porSupplierReference, fornecedoresPorId, produtosPorId };
}

function reconciliar(produtos, produtoFornecedores, indicePim) {
  const fornecedorPorProduto = new Map();
  for (const pf of produtoFornecedores) {
    if (!fornecedorPorProduto.has(pf.produto_id)) fornecedorPorProduto.set(pf.produto_id, []);
    fornecedorPorProduto.get(pf.produto_id).push(pf);
  }

  const resultado = [];

  for (const produto of produtos) {
    let status = "sem_match";
    let pimProductId = "";
    let pimVariantId = "";
    let criterio = "";
    let fornecedorNome = "(sem fornecedor preferencial)";

    const vinculos = fornecedorPorProduto.get(produto.id) ?? [];

    // 1. sku
    if (produto.sku && indicePim.porSku.has(produto.sku)) {
      const pimProduto = indicePim.porSku.get(produto.sku);
      status = "match_exato";
      pimProductId = pimProduto.id;
      criterio = "sku";
    }
    // 2. sku_promo
    else if (produto.sku_promo && indicePim.porSku.has(produto.sku_promo)) {
      const pimProduto = indicePim.porSku.get(produto.sku_promo);
      status = "match_exato";
      pimProductId = pimProduto.id;
      criterio = "sku_promo";
    }
    // 3. supplier_reference via produto_fornecedores.codigo_no_fornecedor
    else {
      for (const vinculo of vinculos) {
        const codigo = vinculo.codigo_no_fornecedor;
        if (codigo && indicePim.porSupplierReference.has(codigo)) {
          const variante = indicePim.porSupplierReference.get(codigo);
          status = "match_exato";
          pimVariantId = variante.id;
          pimProductId = indicePim.produtosPorId.get(variante.product_id)?.id ?? "";
          criterio = "supplier_reference";
          break;
        }
      }
    }

    // 4. nome normalizado (so tenta se nada acima bateu)
    if (status === "sem_match") {
      const chaveNome = normalizarNome(produto.nome);
      const candidatos = indicePim.porNomeNormalizado.get(chaveNome) ?? [];
      if (candidatos.length === 1) {
        status = "match_provavel";
        pimProductId = candidatos[0].id;
        criterio = "nome_normalizado";
      } else if (candidatos.length > 1) {
        status = "match_provavel";
        pimProductId = candidatos[0].id;
        criterio = "nome_normalizado_ambiguo";
      }
    }

    if (produto.fornecedor_preferencial_id) {
      const f = indicePim.fornecedoresPorId.get(produto.fornecedor_preferencial_id);
      fornecedorNome = f?.name ?? `id:${produto.fornecedor_preferencial_id}`;
    } else if (vinculos.length > 0) {
      const f = indicePim.fornecedoresPorId.get(vinculos[0].fornecedor_id);
      fornecedorNome = f?.name ?? `id:${vinculos[0].fornecedor_id}`;
    }

    resultado.push({
      produto_id: produto.id,
      codigo: produto.sku ?? produto.sku_promo ?? "",
      nome: produto.nome ?? "",
      fornecedor: fornecedorNome,
      status,
      pim_product_id: pimProductId,
      pim_variant_id: pimVariantId,
      criterio,
    });
  }

  return resultado;
}

function escaparCsv(valor) {
  const texto = String(valor ?? "");
  if (/[",\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

function paraCsv(linhas) {
  const cabecalho = [
    "produto_id",
    "codigo",
    "nome",
    "fornecedor_codigo",
    "status",
    "pim_product_id",
    "pim_variant_id",
    "criterio",
  ];
  const corpo = linhas.map((l) =>
    [l.produto_id, l.codigo, l.nome, l.fornecedor, l.status, l.pim_product_id, l.pim_variant_id, l.criterio]
      .map(escaparCsv)
      .join(","),
  );
  return [cabecalho.join(","), ...corpo].join("\n") + "\n";
}

function relatorioPorFornecedor(linhas) {
  const porFornecedor = new Map();
  for (const l of linhas) {
    if (!porFornecedor.has(l.fornecedor)) {
      porFornecedor.set(l.fornecedor, { total: 0, match_exato: 0, match_provavel: 0, sem_match: 0 });
    }
    const stats = porFornecedor.get(l.fornecedor);
    stats.total += 1;
    stats[l.status] += 1;
  }

  return Array.from(porFornecedor.entries())
    .map(([fornecedor, stats]) => ({
      fornecedor,
      ...stats,
      cobertura_pct: stats.total > 0 ? Number((((stats.match_exato + stats.match_provavel) / stats.total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

async function principal(argv, env) {
  let opcoes;
  try {
    opcoes = lerArgs(argv);
  } catch (e) {
    if (e instanceof ErroArgumentos) {
      console.error(`Erro de argumentos: ${e.message}`);
      return 2;
    }
    throw e;
  }

  if (opcoes.help) {
    console.log(
      "Uso: node scripts/migracao/reconcilia-produtos-pim.mjs [--out <dir>] [--json] [--help]",
    );
    return 0;
  }

  let cliente;
  try {
    cliente = montarCliente(env);
  } catch (e) {
    console.error(`Erro de configuracao: ${e.message}`);
    return 1;
  }

  try {
    const [produtos, produtoFornecedores, pimProducts, pimVariants, pimSuppliers] = await Promise.all([
      cliente.produtos(),
      cliente.produtoFornecedores(),
      cliente.pimProducts(),
      cliente.pimVariants(),
      cliente.pimSuppliers(),
    ]);

    const indicePim = indexarPim(pimProducts, pimVariants, pimSuppliers);
    const resultado = reconciliar(produtos, produtoFornecedores, indicePim);
    const relatorio = relatorioPorFornecedor(resultado);

    mkdirSync(opcoes.out, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const caminhoCsv = join(opcoes.out, `reconcilia-produtos-pim-${timestamp}.csv`);
    writeFileSync(caminhoCsv, paraCsv(resultado), "utf8");

    if (opcoes.json) {
      console.log(JSON.stringify({ csv: caminhoCsv, total: resultado.length, relatorio }, null, 2));
    } else {
      console.log(`CSV gerado: ${caminhoCsv} (${resultado.length} produtos)`);
      console.log("\nCobertura por fornecedor:");
      for (const r of relatorio) {
        console.log(
          `  ${r.fornecedor}: ${r.cobertura_pct}% (${r.match_exato + r.match_provavel}/${r.total} — exato:${r.match_exato} provavel:${r.match_provavel} sem_match:${r.sem_match})`,
        );
      }
    }

    return 0;
  } catch (e) {
    console.error(`Erro ao reconciliar: ${e.message}`);
    return 1;
  }
}

function ehPrincipal() {
  try {
    return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
}

if (ehPrincipal()) {
  principal(process.argv.slice(2), process.env).then((codigo) => process.exit(codigo));
}

export { principal, normalizarNome, reconciliar, paraCsv, relatorioPorFornecedor, indexarPim };
