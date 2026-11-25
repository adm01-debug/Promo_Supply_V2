// Suite do guard de componentes orfaos (etapa 274). Fixture em diretorio temporario para
// provar as tres formas de ligacao que o criterio textual precisa enxergar — import direto
// com alias `@/`, barrel `index.ts` reexportando, e import dinamico (lazy) — e a unica
// forma que deve reprovar: componente que ninguem menciona.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { analisar, comparar } from './check-orfaos-componentes.mjs';

function fixture(arquivos) {
  const raiz = mkdtempSync(join(tmpdir(), 'orfaos-'));
  for (const [rel, corpo] of Object.entries(arquivos)) {
    const destino = join(raiz, rel);
    mkdirSync(join(destino, '..'), { recursive: true });
    writeFileSync(destino, corpo);
  }
  return raiz;
}

const BASE = {
  'src/main.tsx': "import { createRoot } from 'react-dom/client';\nimport { App } from './App';\ncreateRoot(document.body).render(App);\n",
  'src/App.tsx': "import { Widget } from '@/components/c';\nimport { Comp } from '@/components/a/Comp';\nexport const App = () => null;\n",
  'src/components/a/Comp.tsx': 'export function Comp() { return null; }\n',
  'src/components/b/Dead.tsx': 'export function Dead() { return null; }\n',
  'src/components/c/index.ts': "export * from './Widget';\n",
  'src/components/c/Widget.tsx': 'export function Widget() { return null; }\n',
  'src/components/d/Lazy.tsx': 'export function Lazy() { return null; }\n',
  'src/lazy.ts': "export const carregar = () => import('@/components/d/Lazy');\n",
  'src/pages/Rota.tsx': 'export default function Rota() { return null; }\n',
};

test('detecta so o componente que ninguem menciona', () => {
  const raiz = fixture(BASE);
  try {
    const { orfaos } = analisar(raiz);
    assert.deepEqual(orfaos, ['src/components/b/Dead.tsx']);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test('ponto de entrada sem export e rota de src/pages nao entram como componente', () => {
  const raiz = fixture(BASE);
  try {
    const { componentes } = analisar(raiz);
    assert.ok(!componentes.includes('src/main.tsx'));
    assert.ok(!componentes.includes('src/pages/Rota.tsx'));
    assert.ok(componentes.includes('src/components/a/Comp.tsx'));
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test('orfao novo reprova; orfao ja conhecido passa; ligado aparece como resolvido', () => {
  assert.deepEqual(comparar(['src/x/Novo.tsx'], []).novos, ['src/x/Novo.tsx']);
  assert.deepEqual(comparar(['src/x/Novo.tsx'], ['src/x/Novo.tsx']).novos, []);
  assert.deepEqual(comparar([], ['src/x/Velho.tsx']).resolvidos, ['src/x/Velho.tsx']);
});

test('nome parecido nao conta como importador', () => {
  const raiz = fixture({
    'src/main.tsx': "import { App } from './App';\nconsole.log(App);\n",
    'src/App.tsx': "import { Dead } from '@/components/b/DeadLegacy';\nexport const App = () => Dead;\n",
    'src/components/b/Dead.tsx': 'export function Dead() { return null; }\n',
    'src/components/b/DeadLegacy.tsx': 'export function Dead() { return null; }\n',
  });
  try {
    const { orfaos } = analisar(raiz);
    assert.deepEqual(orfaos, ['src/components/b/Dead.tsx']);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});