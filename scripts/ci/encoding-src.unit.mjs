// Guard de encoding do front: texto com mojibake (UTF-8 lido como Windows-1252 e salvo de novo)
// chega ao usuario como lixo na tela. Caso real: a seta do tour de onboarding
// (src/components/onboarding/OnboardingTour.tsx) saiu como "â†" + U+0090 no lugar de "←".
// Varre src/, public/locales/ e index.html, so extensoes de texto (binario lido como UTF-8 daria
// falso positivo). Ignora __tests__: src/lib/__tests__/logger.fuzz.test.ts usa U+FFFD de proposito.
// Reprova: controle C1 (U+0080–U+009F), U+FFFD (byte invalido ja perdido), "â€" (aspas, travessao,
// reticencias), "â†" (setas), "Ã" + U+0080–U+00BF (acentos: "Ã§Ã£o", "Ã©"), "Ã" + caractere que o
// Windows-1252 poe em 0x80–0x9F (maiusculas: "Ã‡" Ç, "Ã‰" É, "Ãš" Ú, "Ã“" Ó, "ÃŠ" Ê, "Ã•" Õ,
// "Ãƒ" Ã) e "Â" + º/°/NBSP ("NÂº", "20Â°"). Arquivo .json tambem e decodificado antes do teste:
// mojibake escrito como escape ("Ã§") nao aparece no texto cru.
// Roda com `npm run test:scripts` (node --test scripts/ci/*.unit.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ALVOS = ['src', 'public/locales', 'index.html'].map((p) => path.join(root, p));
// Segundo char de "Ã" quando o byte 0x80–0x9F virou caractere do Windows-1252 (fora do Latin-1).
const CP1252_ALTO = '\\u0152\\u0153\\u0160\\u0161\\u0178\\u017D\\u017E\\u0192\\u02C6\\u02DC\\u2013-\\u203A\\u20AC\\u2122';
const PROIBIDO = new RegExp(`[\\u0080-\\u009F\\uFFFD]|â€|â†|Ã[\\u0080-\\u00BF${CP1252_ALTO}]|Â[º°\\u00A0]`, 'u');
const TEXTO = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.md']);

function achados(texto) {
  const out = [];
  texto.split('\n').forEach((linha, i) => {
    if (PROIBIDO.test(linha)) out.push(i + 1);
  });
  return out;
}

// JSON decodificado: devolve o caminho (chave) de cada string/chave com mojibake.
function achadosJson(texto) {
  const out = [];
  const visitar = (v, onde) => {
    if (typeof v === 'string') {
      if (PROIBIDO.test(v)) out.push(onde);
    } else if (v && typeof v === 'object') {
      for (const [k, filho] of Object.entries(v)) {
        const aqui = onde ? `${onde}.${k}` : k;
        if (PROIBIDO.test(k)) out.push(`${aqui} (chave)`);
        visitar(filho, aqui);
      }
    }
  };
  visitar(JSON.parse(texto), '');
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

test('detector reconhece maiusculas acentuadas e "Â" corrompidos', () => {
  for (const [ruim, certo] of [
    ['Ãƒ', 'Ã'], ['Ã‡', 'Ç'], ['Ã‰', 'É'], ['Ãš', 'Ú'], ['Ã“', 'Ó'], ['ÃŠ', 'Ê'], ['Ã•', 'Õ'],
    ['Ã€', 'À'], ['Ã‚', 'Â'], ['Ã”', 'Ô'], ['Ãœ', 'Ü'], ['Ã‘', 'Ñ'], ['Ã–', 'Ö'],
  ]) {
    // conferencia do proprio caso: o par e mesmo o UTF-8 de `certo` lido como Windows-1252
    assert.equal(Buffer.from(certo, 'utf8')[0], 0xc3, certo);
    assert.equal(Buffer.from(certo, 'utf8')[1] >= 0x80 && Buffer.from(certo, 'utf8')[1] <= 0x9f, true, certo);
    assert.deepEqual(achados(`ok\nx${ruim}y`), [2], ruim);
  }
  assert.deepEqual(achados('NÂº 5'), [1]);
  assert.deepEqual(achados('20Â°C'), [1]);
  assert.deepEqual(achados('R$Â 100'), [1]);
  // texto certo nao pode reprovar
  assert.deepEqual(achados('AÇÃO É ÚNICO ÓTIMO ÊXITO PÕE À ÀS Nº 5 20°C R$ 100 ÂNGULO'), []);
});

test('detector decodifica JSON (mojibake escrito como escape \\u00c3\\u00a7)', () => {
  const cru = '{"a":{"b":"Cota\\u00c3\\u00a7\\u00c3\\u00a3o","ok":"A\\u00e7\\u00e3o"},"N\\u00c2\\u00ba":"x","l":["\\u00c3\\u0192"]}';
  assert.deepEqual(achados(cru), [], 'texto cru nao mostra o mojibake');
  assert.deepEqual(achadosJson(cru), ['a.b', 'NÂº (chave)', 'l.0']);
  assert.deepEqual(achadosJson('{"x":"Ação — “ok”","y":["É"]}'), []);
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
    const texto = readFileSync(abs, 'utf8');
    for (const l of achados(texto)) ruins.push(`${path.relative(root, abs)}:${l}`);
    if (abs.endsWith('.json')) {
      for (const k of achadosJson(texto)) ruins.push(`${path.relative(root, abs)}#${k}`);
    }
  }
  assert.deepEqual(ruins, [], `mojibake:\n${ruins.join('\n')}`);
});
