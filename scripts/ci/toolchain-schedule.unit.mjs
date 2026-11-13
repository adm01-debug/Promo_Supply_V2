import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { maisNova, partes } from './bump-toolchain.mjs';

const workflow = readFileSync(
  new URL('../../.github/workflows/branch-hygiene-audit.yml', import.meta.url),
  'utf8',
);

test('auditoria semanal executa a verificacao informativa da toolchain', () => {
  assert.match(workflow, /^\s+schedule:\s*$/mu);
  assert.match(workflow, /^\s+run: node scripts\/ci\/bump-toolchain\.mjs\s*$/mu);
});

// --- auditoria 09/11/2026: bump-toolchain.mjs -------------------------------------------
// Cada teste reproduz um defeito medido antes da correcao. O CLI roda de verdade, numa
// arvore temporaria (`scripts/ci/` + `.github/toolchain.json`), contra uma API falsa em
// 127.0.0.1 (GITHUB_API_URL) -- nenhuma chamada sai da maquina.

test('maisNova: semver numerico, prefixo de tag e 1.10 > 1.9', () => {
  assert.equal(maisNova('1.9.0', 'bun-v1.10.0'), true);
  assert.equal(maisNova('1.10.0', 'v1.9.5'), false);
  assert.equal(maisNova('1.4.0', 'bun-v1.4.0'), false);
  assert.equal(maisNova('1.4.0', 'v1.4.1'), true);
  assert.equal(maisNova('2.0.0', 'v1.99.99'), false);
  assert.equal(maisNova('1.60.0', 'v1.60.0.1'), true, 'pin completo: componente extra da remota conta');
  assert.deepEqual(partes('bun-v1.5.0'), { numeros: [1, 5, 0], pre: '' });
  assert.deepEqual(partes('v1.60.0-rc.1+build.7'), { numeros: [1, 60, 0], pre: 'rc.1' });
  assert.deepEqual(partes('lts/*').numeros, []);
  assert.deepEqual(partes(undefined).numeros, []);
});

test('maisNova: pin parcial é faixa — node "22" não tem "atualização" para v22.21.1', () => {
  assert.equal(maisNova('22', 'v22.21.1'), false, 'antes: true, toda semana, com o toolchain.json de hoje');
  assert.equal(maisNova('22', 'v25.1.0'), true, 'major novo continua sendo avisado');
  assert.equal(maisNova('22', 'v20.19.6'), false);
  assert.equal(maisNova('1.4', 'v1.4.9'), false);
  assert.equal(maisNova('1.4', 'v1.5.0'), true);
  assert.equal(maisNova('v1.x', 'v1.46.3'), false, 'faixa escrita com x');
  assert.equal(maisNova('v1.x', 'v2.0.0'), true);
});

test('maisNova: pre-release é menor que a final de mesmo número; build não é versão nova', () => {
  assert.equal(maisNova('1.60.0', 'v1.60.0-rc.1'), false, 'antes: true (o rc virava quarto componente)');
  assert.equal(maisNova('1.60.0', 'v1.61.0-rc.1'), true);
  assert.equal(maisNova('1.60.0-rc.1', 'v1.60.0'), true, 'a final do pre-release pinado saiu');
  assert.equal(maisNova('1.60.0-rc.1', 'v1.60.0-rc.2'), true);
  assert.equal(maisNova('1.60.0-rc.2', 'v1.60.0-rc.1'), false);
  assert.equal(maisNova('1.60.0-rc.9', 'v1.60.0-rc.10'), true, 'identificador numerico compara como numero');
  assert.equal(maisNova('1.60.0-beta.1', 'v1.60.0-rc.1'), true);
  assert.equal(maisNova('1.4.0', 'bun-v1.4.0+build.5'), false, 'antes: true');
});

const BUMP = new URL('./bump-toolchain.mjs', import.meta.url).pathname;

function apiDeReleases(tags) {
  const pedidos = [];
  const servidor = http.createServer((req, res) => {
    pedidos.push(req.url);
    const repo = /^\/repos\/([^/]+\/[^/]+)\/releases\/latest$/.exec(req.url)?.[1];
    const resposta = tags[repo] ?? { status: 404, corpo: { message: 'Not Found' } };
    const { status = 200, corpo } = typeof resposta === 'string' ? { corpo: { tag_name: resposta } } : resposta;
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(typeof corpo === 'string' ? corpo : JSON.stringify(corpo));
  });
  return new Promise((ok) => {
    servidor.listen(0, '127.0.0.1', () => ok({ servidor, pedidos, url: `http://127.0.0.1:${servidor.address().port}` }));
  });
}

// Roda o CLI numa copia isolada: `toolchain` = texto do .github/toolchain.json (null = sem arquivo).
async function rodarBump(toolchain, tags, { porSymlink = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'w40 com espaço '));
  const api = await apiDeReleases(tags);
  try {
    mkdirSync(join(dir, 'real', 'scripts', 'ci'), { recursive: true });
    mkdirSync(join(dir, 'real', '.github'));
    cpSync(BUMP, join(dir, 'real', 'scripts', 'ci', 'bump-toolchain.mjs'));
    if (toolchain !== null) writeFileSync(join(dir, 'real', '.github', 'toolchain.json'), typeof toolchain === 'string' ? toolchain : JSON.stringify(toolchain));
    symlinkSync(join(dir, 'real'), join(dir, 'atalho'));
    const script = join(dir, porSymlink ? 'atalho' : 'real', 'scripts', 'ci', 'bump-toolchain.mjs');
    const resultado = await new Promise((ok) => {
      const filho = spawn(process.execPath, [script], { env: { PATH: process.env.PATH, GITHUB_API_URL: api.url } });
      let stdout = '';
      let stderr = '';
      filho.stdout.on('data', (d) => { stdout += d; });
      filho.stderr.on('data', (d) => { stderr += d; });
      filho.on('close', (status) => ok({ status, stdout, stderr }));
    });
    return { ...resultado, pedidos: api.pedidos };
  } finally {
    api.servidor.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const TOOLCHAIN = { _comentario: ['x'], bun: '1.4.0', node: '22', playwright: '1.60.0' };
const EM_DIA = { 'oven-sh/bun': 'bun-v1.4.0', 'nodejs/node': 'v22.21.1', 'microsoft/playwright': 'v1.60.0' };

test('CLI: tudo em dia diz ✅; versão nova vira linha da tabela; sai 0 nos dois casos', async () => {
  const emDia = await rodarBump(TOOLCHAIN, EM_DIA);
  assert.equal(emDia.status, 0, emDia.stderr);
  assert.match(emDia.stdout, /✅ Todas as ferramentas verificadas estão na versão mais recente\./);
  assert.doesNotMatch(emDia.stdout, /Atualizações disponíveis|Não foi possível verificar/);
  assert.deepEqual([...emDia.pedidos].sort(), [
    '/repos/microsoft/playwright/releases/latest',
    '/repos/nodejs/node/releases/latest',
    '/repos/oven-sh/bun/releases/latest',
  ]);

  const novas = await rodarBump(TOOLCHAIN, { ...EM_DIA, 'oven-sh/bun': 'bun-v1.10.0', 'nodejs/node': 'v25.1.0' });
  assert.equal(novas.status, 0);
  assert.match(novas.stdout, /\| `bun` \| `1\.4\.0` \| `1\.10\.0` \|/);
  assert.match(novas.stdout, /\| `node` \| `22` \| `25\.1\.0` \|/);
  assert.doesNotMatch(novas.stdout, /`playwright`/);
  assert.match(novas.stdout, /2 atualização\(ões\) disponível\(eis\)/);
});

test('CLI: toolchain.json ausente, malformado ou que não é objeto avisa e sai 0 (antes: stack trace e exit 1)', async () => {
  for (const [nome, conteudo] of [['ausente', null], ['malformado', '{ "bun": '], ['com BOM', '﻿{\r\n"bun":"1.4.0"}'], ['null', 'null'], ['lista', '[]']]) {
    const r = await rodarBump(conteudo, EM_DIA);
    assert.equal(r.status, 0, `${nome}: "informativo, sai 0" — ${r.stderr}`);
    assert.match(r.stderr, /^::warning::bump-toolchain: \.github\/toolchain\.json ilegível — [^\n]+\n$/, nome);
    assert.match(r.stdout, /⚠️ `\.github\/toolchain\.json` não pôde ser lido \([^\n]+\): nenhuma ferramenta foi verificada\./, nome);
    assert.doesNotMatch(r.stdout, /✅/, nome);
    assert.deepEqual(r.pedidos, [], nome);
  }
});

test('CLI: nada declarado ou nada consultável nunca vira "✅ todas na versão mais recente"', async () => {
  const vazio = await rodarBump({ _comentario: ['x'] }, EM_DIA);
  assert.equal(vazio.status, 0);
  assert.match(vazio.stdout, /⚠️ Nenhuma ferramenta declarada em `\.github\/toolchain\.json`: nada foi verificado\./, 'antes: ✅');
  assert.doesNotMatch(vazio.stdout, /✅/);

  const foraDoAr = await rodarBump(TOOLCHAIN, {
    'oven-sh/bun': { status: 403, corpo: { message: 'API rate limit exceeded' } },
    'nodejs/node': { status: 200, corpo: '<html>' },
  });
  assert.equal(foraDoAr.status, 0);
  assert.match(foraDoAr.stdout, /⚠️ Nenhuma ferramenta pôde ser verificada nesta execução/);
  assert.doesNotMatch(foraDoAr.stdout, /✅/);
  assert.match(foraDoAr.stdout, /- bun: não foi possível consultar oven-sh\/bun \(HTTP 403\)/, 'antes: sem o motivo');
  assert.match(foraDoAr.stdout, /- playwright: não foi possível consultar microsoft\/playwright \(HTTP 404\)/);
  assert.match(foraDoAr.stdout, /- node: não foi possível consultar nodejs\/node \([^)]*not valid JSON\)/);
});

test('CLI: ferramenta sem mapeamento, pin que não é versão e tag sem número aparecem como não verificados', async () => {
  const r = await rodarBump(
    { bun: 'lts/*', node: '22', playwright: '1.60.0', zizmor: '1.2.3', deno: '' },
    { 'nodejs/node': 'latest', 'microsoft/playwright': 'v1.60.0-rc.1' },
  );
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /- zizmor: sem mapeamento em scripts\/ci\/bump-toolchain\.mjs/, 'antes: ignorada em silêncio');
  assert.match(r.stdout, /- bun: versão pinada não reconhecida \("lts\/\*"\)/, 'antes: "atualização" de `` para a remota');
  assert.match(r.stdout, /- deno: versão pinada não reconhecida \(""\)/);
  assert.match(r.stdout, /- node: a tag "latest" de nodejs\/node não tem versão numérica/, 'antes: contava como em dia');
  assert.doesNotMatch(r.stdout, /Atualizações disponíveis/, 'rc da mesma versão pinada não é atualização');
  assert.deepEqual([...r.pedidos].sort(), ['/repos/microsoft/playwright/releases/latest', '/repos/nodejs/node/releases/latest']);
});

test('CLI: roda também chamado por symlink (a guarda de execução direta não vira no-op)', async () => {
  const r = await rodarBump(TOOLCHAIN, EM_DIA, { porSymlink: true });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Toolchain — verificação de versões \(W40\)/);
  assert.equal(r.pedidos.length, 3);
});

test('o toolchain.json do repo só declara ferramenta que o script sabe consultar', () => {
  const declarado = JSON.parse(readFileSync(new URL('../../.github/toolchain.json', import.meta.url), 'utf8'));
  const fonte = readFileSync(BUMP, 'utf8');
  for (const [chave, versao] of Object.entries(declarado)) {
    if (chave.startsWith('_')) continue;
    assert.match(fonte, new RegExp(`chave: '${chave}',`), `${chave} sem entrada em FERRAMENTAS`);
    assert.ok(partes(versao).numeros.length > 0, `${chave}: ${JSON.stringify(versao)} não é versão`);
  }
});
