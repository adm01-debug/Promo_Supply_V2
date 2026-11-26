// Cenarios de scripts/inventario/gerar-rotas.mjs (executa o script de verdade contra fixtures; so node).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO, repoFalso, rodar, importar } from './lib.mjs';

const SCRIPT = 'scripts/inventario/gerar-rotas.mjs';
const m = await importar(SCRIPT);

const appRoutes = (corpo, cabecalho = '') => `import { lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
${cabecalho}
export const R = () => (
  <Routes>
${corpo}
  </Routes>
);
`;
const pagina = (extra = '') => `${extra}\nexport default function P() { return null; }\n`;
const caminhos = (raiz) => m.lerUrls(raiz).map((u) => u.caminho);

// ---------- repo real ----------
test('real: uma URL por <Route path=...> do AppRoutes e 0 problemas', () => {
  const inv = m.gerarRotas(REPO);
  const esperado = (fs.readFileSync(path.join(REPO, 'src/routes/AppRoutes.tsx'), 'utf8').match(/<Route\s+path=/g) || []).length;
  assert.equal(inv.urls.length, esperado);
  assert.equal(inv.resumo.urls, inv.urls.length);
  assert.equal(inv.problemas.length, inv.resumo.problemas);
  for (const u of inv.urls) if (u.arquivo) assert.ok(fs.existsSync(path.join(REPO, u.arquivo)), u.arquivo);
});

test('real: duas execucoes geram o mesmo texto', () => {
  assert.equal(m.serializar(m.gerarRotas(REPO)), m.serializar(m.gerarRotas(REPO)));
});

test('real: /admin/* exige admin, /auth e * sao publicas, / redireciona', () => {
  const urls = Object.fromEntries(m.lerUrls(REPO).map((u) => [u.caminho, u]));
  // Caminhos de referencia do AppRoutes.tsx de hoje; rota renomeada/removida sai da checagem em vez de
  // reprovar o inventario por um motivo que nao e o dele — mas pelo menos 4 tem de existir.
  const confere = {
    '/admin/sso': (u) => { assert.deepEqual(u.papeis, ['admin']); assert.equal(u.protegida, true); },
    '/portal-fornecedor': (u) => assert.deepEqual(u.papeis, ['supplier', 'admin']),
    '/auth': (u) => assert.equal(u.protegida, false),
    '*': (u) => assert.equal(u.protegida, false),
    '/': (u) => assert.equal(u.redireciona, '/compras'),
    '/compras': (u) => { assert.equal(u.protegida, true); assert.deepEqual(u.papeis, []); },
    '/__dev/xbz-network-panel': (u) => assert.equal(u.protegida, false),
  };
  let verificadas = 0;
  for (const [caminho, f] of Object.entries(confere)) {
    if (!urls[caminho]) continue;
    f(urls[caminho]);
    verificadas += 1;
  }
  assert.ok(verificadas >= 4, `so ${verificadas} rota(s) de referencia ainda existem em AppRoutes.tsx; atualize este caso`);
});

test('real: saida igual em qualquer locale do processo (LC_ALL)', () => {
  const hash = (loc) => rodar(process.execPath, ['-e', `
    import(${JSON.stringify(pathToFileURL(path.join(REPO, SCRIPT)).href)}).then((x) => {
      const t = x.serializar(x.gerarRotas(${JSON.stringify(REPO)}));
      console.log(require('crypto').createHash('sha256').update(t).digest('hex'));
    });`], { env: { ...process.env, LC_ALL: loc, LANG: loc } }).stdout.trim();
  const base = hash('C.UTF-8');
  assert.match(base, /^[0-9a-f]{64}$/);
  for (const loc of ['C', 'en_US.UTF-8', 'pt_BR.UTF-8', 'lt_LT.UTF-8', 'cs_CZ.UTF-8', 'hu_HU.UTF-8', 'da_DK.UTF-8', 'et_EE.UTF-8']) {
    assert.equal(hash(loc), base, `locale ${loc} mudou a saida`);
  }
});

// ---------- lerUrls em fixture ----------
test('fixture: rota comentada em JSX nao e URL', () => {
  const raiz = repoFalso({
    'src/routes/AppRoutes.tsx': appRoutes(`
    <Route path="/viva" element={<Viva />} />
    {/* <Route path="/velha" element={<Velha />} /> */}
    {/*
      <Route path="/velha2" element={<Velha />} />
    */}
    <Route path="/depois" element={<Viva />} />`, 'const Viva = lazy(() => import("@/pages/Viva"));'),
    'src/pages/Viva.tsx': pagina(),
  });
  assert.deepEqual(caminhos(raiz), ['/depois', '/viva']);
});

test('fixture: pai comentado nao entra na pilha (filho nao herda protecao de rota comentada)', () => {
  const raiz = repoFalso({
    'src/routes/AppRoutes.tsx': appRoutes(`
    {/* <Route element={<ProtectedRoute requiredRole="admin"><Shell /></ProtectedRoute>}> */}
    <Route path="/aberta" element={<Viva />} />`, 'const Viva = lazy(() => import("@/pages/Viva"));'),
    'src/pages/Viva.tsx': pagina(),
  });
  const [u] = m.lerUrls(raiz);
  assert.equal(u.caminho, '/aberta');
  assert.equal(u.protegida, false);
  assert.deepEqual(u.papeis, []);
});

test('fixture: path="/app/*" (com /* dentro de string) seguido de comentario nao some', () => {
  const raiz = repoFalso({
    'src/routes/AppRoutes.tsx': appRoutes(`
    <Route path="/app/*" element={<Viva />} />
    {/* comentario qualquer */}
    <Route path="/b" element={<Viva />} />`, 'const Viva = lazy(() => import("@/pages/Viva"));'),
    'src/pages/Viva.tsx': pagina(),
  });
  assert.deepEqual(caminhos(raiz), ['/app/*', '/b']);
});

test('fixture: filho com path relativo herda o caminho do pai', () => {
  const raiz = repoFalso({
    'src/routes/AppRoutes.tsx': appRoutes(`
    <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><Shell /></ProtectedRoute>}>
      <Route path="usuarios" element={<Viva />} />
      <Route path="usuarios/:id" element={<Viva />} />
      <Route path="/admin/absoluta" element={<Viva />} />
    </Route>
    <Route path="solta" element={<Viva />} />
    <Route path="*" element={<Viva />} />`, 'const Viva = lazy(() => import("@/pages/Viva"));'),
    'src/pages/Viva.tsx': pagina(),
  });
  const urls = m.lerUrls(raiz);
  assert.deepEqual(urls.map((u) => u.caminho).sort(), ['*', '/admin', '/admin/absoluta', '/admin/usuarios', '/admin/usuarios/:id', 'solta'].sort());
  const filho = urls.find((u) => u.caminho.endsWith('usuarios'));
  assert.equal(filho.protegida, true);
  assert.deepEqual(filho.papeis, ['admin']);
});

test('fixture: aninhamento — filho herda protecao/papeis; irmao depois do </Route> nao', () => {
  const raiz = repoFalso({
    'src/routes/AppRoutes.tsx': appRoutes(`
    <Route element={<ProtectedRoute requiredRoles={['a', "b"]}><Shell /></ProtectedRoute>}>
      <Route path="/dentro" element={<Viva />} />
      <Route path="/dentro2" element={<ProtectedRoute requiredRole={'c'}><Viva /></ProtectedRoute>} />
    </Route>
    <Route path="/fora" element={<Viva />} />`, 'const Viva = lazy(() => import("@/pages/Viva"));'),
    'src/pages/Viva.tsx': pagina(),
  });
  const u = Object.fromEntries(m.lerUrls(raiz).map((x) => [x.caminho, x]));
  assert.equal(u['/dentro'].protegida, true);
  assert.deepEqual(u['/dentro'].papeis, ['a', 'b']);
  assert.deepEqual(u['/dentro2'].papeis, ['c']);
  assert.equal(u['/fora'].protegida, false);
  assert.deepEqual(u['/fora'].papeis, []);
});

test('fixture: aspas simples, tag em varias linhas, arrow function com > no element, CRLF', () => {
  const corpo = `
    <Route
      path='/multi'
      element={
        <Suspense fallback={<PageLoader />}>
          <Viva onX={() => a > b} />
        </Suspense>
      }
    />
    <Route path="/dois" element={<Viva />} />`;
  const texto = appRoutes(corpo, 'const Viva = lazy(() => import("@/pages/Viva"));').replace(/\n/g, '\r\n');
  const raiz = repoFalso({ 'src/routes/AppRoutes.tsx': texto, 'src/pages/Viva.tsx': pagina() });
  const urls = m.lerUrls(raiz);
  assert.deepEqual(urls.map((u) => u.caminho), ['/dois', '/multi']);
  assert.equal(urls[1].componente, 'Viva');
  assert.equal(urls[1].arquivo, 'src/pages/Viva.tsx');
});

test('fixture: lazy com .then(m => ({default})) e pagina em index.tsx', () => {
  const raiz = repoFalso({
    'src/routes/AppRoutes.tsx': appRoutes('    <Route path="/n" element={<Nomeada />} />',
      'const Nomeada = lazy(() => import("@/pages/nomeada").then((x) => ({ default: x.Nomeada })));'),
    'src/pages/nomeada/index.tsx': pagina(),
  });
  assert.equal(m.lerUrls(raiz)[0].arquivo, 'src/pages/nomeada/index.tsx');
});

test('fixture: pagina cujo arquivo nao existe vira problema url_sem_arquivo (nao some)', () => {
  const raiz = repoFalso({
    'src/routes/AppRoutes.tsx': appRoutes('    <Route path="/fantasma" element={<Fantasma />} />',
      'const Fantasma = lazy(() => import("@/pages/Fantasma"));'),
  });
  const inv = m.gerarRotas(raiz);
  assert.equal(inv.urls.length, 1);
  assert.deepEqual(inv.problemas, [{ tipo: 'url_sem_arquivo', id: '/fantasma', detalhe: 'Fantasma nao resolve em AppRoutes' }]);
});

test('fixture: sem <Routes> ou sem AppRoutes falha alto (nao grava inventario vazio)', () => {
  const raiz = repoFalso({ 'src/routes/AppRoutes.tsx': 'export const x = 1;\n' });
  assert.throws(() => m.gerarRotas(raiz), /nao achei o bloco <Routes>/);
  const vazio = repoFalso({});
  assert.throws(() => m.gerarRotas(vazio), /ENOENT/);
});

test('fixture: <Route> que nunca fecha (chave desbalanceada) falha alto, nao devolve inventario pela metade', () => {
  const raiz = repoFalso({
    'src/routes/AppRoutes.tsx': appRoutes(`
    <Route path="/a" element={<Viva />} />
    <Route path="/quebrada" element={<Viva />
    <Route path="/c" element={<Viva />} />`, 'const Viva = lazy(() => import("@/pages/Viva"));'),
    'src/pages/Viva.tsx': pagina(),
  });
  assert.throws(() => m.gerarRotas(raiz), /<Route> sem fim/);
});

test('fixture: entrada grande (2000 rotas, pagina com 3000 imports) termina em tempo curto', () => {
  const rotas = Array.from({ length: 2000 }, (_, i) => `    <Route path="/r${i}" element={<Viva />} />`).join('\n');
  const imports = Array.from({ length: 3000 }, (_, i) => `import { useH${i} } from '@/hooks/useH${i % 50}';`).join('\n');
  const hooks = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`src/hooks/useH${i}.ts`, `export const x${i} = () => supabase.from('t${i}');\n`]));
  const raiz = repoFalso({
    'src/routes/AppRoutes.tsx': appRoutes(rotas, 'const Viva = lazy(() => import("@/pages/Viva"));'),
    'src/pages/Viva.tsx': pagina(imports),
    ...hooks,
  });
  const t = Date.now();
  const inv = m.gerarRotas(raiz);
  assert.equal(inv.urls.length, 2000);
  assert.equal(inv.urls[0].tabelas.length, 50);
  assert.ok(Date.now() - t < 5000, `${Date.now() - t} ms`);
});

test('fixture: <Routes> vazio -> 0 URLs sem erro', () => {
  const raiz = repoFalso({ 'src/routes/AppRoutes.tsx': appRoutes('') });
  assert.deepEqual(m.gerarRotas(raiz).urls, []);
});

// ---------- papeisDaTag ----------
test('papeisDaTag: as formas aceitas', () => {
  assert.deepEqual(m.papeisDaTag('<ProtectedRoute requiredRole="admin">'), ['admin']);
  assert.deepEqual(m.papeisDaTag("<ProtectedRoute requiredRole={'admin'}>"), ['admin']);
  assert.deepEqual(m.papeisDaTag("<ProtectedRoute requiredRole={['a', \"b\"]}>"), ['a', 'b']);
  assert.deepEqual(m.papeisDaTag('<ProtectedRoute requiredRoles={[ ]}>'), []);
  assert.equal(m.papeisDaTag('<ProtectedRoute>'), null);
});

// ---------- extrairImports ----------
test('extrairImports: estatico, multilinha, alias, type, side-effect, dinamico, re-export', () => {
  const texto = [
    "import React from 'react';",
    "import { useA, useB as useC, type T } from './hooks';",
    'import {\n  useD,\n  Coisa,\n} from "@/lib/d";',
    "import type { X } from './tipos';",
    "import './estilo.css';",
    "const L = () => import('./lazy');",
    "export { z } from './z';",
    "export * from './w';",
  ].join('\n');
  const imps = m.extrairImports(texto);
  const esp = imps.map((i) => i.especificador);
  for (const e of ['react', './hooks', '@/lib/d', './estilo.css', './lazy', './z', './w']) assert.ok(esp.includes(e), e);
  assert.ok(!imps.some((i) => i.especificador === './tipos' && i.nomes.length), 'import type nao traz nomes');
  const hooks = imps.find((i) => i.especificador === './hooks').nomes;
  assert.deepEqual(hooks.filter((x) => /^use/.test(x)), ['useA', 'useC']);
  assert.ok(imps.find((i) => i.especificador === '@/lib/d').nomes.includes('useD'));
});

// ---------- extrairChamadas ----------
test('extrairChamadas: tabelas, buckets, rpcs e edges nas formas do repo', () => {
  const texto = `
const BUCKET = 'meu-bucket';
export const TABELA: string = "minha_tabela";
function f() {
const INTERNA = 'nao_modulo';
  supabase.from('pedidos').select();
  supabase.from("itens");
  supabase.from(\`crase\`);
  supabase
    .from('quebrada');
  supabase.storage.from('docs').upload();
  supabase.storage
    .from(BUCKET);
  supabase.from(TABELA);
  supabase.from(INTERNA);
  supabase.from(variavel);
  fromTable('via_helper');
  fromTable(TABELA);
  fetch(\`\${URL}/rest/v1/via_rest?select=*\`);
  fetch(\`\${URL}/rest/v1/rpc/fn_rest\`);
  supabase.rpc('fn_a', {});
  rpc("fn_b");
  supabase.functions.invoke('edge-a', {});
  supabase.functions
    .invoke<Tipo>("edge-b/sub", {});
  invokeEdge<Resp>('edge-c');
  fetch(\`\${URL}/functions/v1/edge-d\`);
}`;
  const c = m.extrairChamadas(texto);
  assert.deepEqual([...new Set(c.tabelas)].sort(), ['crase', 'itens', 'minha_tabela', 'pedidos', 'quebrada', 'via_helper', 'via_rest']);
  assert.deepEqual([...new Set(c.buckets)].sort(), ['docs', 'meu-bucket']);
  assert.deepEqual([...new Set(c.rpcs)].sort(), ['fn_a', 'fn_b', 'fn_rest']);
  assert.deepEqual([...new Set(c.edges)].sort(), ['edge-a', 'edge-b', 'edge-c', 'edge-d']);
});

test('extrairChamadas: URL de edge so como texto JSX (sem aspas) nao conta; texto vazio nao quebra', () => {
  assert.deepEqual(m.extrairChamadas('<p>POST /functions/v1/so-texto</p>').edges, []);
  assert.deepEqual(m.extrairChamadas(''), { tabelas: [], buckets: [], rpcs: [], edges: [] });
});

// ---------- fechoDaTela ----------
test('fecho: segue hooks/lib/features, para em components apos 2 saltos, ignora ui/ e testes, registra import quebrado, sobrevive a ciclo', () => {
  const raiz = repoFalso({
    'src/routes/AppRoutes.tsx': appRoutes('    <Route path="/p" element={<Pg />} />\n    <Route path="/p/:id" element={<Pg />} />', 'const Pg = lazy(() => import("@/pages/pg/Pg"));'),
    'src/pages/pg/Pg.tsx': pagina(`import { useCoisa } from '@/hooks/useCoisa';
import { Vizinho } from './Vizinho';
import { C1 } from '@/components/c/C1';
import { Botao } from '@/components/ui/botao';
import './pg.css';
import logo from './logo.svg?react';
import { sumiu } from './nao-existe';
import x from 'pacote-externo';`),
    'src/pages/pg/Vizinho.tsx': "import { Pg } from './Pg';\nsupabase.from('t_vizinho');\n",
    'src/pages/pg/Pg.test.tsx': "supabase.from('t_teste');\n",
    'src/hooks/useCoisa.ts': "import { api } from '@/lib/api';\nexport const useCoisa = () => supabase.from('t_hook');\n",
    'src/lib/api.ts': "import '@/hooks/useCoisa';\nexport const api = () => supabase.rpc('fn_lib');\n",
    'src/components/c/C1.tsx': "import { C2 } from './C2';\nsupabase.from('t_c1');\n",
    'src/components/c/C2.tsx': "import { C3 } from './C3';\nsupabase.from('t_c2');\n",
    'src/components/c/C3.tsx': "supabase.from('t_c3');\n",
    'src/components/ui/botao.tsx': "supabase.from('t_ui');\n",
  });
  const inv = m.gerarRotas(raiz);
  const u = inv.urls[0];
  assert.deepEqual(u.tabelas, ['t_c1', 't_c2', 't_hook', 't_vizinho']);
  assert.deepEqual(u.rpcs, ['fn_lib']);
  assert.deepEqual(u.hooks, [{ nome: 'useCoisa', arquivo: 'src/hooks/useCoisa.ts' }]);
  assert.deepEqual(u.imports_quebrados, ['src/pages/pg/Pg.tsx -> ./nao-existe']);
  assert.equal(inv.resumo.paginas, 1, 'a mesma pagina em 2 URLs conta 1');
  assert.deepEqual(inv.hooks.useCoisa.urls, ['/p', '/p/:id']);
  assert.equal(inv.problemas.filter((p) => p.tipo === 'import_quebrado').length, 2);
});

// ---------- CLI ----------
test('CLI: grava, --check em dia = 0, --check desatualizado/ausente = 1, repo com espaco e acento no caminho', () => {
  const raiz = repoFalso({
    'src/routes/AppRoutes.tsx': appRoutes('    <Route path="/a" element={<A />} />', 'const A = lazy(() => import("@/pages/A"));'),
    'src/pages/A.tsx': pagina(),
  }, { scripts: [SCRIPT], nome: 'repo com espaço' });
  const cli = (...args) => rodar(process.execPath, [path.join(raiz, SCRIPT), ...args], { cwd: '/' });
  let r = cli('--check');
  assert.equal(r.status, 1, r.saida);
  r = cli();
  assert.equal(r.status, 0, r.saida);
  assert.match(r.stdout, /rotas\.json: 1 URLs \(0 protegidas\), 1 paginas, 0 hooks, 0 problemas\./);
  const saida = path.join(raiz, 'inventario/estado/rotas.json');
  const primeiro = fs.readFileSync(saida, 'utf8');
  assert.ok(primeiro.endsWith('}\n'));
  assert.equal(cli('--check').status, 0);
  cli();
  assert.equal(fs.readFileSync(saida, 'utf8'), primeiro, 'segunda execucao = mesmo arquivo');
  fs.appendFileSync(path.join(raiz, 'src/routes/AppRoutes.tsx'), '\n');
  assert.equal(cli('--check').status, 0, 'mudanca fora do <Routes> nao desatualiza');
  fs.writeFileSync(saida, primeiro.replace('"/a"', '"/b"'));
  assert.equal(cli('--check').status, 1);
});
