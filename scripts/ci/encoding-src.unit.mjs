// Guard de encoding do front: texto com mojibake (UTF-8 lido como Windows-1252 e salvo de novo)
// chega ao usuario como lixo na tela. Caso real: a seta do tour de onboarding
// (src/components/onboarding/OnboardingTour.tsx) saiu como "â†" + U+0090 no lugar de "←".
// Reprova qualquer arquivo de src/ (exceto __tests__, onde ha fuzz com bytes arbitrarios) que
// contenha caractere de controle C1 (U+0080–U+009F) ou a sequencia "â€" (prefixo do mojibake de
// aspas, travessao e reticencias).
// Roda com `npm run test:scripts` (node --test scripts/ci/*.unit.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = path.join(root, 'src');
const PROIBIDO = /[\u0080-\u009F]|â€/u;

function achados(texto) {
  const out = [];
  texto.split('\n').forEach((linha, i) => {
    if (PROIBIDO.test(linha)) out.push(i + 1);
  });
  return out;
}

function listar(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '__tests__' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listar(p));
    else if (e.isFile()) out.push(p);
  }
  return out;
}

test('detector reconhece os padroes de mojibake', () => {
  assert.deepEqual(achados('ok\nâ†\u0090 Deslize'), [2]);
  assert.deepEqual(achados('Cotaâ€”o'), [1]);
  assert.deepEqual(achados('← Deslize para navegar → — ação'), []);
});

test('src/ (fora de __tests__) nao tem caractere C1 nem "â€"', () => {
  const arquivos = listar(SRC);
  // Fail-closed: se a varredura nao achou nada, o guard nao provou coisa alguma.
  assert.ok(arquivos.length > 100, `varredura de src/ achou so ${arquivos.length} arquivos`);
  const ruins = [];
  for (const abs of arquivos) {
    const linhas = achados(readFileSync(abs, 'utf8'));
    for (const l of linhas) ruins.push(`${path.relative(root, abs)}:${l}`);
  }
  assert.deepEqual(ruins, [], `mojibake em src/:\n${ruins.join('\n')}`);
});
