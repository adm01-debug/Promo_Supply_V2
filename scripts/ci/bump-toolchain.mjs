#!/usr/bin/env node
/**
 * W40: Verifica se há versão mais nova das ferramentas em .github/toolchain.json.
 * Usa a API do GitHub (ou fallback público) para cada ferramenta.
 * Saída: lista de atualizações disponíveis + link para changelog.
 * Não falha (exit 0) mesmo quando há updates — é informativo.
 * Rodado semanalmente via branch-hygiene-audit ou job próprio.
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const TOKEN = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN ?? '';
const TOOLCHAIN_PATH = new URL('../../.github/toolchain.json', import.meta.url);

const toolchain = JSON.parse(readFileSync(TOOLCHAIN_PATH, 'utf8'));

const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'bump-toolchain/1.0',
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

/** Busca o tag da latest release de um repo GitHub. Retorna null se falhar. */
async function latestRelease(repo) {
  const url = `https://api.github.com/repos/${repo}/releases/latest`;
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    return data.tag_name ?? null;
  } catch {
    return null;
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

/** Compara versões simples: retorna true se remota > local. */
function maisNova(local, remota) {
  const lp = semver(local).split('.').map((x) => parseInt(x, 10) || 0);
  const rp = semver(remota).split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(lp.length, rp.length); i++) {
    const l = lp[i] ?? 0;
    const r = rp[i] ?? 0;
    if (r > l) return true;
    if (l > r) return false;
  }
  return false;
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

  const checks = await Promise.all(
    FERRAMENTAS.map(async ({ chave, repo, changelog }) => {
      const local = toolchain[chave];
      if (!local) return null;
      const remota = await latestRelease(repo);
      return { chave, repo, changelog, local, remota };
    }),
  );

  for (const r of checks) {
    if (!r) continue;
    const { chave, repo, changelog, local, remota } = r;
    if (!remota) {
      erros.push(`${chave}: não foi possível consultar ${repo}`);
      continue;
    }
    if (maisNova(local, remota)) {
      updates.push({ chave, local: semver(local), remota: semver(remota), changelog });
    }
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
  } else if (erros.length > 0 && checks.filter(Boolean).length === erros.length) {
    // Nenhuma ferramenta pode ser consultada: dizer "esta na versao mais recente" com ✅
    // e o dono lendo verde onde nada foi verificado.
    linhas.push('⚠️ Nenhuma ferramenta pôde ser verificada nesta execução (ver abaixo).');
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

main().catch((e) => {
  console.error('::warning::bump-toolchain falhou:', e.message);
  // Não propaga falha — verificação de versão é melhor-esforço
});
