#!/usr/bin/env node
/**
 * W40: Verifica se há versão mais nova das ferramentas em .github/toolchain.json.
 * Usa a API do GitHub (ou fallback público) para cada ferramenta.
 * Saída: lista de atualizações disponíveis + link para changelog.
 * Não falha (exit 0) mesmo quando há updates — é informativo.
 * Rodado semanalmente via branch-hygiene-audit ou job próprio.
 */

import { readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const TOKEN = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN ?? '';
const TOOLCHAIN_PATH = new URL('../../.github/toolchain.json', import.meta.url);
// Mesma variavel que o actions-kpi.mjs le (o runner a define como https://api.github.com);
// e' o que deixa a suite apontar o script para uma API falsa local.
const API = process.env.GITHUB_API_URL || 'https://api.github.com';

const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'bump-toolchain/1.0',
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

/**
 * Busca o tag da latest release de um repo GitHub. Devolve `{ tag }` ou, se falhar,
 * `{ motivo }` -- antes devolvia so `null`, e 403 de rate limit, 404 e rede fora do ar
 * saiam todos como o mesmo "não foi possível consultar".
 */
async function latestRelease(repo) {
  const url = `${API}/repos/${repo}/releases/latest`;
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return { motivo: `HTTP ${res.status}` };
    const data = await res.json();
    return data?.tag_name ? { tag: data.tag_name } : { motivo: 'resposta sem tag_name' };
  } catch (e) {
    return { motivo: e.cause?.code ?? e.cause?.message ?? e.message };
  }
}

/**
 * Remove qualquer prefixo nao numerico para comparar versoes como semver puro.
 * Nao basta tirar o `v`: a tag de release do bun e `bun-v1.5.0`, e com `replace(/^v/)`
 * o primeiro componente virava `parseInt('bun-v1') = NaN -> 0`, entao bun NUNCA reportava
 * atualizacao -- sendo uma das duas ferramentas que o toolchain.json declara.
 */
function semver(v) {
  return String(v ?? '').replace(/^[^0-9]*/u, '');
}

/**
 * Separa a versao em componentes numericos e sufixo de pre-release.
 * `v1.60.0-rc.1` -> { numeros: [1, 60, 0], pre: 'rc.1' }; `22` -> { numeros: [22], pre: '' };
 * `v1.x` -> { numeros: [1], pre: '' }; `lts/*` e `canary` -> { numeros: [] } (nao e versao).
 * O `+build` (metadado de build) nao entra na comparacao.
 */
export function partes(v) {
  const [semBuild] = semver(v).split('+');
  const hifen = semBuild.indexOf('-');
  const nucleo = hifen < 0 ? semBuild : semBuild.slice(0, hifen);
  const numeros = [];
  for (const p of nucleo.split('.')) {
    if (!/^\d+$/u.test(p)) break;
    numeros.push(Number(p));
  }
  return { numeros, pre: hifen < 0 ? '' : semBuild.slice(hifen + 1) };
}

/** Ordem de pre-release do semver (item 11): numerico < texto; numerico compara como numero. */
function compararPre(a, b) {
  const pa = a.split('.');
  const pb = b.split('.');
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if (pa[i] === undefined) return -1;
    if (pb[i] === undefined) return 1;
    const na = /^\d+$/u.test(pa[i]);
    const nb = /^\d+$/u.test(pb[i]);
    if (na && nb && Number(pa[i]) !== Number(pb[i])) return Number(pa[i]) - Number(pb[i]);
    if (na !== nb) return na ? -1 : 1;
    if (!na && pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  }
  return 0;
}

/**
 * Compara versões: retorna true se remota > local.
 *
 * Tres defeitos da versao anterior (`split('.')` + `parseInt(x) || 0`), todos medidos:
 *  - pin parcial e' FAIXA: `node: "22"` (o `node-version: '22'` dos workflows) contra
 *    `v22.21.1` dava "atualizacao disponivel" toda semana, porque o componente ausente
 *    virava 0. Pin com menos de 3 componentes (ou com `x`) so' compara o que declara;
 *  - pre-release: `1.60.0-rc.1` saia como mais nova que `1.60.0` (o `rc`/`1` entrava como
 *    quarto componente). Pre-release e' MENOR que a versao final de mesmo numero;
 *  - metadado de build (`1.4.0+build.5`) contava como versao nova.
 */
export function maisNova(local, remota) {
  const l = partes(local);
  const r = partes(remota);
  const faixa = l.numeros.length < 3;
  const ate = faixa ? l.numeros.length : Math.max(l.numeros.length, r.numeros.length);
  for (let i = 0; i < ate; i++) {
    const a = l.numeros[i] ?? 0;
    const b = r.numeros[i] ?? 0;
    if (b > a) return true;
    if (a > b) return false;
  }
  if (faixa || l.pre === r.pre) return false;
  if (l.pre === '' || r.pre === '') return r.pre === '';
  return compararPre(l.pre, r.pre) < 0;
}

// Mapeamento ferramenta → repo GitHub + URL do changelog
const FERRAMENTAS = [
  {
    chave: 'bun',
    repo: 'oven-sh/bun',
    changelog: 'https://github.com/oven-sh/bun/releases',
  },
  {
    chave: 'deno',
    repo: 'denoland/deno',
    changelog: 'https://github.com/denoland/deno/releases',
  },
  {
    chave: 'supabase-cli',
    repo: 'supabase/cli',
    changelog: 'https://github.com/supabase/cli/releases',
  },
  {
    chave: 'playwright',
    repo: 'microsoft/playwright',
    changelog: 'https://github.com/microsoft/playwright/releases',
  },
  {
    chave: 'actionlint-version',
    repo: 'rhysd/actionlint',
    changelog: 'https://github.com/rhysd/actionlint/releases',
  },
  {
    // Sem esta entrada, `node` no .github/toolchain.json era valor inerte: estava escrito,
    // nunca lido, e bump de Node nunca seria avisado.
    chave: 'node',
    repo: 'nodejs/node',
    changelog: 'https://github.com/nodejs/node/releases',
  },
];

async function main() {
  const updates = [];
  const erros = [];

  // A leitura ficava no topo do modulo: toolchain.json ausente ou malformado derrubava o
  // script com stack trace e exit 1 -- e, por ser o primeiro passo do job, a auditoria
  // semanal inteira. A promessa do cabecalho e' "informativo, sai 0": avisa e segue.
  let toolchain = {};
  let falhaLeitura = null;
  try {
    const lido = JSON.parse(readFileSync(TOOLCHAIN_PATH, 'utf8'));
    if (lido === null || typeof lido !== 'object' || Array.isArray(lido)) throw new Error('o conteúdo não é um objeto JSON');
    toolchain = lido;
  } catch (e) {
    // Uma linha so': o erro do JSON.parse cita um trecho do arquivo, com quebra de linha,
    // e isso partiria a anotacao `::warning::` e a linha do relatorio.
    falhaLeitura = String(e.message).replace(/\s+/gu, ' ');
    console.error(`::warning::bump-toolchain: .github/toolchain.json ilegível — ${falhaLeitura}`);
  }

  const checks = await Promise.all(
    FERRAMENTAS.map(async ({ chave, repo, changelog }) => {
      if (!Object.hasOwn(toolchain, chave)) return null;
      const local = toolchain[chave];
      // Pin que nao e' versao (`lts/*`, vazio, objeto) nao tem o que comparar: nem consulta.
      if (partes(local).numeros.length === 0) return { chave, repo, changelog, local, pinInvalido: true };
      const { tag: remota, motivo } = await latestRelease(repo);
      return { chave, repo, changelog, local, remota, motivo };
    }),
  );

  // Quantas ferramentas foram de fato comparadas: e' o que autoriza o "✅" la embaixo.
  let verificadas = 0;
  for (const r of checks) {
    if (!r) continue;
    const { chave, repo, changelog, local, remota, motivo, pinInvalido } = r;
    if (pinInvalido) {
      erros.push(`${chave}: versão pinada não reconhecida (${JSON.stringify(local)})`);
      continue;
    }
    if (!remota) {
      erros.push(`${chave}: não foi possível consultar ${repo} (${motivo})`);
      continue;
    }
    // Tag sem numero (`canary`, `latest`) virava versao 0 e a ferramenta saia como "na
    // versão mais recente" sem ter sido comparada com nada.
    if (partes(remota).numeros.length === 0) {
      erros.push(`${chave}: a tag ${JSON.stringify(remota)} de ${repo} não tem versão numérica`);
      continue;
    }
    verificadas += 1;
    if (maisNova(local, remota)) {
      updates.push({ chave, local: semver(local), remota: semver(remota), changelog });
    }
  }

  // Chave declarada no toolchain.json sem entrada em FERRAMENTAS era valor inerte: escrita,
  // nunca lida, e o relatorio dizia "todas verificadas". Chave com `_` e' comentario.
  const mapeadas = new Set(FERRAMENTAS.map((f) => f.chave));
  for (const chave of Object.keys(toolchain)) {
    if (chave.startsWith('_') || mapeadas.has(chave)) continue;
    erros.push(`${chave}: sem mapeamento em scripts/ci/bump-toolchain.mjs (FERRAMENTAS) — versão não verificada`);
  }

  // Saída para o Job Summary quando disponível
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  const linhas = [];
  linhas.push('## 🔧 Toolchain — verificação de versões (W40)');
  linhas.push('');
  linhas.push(`Verificado em: ${new Date().toISOString().slice(0, 10)}`);
  linhas.push('');

  if (updates.length > 0) {
    linhas.push('### ⬆️ Atualizações disponíveis');
    linhas.push('');
    linhas.push('| Ferramenta | Pinada | Disponível | Changelog |');
    linhas.push('|---|---|---|---|');
    for (const { chave, local, remota, changelog } of updates) {
      linhas.push(`| \`${chave}\` | \`${local}\` | \`${remota}\` | [ver](${changelog}) |`);
    }
    linhas.push('');
    linhas.push(
      '> Para atualizar: edite `.github/toolchain.json` e os SHAs nos workflows afetados.',
    );
  } else if (falhaLeitura) {
    linhas.push(`⚠️ \`.github/toolchain.json\` não pôde ser lido (${falhaLeitura}): nenhuma ferramenta foi verificada.`);
  } else if (verificadas === 0) {
    // Nenhuma ferramenta pode ser consultada: dizer "esta na versao mais recente" com ✅
    // e o dono lendo verde onde nada foi verificado. Vale tambem para toolchain.json sem
    // nenhuma ferramenta declarada (antes: "✅ Todas ... na versão mais recente").
    linhas.push(
      erros.length > 0
        ? '⚠️ Nenhuma ferramenta pôde ser verificada nesta execução (ver abaixo).'
        : '⚠️ Nenhuma ferramenta declarada em `.github/toolchain.json`: nada foi verificado.',
    );
  } else {
    linhas.push('✅ Todas as ferramentas verificadas estão na versão mais recente.');
  }

  if (erros.length > 0) {
    linhas.push('');
    linhas.push('### ⚠️ Não foi possível verificar');
    for (const e of erros) {
      linhas.push(`- ${e}`);
    }
  }

  const saida = linhas.join('\n');
  console.log(saida);

  if (summaryPath) {
    const { writeFileSync, appendFileSync } = await import('node:fs');
    try {
      appendFileSync(summaryPath, '\n' + saida + '\n');
    } catch {
      // não fatal
    }
  }

  // Sempre exit 0 — informativo, não bloqueia
  if (updates.length > 0) {
    console.log(`\n${updates.length} atualização(ões) disponível(eis) — veja a tabela acima.`);
  }
}

// O modulo agora exporta `maisNova`/`partes` para a suite: sem esta guarda, importar o
// arquivo num teste dispararia as consultas. Os dois lados passam por `realpathSync`
// para o script nao virar no-op quando chamado por symlink.
function executadoDireto() {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (executadoDireto()) {
  main().catch((e) => {
    console.error('::warning::bump-toolchain falhou:', e.message);
    // Não propaga falha — verificação de versão é melhor-esforço
  });
}
