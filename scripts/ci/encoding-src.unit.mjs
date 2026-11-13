// Guard de encoding do front: texto com mojibake (UTF-8 lido como Windows-1252 e salvo de novo)
// chega ao usuario como lixo na tela. Caso real: a seta do tour de onboarding
// (src/components/onboarding/OnboardingTour.tsx) saiu como "â†" + U+0090 no lugar de "←".
// Varre src/, public/locales/ e index.html, so extensoes de texto (binario lido como UTF-8 daria
// falso positivo). Ignora __tests__: src/lib/__tests__/logger.fuzz.test.ts usa U+FFFD de proposito.
// Reprova: controle C1 (U+0080–U+009F), U+FFFD (byte invalido ja perdido), "â€" (aspas, travessao,
// reticencias), "â†" (setas) e "Ã" + U+0080–U+00BF (acentos: "Ã§Ã£o", "Ã©").
// Roda com `npm run test:scripts` (node --test scripts/ci/*.unit.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ALVOS = ['src', 'public/locales', 'index.html'].map((p) => path.join(root, p));
const PROIBIDO = /[\u0080-\u009F�]|â€|â†|Ã[\u0080-¿]/u;
const TEXTO = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.md']);

function achados(texto) {
  const out = [];
  texto.split('\n').forEach((linha, i) => {
    if (PROIBIDO.test(linha)) out.push(i + 1);
  });
  return out;
}

function listar(alvo) {
  let entradas;
  try {
    entradas = readdirSync(alvo, { withFileTypes: true });
  } catch (e) {
    if (e.code === 'ENOTDIR') return TEXTO.has(path.extname(alvo)) ? [alvo] : [];
    throw e;
  }
  const out = [];
  for (const e of entradas) {
    if (e.name === '__tests__' || e.name === 'node_modules') continue;
    const p = path.join(alvo, e.name);
    if (e.isDirectory()) out.push(...listar(p));
    else if (e.isFile() && TEXTO.has(path.extname(e.name))) out.push(p);
  }
  return out;
}

test('detector reconhece os padroes de mojibake', () => {
  assert.deepEqual(achados('ok\nâ†\u0090 Deslize'), [2]);
  assert.deepEqual(achados('Cotaâ€”o'), [1]);
  assert.deepEqual(achados('aÃ§Ã£o'), [1]);
  assert.deepEqual(achados('Ã© obrigatÃ³rio'), [1]);
  assert.deepEqual(achados('prÃ³ximo â†’'), [1]);
  assert.deepEqual(achados('â†’'), [1]);
  assert.deepEqual(achados('valor � perdido'), [1]);
  assert.deepEqual(achados('← Deslize para navegar → — ação “ok” … Ãrea Ê'), []);
});

test('listar ignora binario e __tests__', () => {
  const lista = listar(path.join(root, 'src')).map((p) => path.relative(root, p));
  assert.ok(lista.every((p) => TEXTO.has(path.extname(p))), 'listou arquivo nao-texto');
  assert.ok(!lista.some((p) => p.split(path.sep).includes('__tests__')), 'listou __tests__');
  assert.deepEqual(listar(path.join(root, 'public/favicon.ico')), []);
});

test('src/, public/locales/ e index.html nao tem mojibake', () => {
  const arquivos = ALVOS.flatMap(listar);
  // Fail-closed: se a varredura nao achou nada, o guard nao provou coisa alguma.
  assert.ok(arquivos.length > 100, `varredura achou so ${arquivos.length} arquivos`);
  for (const obrig of ['public/locales/pt/translation.json', 'index.html']) {
    assert.ok(arquivos.includes(path.join(root, obrig)), `varredura nao incluiu ${obrig}`);
  }
  const ruins = [];
  for (const abs of arquivos) {
    const linhas = achados(readFileSync(abs, 'utf8'));
    for (const l of linhas) ruins.push(`${path.relative(root, abs)}:${l}`);
  }
  assert.deepEqual(ruins, [], `mojibake:\n${ruins.join('\n')}`);
});
