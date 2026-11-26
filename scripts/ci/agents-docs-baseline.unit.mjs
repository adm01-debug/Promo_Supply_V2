// Baseline das instrucoes para agentes: frases que outra sessao nao pode apagar sem decidir apagar.
// Roda com `npm run test:scripts` (node --test scripts/ci/*.unit.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ler = (rel) => readFileSync(path.join(root, rel), 'utf8');

test('CLAUDE.md e apenas o import de AGENTS.md', () => {
  assert.equal(ler('CLAUDE.md').trim(), '@AGENTS.md');
});

test('AGENTS.md tem as secoes que o guard de integridade exige', () => {
  const conteudo = ler('AGENTS.md');
  for (const secao of [
    '## Postura',
    '## Bugs e funcionalidades',
    '## Comunicação',
    '## Fluxo Git',
    '## Banco',
    '## Serviços',
    '## Stack e comandos',
    '## Contexto gerado',
  ]) {
    assert.ok(conteudo.includes(secao), `secao ausente em AGENTS.md: ${secao}`);
  }
});

test('AGENTS.md aponta o projeto Supabase oficial e nao reintroduz os refs errados', () => {
  const conteudo = ler('AGENTS.md') + ler('docs/agentes/banco.md');
  assert.match(conteudo, /lmypcdfsrgfftzhxawao/, 'ref oficial do Supabase ausente');
  // Os dois refs abaixo sao historicos (apontavam para projetos que nao sao deste repo); podem ser
  // citados como "nao usar", mas nunca como destino. O guard aqui so garante que continuam
  // marcados como proibidos no texto.
  for (const ref of ['trwgmplubeqxrxpncdgf', 'nnmwsszvhpuhiquwxkgr']) {
    if (conteudo.includes(ref)) {
      assert.match(
        conteudo,
        new RegExp(`${ref}[^\\n]*(NÃO|não|proibid|errad|antig)`),
        `${ref} citado sem a marca de proibido`,
      );
    }
  }
});

test('docs/agentes/ cobre banco, GitHub/CI, deploy, mapa do repo e contexto', () => {
  for (const doc of [
    'docs/agentes/banco.md',
    'docs/agentes/github-ci.md',
    'docs/agentes/deploy.md',
    'docs/agentes/mapa-repo.md',
    'docs/agentes/contexto-ia.md',
  ]) {
    assert.ok(existsSync(path.join(root, doc)), `doc ausente: ${doc}`);
  }
});

test('guard de integridade das instrucoes passa no estado atual', () => {
  const saida = execFileSync('node', ['scripts/ci/check-agents-md-integrity.mjs'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.match(saida, /AGENTS\.md OK/);
});

// ── Regressao do guard num repositorio sintetico ──────────────────────────────
// O guard le o diretorio corrente e a base pelo git; um repo descartavel em tmp exercita o
// script inteiro sem tocar neste checkout. GIT_CEILING_DIRECTORIES impede o git de subir
// ate um `.git` alheio quando o caso roda fora de repositorio.
const GUARD = path.join(root, 'scripts', 'ci', 'check-agents-md-integrity.mjs');
const SECOES = [
  '## Postura',
  '## Bugs e funcionalidades',
  '## Comunicação',
  '## Fluxo Git',
  '## Banco',
  '## Serviços',
  '## Stack e comandos',
  '## Contexto gerado',
];

function repoSintetico(extras = {}, { comGit = true } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'agents-guard-'));
  const escrever = (rel, conteudo) => {
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    writeFileSync(path.join(dir, rel), conteudo);
  };
  escrever('AGENTS.md', SECOES.map((secao) => `${secao}\n${'x'.repeat(300)}\n`).join(''));
  escrever('CLAUDE.md', '@AGENTS.md\n');
  escrever('docs/agentes/banco.md', 'a'.repeat(4000));
  escrever('docs/agentes/deploy.md', 'b'.repeat(4000));
  for (const [rel, conteudo] of Object.entries(extras)) escrever(rel, conteudo);
  const ambiente = { ...process.env, GIT_CEILING_DIRECTORIES: path.dirname(dir) };
  delete ambiente.AGENTS_MD_BASE;
  const git = (...args) =>
    execFileSync('git', ['-c', 'user.name=guard', '-c', 'user.email=guard@example.invalid', '-c', 'commit.gpgsign=false', ...args], {
      cwd: dir,
      env: ambiente,
      stdio: 'pipe',
    });
  if (comGit) {
    git('init', '-q', '-b', 'main');
    git('add', '-A');
    git('commit', '-q', '--no-verify', '-m', 'docs: base sintetica das instrucoes');
  }
  const guard = (base) =>
    spawnSync(process.execPath, [GUARD], {
      cwd: dir,
      encoding: 'utf8',
      env: base === undefined ? ambiente : { ...ambiente, AGENTS_MD_BASE: base },
    });
  return { dir, escrever, guard, limpar: () => rmSync(dir, { recursive: true, force: true }) };
}

test('guard: estado igual a base passa; arquivo esvaziado, apagado ou secao removida reprova', () => {
  const repo = repoSintetico();
  try {
    assert.equal(repo.guard().status, 0);
    repo.escrever('docs/agentes/banco.md', '');
    const esvaziado = repo.guard();
    assert.equal(esvaziado.status, 1, esvaziado.stdout);
    repo.escrever('docs/agentes/banco.md', 'a'.repeat(4000));
    rmSync(path.join(repo.dir, 'docs/agentes/deploy.md'));
    assert.equal(repo.guard().status, 1);
    repo.escrever('docs/agentes/deploy.md', 'b'.repeat(4000));
    repo.escrever('AGENTS.md', SECOES.filter((s) => s !== '## Banco').map((s) => `${s}\n${'x'.repeat(340)}\n`).join(''));
    const semSecao = repo.guard();
    assert.equal(semSecao.status, 1);
    assert.match(semSecao.stderr, /secao obrigatoria ausente: ## Banco/);
  } finally {
    repo.limpar();
  }
});

test('guard: AGENTS_MD_BASE que nao resolve reprova em vez de sair OK sem comparar', () => {
  // Medido: com a ref inexistente (base nao buscada, nome errado) o guard imprimia
  // "AGENTS.md OK" e saia 0 -- inclusive com um doc esvaziado no mesmo checkout.
  const repo = repoSintetico();
  try {
    repo.escrever('docs/agentes/banco.md', '');
    for (const base of ['origin/nao-existe', 'HEAD~1']) {
      const r = repo.guard(base);
      assert.equal(r.status, 1, `${base}: ${r.stdout}${r.stderr}`);
      assert.match(r.stderr, /nao resolve para um commit/);
    }
  } finally {
    repo.limpar();
  }
});

test('guard: doc com acento ou espaco no nome continua vigiado', () => {
  // Medido: o nome ia para o shell sem aspas (espaco virava dois argumentos) e o
  // `git ls-tree` devolvia o acento com escape octal entre aspas; nos dois casos o
  // arquivo saia da lista da base e podia ser apagado/esvaziado com o guard verde.
  for (const nome of ['docs/agentes/comunicação.md', 'docs/agentes/meu doc.md']) {
    const repo = repoSintetico({ [nome]: 'c'.repeat(4000) });
    try {
      assert.equal(repo.guard().status, 0);
      repo.escrever(nome, '');
      const r = repo.guard();
      assert.equal(r.status, 1, `${nome} esvaziado deveria reprovar: ${r.stdout}`);
      assert.match(r.stderr, /encolheu 100%/);
      assert.ok(r.stderr.includes(nome), r.stderr);
    } finally {
      repo.limpar();
    }
  }
});

test('guard: workflow novo, contagem errada e "nao ha protecao" viram fato cobrado', () => {
  // Etapa 271. Ate a 270 o guard provava secoes, tamanho e visibilidade: o manual podia afirmar
  // "Sao 7 workflows" (eram 15) ou "nenhum workflow publica edge" e o guard dava OK. Aqui as
  // afirmacoes de numero e de nome viram assercao contra o proprio checkout.
  const agents =
    SECOES.map((s) => `${s}\n${'x'.repeat(300)}\n`).join('') +
    '- Repo `adm01-debug/Promo_Supply_V2`, `main`, **público**.\n' +
    '- A proteção de `main` exige **um** check obrigatório (`Contratos da automação local`).\n' +
    '- São **2**\n  workflows (`ls .github/workflows/*.yml`).\n' +
    '- O `deploy-edge-functions.yml` publica as edges no push da `main`.\n' +
    '- O canal de DDL é o `aplicar-migration-prod.yml` (dispatch manual).\n' +
    '- São 5 migrations hoje.\n';
  const docCi = [
    '- `deploy-edge-functions` publica as edges.',
    '- `aplicar-migration-prod` aplica DDL.',
    '',
  ].join('\n');
  const extras = {
    'AGENTS.md': agents,
    'docs/agentes/github-ci.md': docCi,
    '.gitignore': '.env\n.env.*\n!.env.example\n',
    '.github/workflows/deploy-edge-functions.yml': 'run: supabase functions deploy "$FUNCAO"\n',
    '.github/workflows/aplicar-migration-prod.yml': 'run: psql --single-transaction -f "$ARQUIVO"\n',
  };
  for (const nome of ['a', 'b', 'c', 'd', 'e']) extras[`supabase/migrations/2026${nome}.sql`] = 'select 1;\n';
  const repo = repoSintetico(extras);
  try {
    const limpo = repo.guard();
    assert.equal(limpo.status, 0, limpo.stderr);

    // 1) workflow novo que a lista de referencia nao cita
    repo.escrever('.github/workflows/provisionar-novo.yml', 'run: echo oi\n');
    const naoCitado = repo.guard();
    assert.equal(naoCitado.status, 1);
    assert.match(naoCitado.stderr, /nao cita provisionar-novo\.yml/);
    assert.match(naoCitado.stderr, /afirma 2 workflows, mas \.github\/workflows tem 3/);

    // 2) citado e com a contagem certa, volta a passar
    repo.escrever('docs/agentes/github-ci.md', `${docCi}- \`provisionar-novo\` provisiona.\n`);
    repo.escrever('AGENTS.md', agents.replace('**2**', '**3**'));
    const corrigido = repo.guard();
    assert.equal(corrigido.status, 0, corrigido.stderr);

    // 3) `deploy-edge-functions.yml` que nao publica mais nada
    repo.escrever('.github/workflows/deploy-edge-functions.yml', 'run: echo nao-publica\n');
    const semDeploy = repo.guard();
    assert.equal(semDeploy.status, 1);
    assert.match(semDeploy.stderr, /nao roda "functions deploy"/);

    // 4) migration nova sem atualizar a contagem do manual
    repo.escrever('supabase/migrations/2026f.sql', 'select 1;\n');
    const migracoes = repo.guard();
    assert.equal(migracoes.status, 1);
    assert.match(migracoes.stderr, /afirma 5 migrations, mas supabase\/migrations tem 6/);

    // 5) volta a afirmar que a `main` nao tem protecao
    repo.escrever('AGENTS.md', agents.replace('**2**', '**3**').replace('exige **um** check', 'não há branch protection'));
    const negaProtecao = repo.guard();
    assert.equal(negaProtecao.status, 1);
    assert.match(negaProtecao.stderr, /afirma que nao ha protecao em `main`/);
  } finally {
    repo.limpar();
  }
});

test('guard: contagem de workflows no doc de CI e faixa do deno no toolchain viram fato', () => {
  // Etapa 285. Com a contagem do AGENTS.md ja checada, sobraram duas linhas de prosa velhas:
  // "um dos SETE workflows" (com 15 no diretorio) em docs/agentes/github-ci.md e a nota do
  // .github/toolchain.json citando o deno 'v1.x' quando o main.yml ja usava 'v2.x'.
  const agents =
    SECOES.map((s) => `${s}\n${'x'.repeat(300)}\n`).join('') +
    '- Repo `adm01-debug/Promo_Supply_V2`, `main`, **público**.\n' +
    '- A proteção de `main` exige **um** check obrigatório (`Contratos da automação local`).\n' +
    '- São **3**\n  workflows (`ls .github/workflows/*.yml`).\n' +
    '- O `deploy-edge-functions.yml` publica as edges no push da `main`.\n' +
    '- O canal de DDL é o `aplicar-migration-prod.yml` (dispatch manual).\n' +
    '- São 0 migrations hoje.\n';
  const docCi = [
    '| `.github/` | `workflows/` (3 arquivos) |',
    '- `main.yml` roda lint, typecheck e testes.',
    '- `deploy-edge-functions` publica as edges.',
    '- `aplicar-migration-prod` aplica DDL.',
    '',
  ].join('\n');
  const mainYml = '      - uses: denoland/setup-deno@v2\n        with:\n          deno-version: v2.x\n';
  const toolchain =
    '{"_comentario":["NAO declarados de proposito: deno (main.yml usa a faixa flutuante \'v2.x\', nao uma versao fixa)"]}\n';
  const repo = repoSintetico({
    'AGENTS.md': agents,
    'docs/agentes/github-ci.md': docCi,
    '.gitignore': '.env\n.env.*\n!.env.example\n',
    '.github/toolchain.json': toolchain,
    '.github/workflows/main.yml': mainYml,
    '.github/workflows/deploy-edge-functions.yml': 'run: supabase functions deploy "$FUNCAO"\n',
    '.github/workflows/aplicar-migration-prod.yml': 'run: psql --single-transaction -f "$ARQUIVO"\n',
  });
  try {
    const limpo = repo.guard();
    assert.equal(limpo.status, 0, limpo.stderr);

    repo.escrever('docs/agentes/github-ci.md', docCi.replace('(3 arquivos)', '(7 arquivos)'));
    const contagem = repo.guard();
    assert.equal(contagem.status, 1);
    assert.match(contagem.stderr, /afirma 7 arquivos em \.github\/workflows, mas \.github\/workflows tem 3/);

    repo.escrever('docs/agentes/github-ci.md', docCi);
    repo.escrever('.github/toolchain.json', toolchain.replace("'v2.x'", "'v1.x'"));
    const faixaVelha = repo.guard();
    assert.equal(faixaVelha.status, 1);
    assert.match(faixaVelha.stderr, /toolchain\.json: a nota sobre o deno nao cita a faixa .*'v2\.x'/);

    // A nota tambem fica velha se a faixa dos workflows subir e o comentario ficar para tras.
    repo.escrever('.github/toolchain.json', toolchain);
    repo.escrever('.github/workflows/main.yml', mainYml.replace('v2.x', 'v3.x'));
    const subiu = repo.guard();
    assert.equal(subiu.status, 1);
    assert.match(subiu.stderr, /nao cita a faixa .*'v3\.x'/);
  } finally {
    repo.limpar();
  }
});

test('guard: sem `.github/workflows` no checkout as asseracoes de fato nao rodam', () => {
  // Os repositorios sinteticos das outras provas nao tem workflows; cobrar o fato ali reprovaria
  // um guard bem calibrado por um diretorio que nao existe.
  const repo = repoSintetico({
    'docs/agentes/github-ci.md': 'sem workflows aqui\n',
    'AGENTS.md': `${SECOES.map((s) => `${s}\n${'x'.repeat(300)}\n`).join('')}- Repo \`adm01-debug/Promo_Supply_V2\`, \`main\`, **público**.\n`,
    '.gitignore': '.env\n.env.*\n!.env.example\n',
  });
  try {
    const r = repo.guard();
    assert.equal(r.status, 0, r.stderr);
  } finally {
    repo.limpar();
  }
});

test('guard: subpasta de docs/agentes conta dos dois lados (sem falso positivo, e apagar reprova)', () => {
  // Medido: a base listava a subpasta (`ls-tree -r`) e o checkout nao; um arquivo grande e
  // intacto em docs/agentes/<sub>/ fazia o guard reprovar com "encolheram 85%".
  const repo = repoSintetico({ 'docs/agentes/sub/grande.md': 's'.repeat(60000) });
  try {
    const intacto = repo.guard();
    assert.equal(intacto.status, 0, intacto.stderr);
    rmSync(path.join(repo.dir, 'docs/agentes/sub/grande.md'));
    assert.equal(repo.guard().status, 1);
  } finally {
    repo.limpar();
  }
});

test('guard: AGENTS_MD_BASE nao e interpretada por shell', () => {
  // Medido: `AGENTS_MD_BASE="HEAD; touch INJETADO"` criava o arquivo.
  const repo = repoSintetico();
  try {
    const r = repo.guard('HEAD; touch INJETADO');
    assert.equal(existsSync(path.join(repo.dir, 'INJETADO')), false, 'o valor da variavel foi executado como comando');
    assert.equal(r.status, 1);
  } finally {
    repo.limpar();
  }
});

test('guard: fora de repositorio git e sem a variavel, passa dizendo que nao comparou', () => {
  const repo = repoSintetico({}, { comGit: false });
  try {
    const semBase = repo.guard();
    assert.equal(semBase.status, 0, semBase.stderr);
    assert.match(semBase.stdout, /SEM comparacao de tamanho/);
    // Com a base pedida explicitamente, a mesma situacao reprova.
    assert.equal(repo.guard('origin/main').status, 1);
  } finally {
    repo.limpar();
  }
});

test('guard: visibilidade e `.env` viram fato cobrado quando os docs operacionais existem', () => {
  // Ate a etapa 264 o guard so contava secoes e bytes, e AGENTS.md/docs/agentes/github-ci.md
  // diziam "privado" num repositorio publico. Agora o fato e cobrado -- e so quando o checkout
  // tem docs/agentes/github-ci.md, senao os repositorios sinteticos acima reprovariam.
  const agents = `${SECOES.map((s) => `${s}\n${'x'.repeat(300)}\n`).join('')}- Repo \`adm01-debug/Promo_Supply_V2\`, \`main\`, **público**.\n`;
  const doc = '- Repo \`adm01-debug/Promo_Supply_V2\`, branch \`main\`, **público**.\n| Visibilidade | **público** |\n';
  const repo = repoSintetico({
    'AGENTS.md': agents,
    'docs/agentes/github-ci.md': doc,
    '.gitignore': '.env\n.env.*\n!.env.example\n',
  });
  try {
    const limpo = repo.guard();
    assert.equal(limpo.status, 0, limpo.stderr);
    repo.escrever('docs/agentes/github-ci.md', doc.replace('| Visibilidade | **público** |', '| Visibilidade | privado |'));
    const contradiz = repo.guard();
    assert.equal(contradiz.status, 1);
    assert.match(contradiz.stderr, /afirma que o repo e privado/);
    repo.escrever('docs/agentes/github-ci.md', doc);
    repo.escrever('AGENTS.md', SECOES.map((s) => `${s}\n${'x'.repeat(300)}\n`).join(''));
    const semLinha = repo.guard();
    assert.equal(semLinha.status, 1);
    assert.match(semLinha.stderr, /linha de visibilidade/);
    repo.escrever('AGENTS.md', agents);
    repo.escrever('.gitignore', 'node_modules\n');
    const semEnv = repo.guard();
    assert.equal(semEnv.status, 1);
    assert.match(semEnv.stderr, /nao esta ignorado/);
  } finally {
    repo.limpar();
  }
});
