// Teste do gerador de contexto (scripts/ai-context/gerar.mjs).
// Monta um repositório sintético em pasta temporária cobrindo os casos que o gerador precisa
// entender (rotas aninhadas, lazy, menu, hooks, edge functions, migrations em ordem,
// barrel re-export, backend HTTP, Python, nested tsconfig) e confere a saída.
// Rodar: node --test scripts/ai-context/gerar.unit.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const GERADOR = fileURLToPath(new URL('gerar.mjs', import.meta.url));
const w = (root, rel, text) => { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); };

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-ia-'));
  w(root, 'package.json', JSON.stringify({ name: 'fixture', version: '1.0.0', scripts: { dev: 'vite', test: 'vitest run', audit: 'node scripts/audit.mjs' }, dependencies: { react: '18', 'react-router-dom': '6', '@supabase/supabase-js': '2', express: '4', stripe: '14' }, devDependencies: { vitest: '1', typescript: '5', vite: '5' } }));
  w(root, 'tsconfig.json', JSON.stringify({ compilerOptions: { strict: true, paths: { '@/*': ['./src/*'] } } }));
  w(root, '.env.example', 'VITE_SUPABASE_URL=\nVITE_API_KEY=\n');
  w(root, 'README.md', '# Fixture\n');
  w(root, 'src/main.tsx', `import { QueryClientProvider } from '@tanstack/react-query';\nimport { AppRoutes } from '@/routes/AppRoutes';\nexport const Root = () => <QueryClientProvider><AppRoutes/></QueryClientProvider>;`);
  w(root, 'src/routes/AppRoutes.tsx', `import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Login from '@/pages/Login';
import { lazy } from 'react';
const Admin = lazy(() => import('@/pages/admin/Admin'));
export function AppRoutes() {
  return (<Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/app" element={<ProtectedRoute><Shell /></ProtectedRoute>}>
      <Route index element={<Home />} />
      <Route path="contacts/:id" element={<ContactPage />} />
    </Route>
    <Route path="/admin" element={<Admin />} />
    <Route {...{ path: '/access-denied' }} element={<Login />} />
    <Route path="/old" element={<Navigate to="/app" />} />
  </Routes>);
}
import { Shell } from '@/components/layout/Shell';
import { Home } from '@/components/home/Home';
import { ContactPage } from '@/components/contacts/ContactPage';`);
  w(root, 'src/components/auth/ProtectedRoute.tsx', `export const ProtectedRoute = ({ children }) => <>{children}</>;`);
  w(root, 'src/components/layout/Shell.tsx', `import { Outlet } from 'react-router-dom';\nexport const Shell = () => <div><Outlet/></div>;`);
  w(root, 'src/pages/ViewRouter.tsx', `import * as Views from '@/pages/lazyViews';\nconst VIEW_MAP = { home: Views.HomeLazy };\nconst SPECIAL_VIEWS = {\n  'achievements': (props) => (\n    <Boundary><Views.AchievementsLazy userId={props.userId} /></Boundary>\n  ),\n};\nexport const ViewRouter = ({ v }) => SPECIAL_VIEWS[v] ? SPECIAL_VIEWS[v]({}) : null;`);
  w(root, 'src/pages/lazyViews.ts', `import { lazy } from 'react';\nexport const HomeLazy = lazy(() => import('@/components/home/Home').then(m => ({ default: m.Home })));\nexport const AchievementsLazy = lazy(() => import('@/components/achievements/Achievements'));`);
  w(root, 'src/components/achievements/Achievements.tsx', `export default function Achievements() { return <ol/>; }`);
  w(root, 'src/components/layout/sidebarNav.ts', `const STAFF: string[] = ['admin', 'supervisor'];\nexport const sidebarGroups = [{ title: 'Principal', items: [{ id: 'home', label: 'Início', path: '/app' }, { id: 'contacts', label: 'Contatos', path: '/app/contacts/:id', roles: ['admin'] }, { id: 'staff', label: 'Equipe', path: '/admin', roles: STAFF }, { id: 'x', label: 'Externo', path: '/login', roles: EXTERNAL }, { id: 'ghost', label: 'Fantasma', path: '/nada' }] }];`);
  w(root, 'src/components/home/Home.tsx', `import { useContacts } from '@/hooks/useContacts';\nexport const Home = () => { const c = useContacts(); return <div>{c.length}</div>; };`);
  w(root, 'src/components/contacts/ContactPage.tsx', `import { Card } from '@/components/ui';\nimport { useContacts } from '@/hooks/useContacts';\nexport const ContactPage = () => { useContacts(); return <Card/>; };`);
  w(root, 'src/components/ui/index.ts', `export { Card } from './Card';\nexport * from './Button';`);
  w(root, 'src/components/ui/Card.tsx', `export const Card = () => <div/>;`);
  w(root, 'src/components/ui/Button.tsx', `export const Button = () => <button/>;`);
  w(root, 'src/components/ui/Unused.tsx', `export const Unused = () => <i/>;`);
  w(root, 'src/pages/Login.tsx', `export default function Login() { return <form/>; }`);
  w(root, 'src/pages/admin/Admin.tsx', `import { supabase } from '@/lib/supabase';\nexport const Admin = () => { const role = 'admin'; if (role === 'admin') supabase.rpc('is_admin'); return <div/>; };`);
  w(root, 'src/hooks/useContacts.ts', `import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
export function useContacts() { return useQuery(['c'], async () => { const { data } = await supabase.from('contacts').select('*'); await supabase.functions.invoke('send-email', { body: {} }); return data; }); }`);
  w(root, 'src/lib/supabase.ts', `import { createClient } from '@supabase/supabase-js';\nexport const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_ANON);\nconst flag = isFeatureEnabled('novo-inbox');`);
  w(root, 'src/hooks/__tests__/useContacts.test.ts', `import { useContacts } from '../useContacts';\nit('x', () => {}); test('y', () => {});`);
  w(root, 'server/api.ts', `import express from 'express';\nconst app = express();\napp.get('/health', (req, res) => res.send('ok'));\napp.post('/webhook/stripe', handler);`);
  w(root, 'backend/app.py', `from fastapi import FastAPI\nimport os\nfrom . import models\napp = FastAPI()\n@app.get('/items')\ndef items():\n    return os.environ.get('DB_URL')\n`);
  w(root, 'backend/models.py', `from sqlalchemy.orm import DeclarativeBase\nclass Base(DeclarativeBase):\n    pass\nclass Item(Base):\n    pass\n`);
  w(root, 'supabase/config.toml', `project_id = "x"\n\n[functions.stripe-webhook]\nverify_jwt = false\n`);
  w(root, 'supabase/functions/send-email/index.ts', `const key = Deno.env.get('RESEND_API_KEY');\nDeno.serve(async (req) => { if (req.method === 'POST') { await supabase.from('emails').insert({}); } return fetch('https://api.resend.com/x'); });`);
  w(root, 'supabase/functions/stripe-webhook/index.ts', `Deno.serve(async (req) => { await supabase.from('payments').insert({}); return new Response('ok'); });`);
  w(root, 'supabase/functions/orphan-fn/index.ts', `Deno.serve(() => new Response('x'));`);
  w(root, 'supabase/migrations/001_init.sql', `create table public.contacts (id uuid primary key default gen_random_uuid(), name text not null, email text, "createdAt" timestamptz default now(), lat double precision, created2 timestamp with time zone);
alter table public.contacts enable row level security;
create policy "contacts_select" on public.contacts for select to authenticated using (true);
create index contacts_email_idx on public.contacts (email);
create table public.legacy (id int);
create table public.emails (id uuid primary key, contact_id uuid references public.contacts(id));
create or replace function public.is_admin(uid uuid) returns boolean language sql as $$ select true; $$;
create type public.app_role as enum ('admin', 'agent');
insert into storage.buckets (id, name) values ('avatars', 'avatars');
select cron.schedule('nightly', '0 3 * * *', $$ select net.http_post('https://x.supabase.co/functions/v1/send-email') $$);`);
  w(root, 'supabase/migrations/002_evolve.sql', `alter table public.contacts add column phone text, drop column email;
drop policy if exists "contacts_select" on public.contacts;
create policy "contacts_select" on public.contacts for select to authenticated using (auth.uid() = id);
create policy "contacts_insert" on public.contacts for insert to authenticated with check (true);
drop table public.legacy;
create table public.payments (id uuid primary key, amount numeric);
create trigger trg_pay after insert on public.payments for each row execute function public.is_admin();
alter table public.contacts alter column phone set not null, alter column phone set default 'n/a';
do $$ begin
  drop policy if exists "contacts_insert" on public.contacts;
  create policy "contacts_insert" on public.contacts for insert to service_role with check (true);
  execute format('create policy %I on public.payments for select using (true)', 'dyn');
end $$;`);
  w(root, 'src/integrations/supabase/types.ts', `export type Database = {\n  public: {\n    Tables: {\n      contacts: {\n        Row: {\n          id: string\n          name: string\n          phone: string | null\n          extra_col: string\n        }\n        Insert: { id?: string }\n      }\n    }\n  }\n}`);
  w(root, 'scripts/audit.mjs', `// Audita o banco.\nconsole.log(process.env.DB_URL);`);
  w(root, 'scripts/orphan.sh', `#!/bin/sh\necho x`);
  w(root, '.github/workflows/ci.yml', `name: CI\non:\n  push:\n    branches: [main]\n  pull_request:\npermissions:\n  contents: read\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm run test\n      - run: node scripts/audit.mjs\n        env:\n          T: \${{ secrets.DB_TOKEN }}\n`);
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '-A'], { cwd: root });
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'feat: fixture'], { cwd: root });
  return root;
}

const root = fixture();
const out = path.join(root, 'inventario/ia');
execFileSync(process.execPath, [GERADOR, '--quiet'], { cwd: root });
const J = (f) => JSON.parse(fs.readFileSync(path.join(out, f), 'utf8'));

test('gera todos os arquivos e sem erros de seção', () => {
  for (const f of ['INDEX.md', 'manifest.json', 'rotas.json', 'modulos.json', 'componentes.json', 'hooks.json', 'edge-functions.json', 'banco.json', 'ferramentas.json', 'scripts.json', 'testes.json', 'logica.json', 'grafo.json', 'grafo-arestas.json', 'convencoes.json', 'baseline.json', 'grafo-graphify.json']) assert.ok(fs.existsSync(path.join(out, f)), f);
  assert.deepEqual(J('manifest.json').erros, []);
  assert.equal(J('manifest.json').commit.length, 40);
});

test('rotas: aninhamento, index, lazy, proteção herdada e fecho transitivo', () => {
  const r = J('rotas.json'); const by = Object.fromEntries(r.urls.filter((u) => !u.indice).map((u) => [u.caminho, u]));
  assert.equal(by['/login'].arquivo, 'src/pages/Login.tsx');
  assert.equal(by['/app'].arquivo, 'src/components/layout/Shell.tsx');
  assert.equal(by['/app'].protegida, true);
  assert.equal(by['/app/contacts/:id'].arquivo, 'src/components/contacts/ContactPage.tsx');
  assert.equal(by['/app/contacts/:id'].pai, '/app');
  assert.equal(by['/app/contacts/:id'].protegida, true, 'filha herda proteção do pai');
  assert.ok(r.urls.some((u) => u.indice && u.caminho === '/app' && u.arquivo === 'src/components/home/Home.tsx'), 'rota index');
  assert.equal(by['/admin'].lazy, true);
  assert.equal(by['/admin'].arquivo, 'src/pages/admin/Admin.tsx');
  assert.deepEqual(by['/app/contacts/:id'].tabelas, ['contacts']);
  assert.deepEqual(by['/app/contacts/:id'].edges, ['send-email']);
  assert.deepEqual(by['/app/contacts/:id'].hooks_locais, ['useContacts']);
  assert.deepEqual(by['/admin'].papeis, ['admin']);
  assert.equal(by['/access-denied'].arquivo, 'src/pages/Login.tsx', 'path via spread');
  assert.equal(by['/old'].tipo, 'redirect'); assert.equal(by['/old'].redireciona, '/app');
  const vistas = Object.fromEntries(r.vistas.map((v) => [v.id, v]));
  assert.equal(vistas.home.arquivo, 'src/components/home/Home.tsx');
  assert.equal(vistas.achievements.arquivo, 'src/components/achievements/Achievements.tsx', 'SPECIAL_VIEWS com função');
});

test('rotas HTTP de backend (express) e Python (FastAPI)', () => {
  const r = J('rotas.json');
  assert.ok(r.rotas_http_backend.some((x) => x.metodo === 'GET' && x.caminho === '/health' && x.arquivo === 'server/api.ts'));
  assert.ok(r.rotas_http_backend.some((x) => x.metodo === 'GET' && x.caminho === '/items' && x.arquivo === 'backend/app.py'));
});

test('menu: resolve destino, grupo, papéis e aponta item sem destino', () => {
  const r = J('rotas.json'); const m = Object.fromEntries(r.menu.map((x) => [x.rotulo, x]));
  assert.equal(m['Início'].resolve_para, 'src/components/layout/Shell.tsx');
  assert.equal(m['Início'].grupo, 'Principal');
  assert.deepEqual(m['Contatos'].papeis, ['admin']);
  assert.deepEqual(J('baseline.json').alertas.menu_sem_destino, ['Fantasma -> /nada']);
  assert.deepEqual(m['Equipe'].papeis, ['admin', 'supervisor'], 'roles por constante');
  assert.equal(m['Externo'].papeis_nao_resolvidos, 'EXTERNAL');
});

test('módulos: menu → módulo → hooks → edges → tabelas', () => {
  const mod = J('modulos.json').modulos.find((x) => x.modulo === 'components/contacts');
  assert.deepEqual(mod.itens_menu, ['Contatos']);
  assert.deepEqual(mod.hooks_locais, ['useContacts']);
  assert.deepEqual(mod.edges, ['send-email']);
  assert.deepEqual(mod.tabelas, ['contacts']);
  assert.ok(mod.depende_de_modulos.includes('hooks/useContacts.ts') || mod.depende_de_modulos.includes('hooks'));
  assert.ok(mod.depende_de_modulos.includes('components/ui'));
});

test('barrel re-export não gera órfão; componente sem uso é órfão', () => {
  const co = J('componentes.json'); const by = Object.fromEntries(co.componentes.map((x) => [x.arquivo, x]));
  assert.equal(by['src/components/ui/Card.tsx'].orfao, false, 'reexportado pelo index.ts');
  assert.equal(by['src/components/ui/Button.tsx'].orfao, false, 'export * from');
  assert.equal(by['src/components/ui/Unused.tsx'].orfao, true);
  assert.ok(J('componentes.json').componentes.some((x) => x.arquivo === 'src/pages/Login.tsx' && x.export_default === 'Login'));
});

test('hooks: tabelas/edges e cobertura por teste', () => {
  const h = J('hooks.json').hooks.find((x) => x.arquivo === 'src/hooks/useContacts.ts');
  assert.deepEqual(h.hooks_exportados, ['useContacts']);
  assert.deepEqual(h.tabelas, ['contacts']);
  assert.equal(h.usado_por, 2);
  assert.equal(h.coberto_por_testes, 1);
  assert.equal(J('testes.json').arquivos[0].casos, 2);
});

test('edge functions: verify_jwt, env, quem chama, cron e órfãs', () => {
  const e = J('edge-functions.json'); const by = Object.fromEntries(e.edges.map((x) => [x.nome, x]));
  assert.equal(by['send-email'].verify_jwt, true);
  assert.deepEqual(by['send-email'].env, ['RESEND_API_KEY']);
  assert.deepEqual(by['send-email'].metodos, ['POST']);
  assert.deepEqual(by['send-email'].chamada_pelo_front, ['src/hooks/useContacts.ts']);
  assert.equal(by['send-email'].chamada_por_sql_ou_cron, true);
  assert.deepEqual(by['send-email'].hosts_externos, ['api.resend.com']);
  assert.equal(by['stripe-webhook'].verify_jwt, false);
  assert.equal(by['stripe-webhook'].orfa, false, 'webhook sem jwt não é órfã');
  assert.equal(by['orphan-fn'].orfa, true);
});

test('banco: migrations em ordem (add/drop coluna, drop+create policy, drop table), cron, buckets, drift', () => {
  const b = J('banco.json'); const t = b.tabelas.contacts;
  assert.deepEqual(Object.keys(t.colunas), ['created2', 'createdAt', 'id', 'lat', 'name', 'phone'], 'email removida, phone adicionada');
  assert.equal(t.colunas.lat.tipo, 'double precision');
  assert.equal(t.colunas.created2.tipo, 'timestamp with time zone');
  assert.equal(t.colunas.phone.nn, true, 'SET NOT NULL aplicado');
  assert.equal(t.colunas.phone.default, "'n/a'");
  assert.equal(t.policies.find((p) => p.nome === 'contacts_insert').para, 'service_role', 'policy recriada dentro de DO $$');
  assert.equal(b.avisos.length, 1, 'DDL dinâmico sinalizado');
  assert.equal(t.colunas.name.nn, true);
  assert.equal(t.rls, true);
  assert.deepEqual(t.policies.map((p) => p.nome + ':' + p.comando), ['contacts_insert:insert', 'contacts_select:select']);
  assert.deepEqual(t.indices.map((i) => i.nome), ['contacts_email_idx']);
  assert.equal(b.tabelas.legacy, undefined, 'drop table');
  assert.deepEqual(b.tabelas.emails.fks, ['contact_id->contacts']);
  assert.deepEqual(b.tabelas.payments.triggers, ['trg_pay']);
  assert.equal(b.tabelas.payments.sem_rls, true);
  assert.deepEqual(b.funcoes, ['is_admin']);
  assert.deepEqual(b.enums.app_role, ['admin', 'agent']);
  assert.deepEqual(b.cron_jobs, [{ nome: 'nightly', agenda: '0 3 * * *', migration: '001_init.sql', chama_edge: 'send-email' }]);
  assert.ok(b.buckets.some((x) => x.nome === 'avatars' && x.criado_em_sql));
  assert.deepEqual(t.drift, { so_na_migration: ['createdAt', 'lat', 'created2'], so_no_types: ['extra_col'] });
  assert.deepEqual(b.rpcs_usadas_no_codigo, [{ nome: 'is_admin', definida: true, usada_em: 1 }]);
});

test('ferramentas: env, workflows, scripts, integrações, permissões, flags, providers', () => {
  const f = J('ferramentas.json');
  assert.deepEqual(f.env.usadas_mas_nao_declaradas, ['VITE_ANON']);
  assert.equal(f.workflows[0].nome, 'CI');
  assert.deepEqual(f.workflows[0].gatilhos, ['pull_request', 'push']);
  assert.deepEqual(f.workflows[0].secrets, ['DB_TOKEN']);
  assert.deepEqual(f.workflows[0].scripts_usados, ['scripts/audit.mjs']);
  const s = Object.fromEntries(J('scripts.json').scripts.map((x) => [x.arquivo, x]));
  assert.deepEqual(s['scripts/audit.mjs'].npm_scripts, ['audit']);
  assert.equal(s['scripts/audit.mjs'].orfao, false);
  assert.equal(s['scripts/orphan.sh'].orfao, true);
  assert.ok(f.integracoes.sdks.some((x) => x.servico === 'Stripe'));
  assert.ok(f.integracoes.webhooks_recebidos.includes('stripe-webhook'));
  assert.ok(f.integracoes.webhooks_recebidos.includes('POST /webhook/stripe'));
  assert.deepEqual(f.permissoes.papeis_no_codigo, [{ papel: 'admin', ocorrencias: 2 }]);
  assert.deepEqual(f.feature_flags.flags, [{ flag: 'novo-inbox', arquivos: 1 }]);
  assert.ok(f.providers.providers.includes('QueryClientProvider'));
  assert.equal(f.stack.framework, 'React');
  assert.deepEqual(f.stack.backend_http, ['express', 'fastapi']);
});

test('grafo, convenções e determinismo', () => {
  const g = J('grafo.json');
  assert.ok(g.hubs[0].arquivo === 'src/lib/supabase.ts' || g.hubs[0].arquivo === 'src/hooks/useContacts.ts');
  assert.equal(g.ciclos.total, 0);
  const c = J('convencoes.json');
  assert.equal(c.alias_imports['(raiz)']['@/'], 'src/');
  assert.equal(c.typescript.strict, true);
  assert.match(c.nomenclatura.componentes, /^PascalCase/);
  const antes = fs.readFileSync(path.join(out, 'rotas.json'), 'utf8');
  execFileSync(process.execPath, [GERADOR, '--quiet'], { cwd: root });
  assert.equal(fs.readFileSync(path.join(out, 'rotas.json'), 'utf8'), antes, 'saída determinística');
  const l = J('logica.json'); assert.ok(l.arquivos.some((x) => x.arquivo === 'backend/models.py' && x.exports.includes('Item')));
});

test('INDEX.md: rodapé de publicação é genérico por padrão e segue ai-context.config.json → publicacao', () => {
  const idx = fs.readFileSync(path.join(out, 'INDEX.md'), 'utf8');
  assert.match(idx, /Publicado pelo workflow de contexto do repositório/);
  assert.doesNotMatch(idx, /contexto-ia/, 'nome de branch/workflow de um repo específico não pode estar fixo no gerador');
  w(root, 'ai-context.config.json', JSON.stringify({ publicacao: 'Publicado na branch `xyz` pelo workflow `xyz.yml`.' }));
  execFileSync(process.execPath, [GERADOR, '--quiet'], { cwd: root });
  assert.match(fs.readFileSync(path.join(out, 'INDEX.md'), 'utf8'), /Publicado na branch `xyz` pelo workflow `xyz.yml`\./);
  fs.rmSync(path.join(root, 'ai-context.config.json'));
});

function isolatedFixture(t, prepare) {
  const fixtureRoot = fixture();
  t.after(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));
  prepare(fixtureRoot);
  execFileSync(process.execPath, [GERADOR, '--quiet'], { cwd: fixtureRoot });
  return (name) => JSON.parse(fs.readFileSync(path.join(fixtureRoot, 'inventario/ia', name), 'utf8'));
}

test('git: histórico preserva data, assunto e barras verticais sem executar shell', (t) => {
  const read = isolatedFixture(t, (dir) => {
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '--allow-empty', '-q', '-m', 'fix: assunto | literal'], { cwd: dir });
  });
  const commits = read('baseline.json').git.ultimos_commits;
  assert.equal(commits.length, 2);
  assert.equal(commits[0].assunto, 'fix: assunto | literal');
  assert.match(commits[0].sha, /^[a-f0-9]{7,40}$/);
  assert.match(commits[0].data, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(commits[1].assunto, 'feat: fixture');
});

test('banco: arquivos _foreign e _superseded não alteram a reconstrução vigente', (t) => {
  const read = isolatedFixture(t, (dir) => {
    w(dir, 'supabase/migrations/_foreign/singu/001_foreign.sql', `create table public.foreign_only (id int);
select cron.schedule('archived-job', '* * * * *', $$ select net.http_post('https://x.supabase.co/functions/v1/orphan-fn') $$);`);
    w(dir, 'supabase/migrations/_superseded/000_old.sql', `alter table public.contacts add column archived_only text;
create table public.legacy (id int);
create or replace function public.archived_fn() returns boolean language sql as $$ select true $$;
create policy "archived_policy" on public.contacts for select using (true);`);
  });
  const banco = read('banco.json');
  assert.equal(banco.migrations, 2);
  assert.equal(banco.tabelas.foreign_only, undefined);
  assert.equal(banco.tabelas.legacy, undefined);
  assert.equal(banco.tabelas.contacts.colunas.archived_only, undefined);
  assert.ok(!banco.tabelas.contacts.policies.some((p) => p.nome === 'archived_policy'));
  assert.deepEqual(banco.funcoes, ['is_admin']);
  assert.deepEqual(banco.cron_jobs.map((c) => c.nome), ['nightly']);
  const orphan = read('edge-functions.json').edges.find((e) => e.nome === 'orphan-fn');
  assert.equal(orphan.chamada_por_sql_ou_cron, false);
  assert.equal(orphan.orfa, true);
});

test('alertas de aplicação ignoram testes, stories e tooling, preservando seus inventários', (t) => {
  const read = isolatedFixture(t, (dir) => {
    const sample = `supabase.from('ghost_table').select('*'); supabase.rpc('ghost_rpc');
supabase.functions.invoke('ghost-edge'); supabase.functions.invoke('orphan-fn');`;
    for (const file of ['src/__tests__/calls.test.ts', 'src/components/Demo.stories.tsx', 'supabase/functions/send-email/sample.test.ts',
      'scripts/check.mjs', 'tools/check.mjs', '.github/scripts/check.mjs', 'docs/example.ts', 'packages/demo/scripts/check.mjs']) w(dir, file, sample);
    w(dir, 'worker/job.ts', `supabase.from('runtime_table').select('*'); supabase.rpc('runtime_rpc');
supabase.functions.invoke('runtime-missing'); supabase.functions.invoke('runtime-fn');`);
    w(dir, 'supabase/functions/runtime-fn/index.ts', `Deno.serve(() => new Response('ok'));`);
  });
  const baseline = read('baseline.json');
  assert.deepEqual(baseline.alertas.tabelas_usadas_sem_definicao, ['runtime_table']);
  assert.deepEqual(baseline.alertas.rpcs_sem_definicao, ['runtime_rpc']);
  assert.deepEqual(baseline.alertas.edges_chamadas_sem_pasta, ['runtime-missing']);
  const edges = Object.fromEntries(read('edge-functions.json').edges.map((e) => [e.nome, e]));
  assert.equal(edges['orphan-fn'].orfa, true);
  assert.deepEqual(edges['orphan-fn'].chamada_pelo_front, []);
  assert.deepEqual(edges['orphan-fn'].chamada_por_edges, []);
  assert.equal(edges['runtime-fn'].orfa, false);
  assert.deepEqual(edges['runtime-fn'].chamada_pelo_front, ['worker/job.ts']);
  assert.ok(read('scripts.json').scripts.some((s) => s.arquivo === 'scripts/check.mjs'));
  assert.ok(read('testes.json').arquivos.some((s) => s.arquivo === 'src/__tests__/calls.test.ts'));
});

test('alertas respeitam srcDirs explícito quando uma pasta de ferramentas contém a aplicação', (t) => {
  const read = isolatedFixture(t, (dir) => {
    w(dir, 'ai-context.config.json', JSON.stringify({ srcDirs: ['tools'] }));
    w(dir, 'tools/app.ts', `supabase.from('tools_runtime').select('*'); supabase.rpc('tools_rpc'); supabase.functions.invoke('tools-edge');`);
  });
  const alerts = read('baseline.json').alertas;
  assert.ok(alerts.tabelas_usadas_sem_definicao.includes('tools_runtime'));
  assert.ok(alerts.rpcs_sem_definicao.includes('tools_rpc'));
  assert.ok(alerts.edges_chamadas_sem_pasta.includes('tools-edge'));
});

test('diretórios de fixtures permanecem no inventário de testes sem criar alertas de aplicação', (t) => {
  const fixtureFiles = ['src/fixtures/calls.ts', 'src/components/__fixtures__/calls.ts',
    'supabase/functions/send-email/fixtures/calls.ts', 'packages/demo/src/__fixtures__/calls.ts'];
  const read = isolatedFixture(t, (dir) => {
    const sample = `supabase.from('fixture_table').select('*'); supabase.rpc('fixture_rpc');
supabase.functions.invoke('fixture-edge'); supabase.functions.invoke('orphan-fn');`;
    for (const file of fixtureFiles) w(dir, file, sample);
    w(dir, 'src/fixtures-dashboard.ts', `supabase.from('dashboard_table').select('*');
supabase.rpc('dashboard_rpc'); supabase.functions.invoke('dashboard-edge');`);
  });
  const alerts = read('baseline.json').alertas;
  assert.deepEqual(alerts.tabelas_usadas_sem_definicao, ['dashboard_table']);
  assert.deepEqual(alerts.rpcs_sem_definicao, ['dashboard_rpc']);
  assert.deepEqual(alerts.edges_chamadas_sem_pasta, ['dashboard-edge']);
  const files = new Set(read('testes.json').arquivos.map((entry) => entry.arquivo));
  for (const file of fixtureFiles) assert.ok(files.has(file), file);
  assert.ok(!files.has('src/fixtures-dashboard.ts'));
  const orphan = read('edge-functions.json').edges.find((edge) => edge.nome === 'orphan-fn');
  assert.equal(orphan.orfa, true);
  assert.deepEqual(orphan.chamada_pelo_front, []);
  assert.deepEqual(orphan.chamada_por_edges, []);
});

// ---------------------------------------------------------------------------------------------
// Regressões de VERDADE da saída: cada caso abaixo reproduz uma afirmação falsa que o gerador
// publicava sobre este repositório (padrões reais de src/routes/AppRoutes.tsx, supabase/functions,
// .github/workflows e scripts/) e falha sem a correção correspondente em gerar.mjs.
// ---------------------------------------------------------------------------------------------
const rodar = (cwd, args = [], env = {}) => spawnSync(process.execPath, [GERADOR, ...args], { cwd, encoding: 'utf8', env: { ...process.env, ...env } });
const repoMinimo = (t, arquivos = {}) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-ia-min-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  w(dir, 'package.json', JSON.stringify({ name: 'minimo', dependencies: { react: '18', 'react-router-dom': '6' } }));
  w(dir, 'src/a.ts', 'export const a = 1;');
  for (const [rel, texto] of Object.entries(arquivos)) w(dir, rel, texto);
  return dir;
};
const lerSaida = (dir, nome, pasta = 'inventario/ia') => JSON.parse(fs.readFileSync(path.join(dir, pasta, nome), 'utf8'));

test('rotas: filhas de rota-layout sem path herdam a proteção; fallback/errorElement não viram a tela; página Auth/Admin não é guarda', (t) => {
  const read = isolatedFixture(t, (dir) => {
    w(dir, 'src/routes/AppRoutes.tsx', `import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Shell } from '@/components/layout/Shell';
import { PageLoader } from '@/components/layout/PageLoader';
import { ErrorPage } from '@/components/layout/ErrorPage';
const Auth = lazy(() => import('@/pages/auth/Auth'));
const Compras = lazy(() => import('@/pages/Compras'));
const AdminPainel = lazy(() => import('@/pages/AdminPainel'));
export function AppRoutes() {
  return (<Routes>
    <Route path="/auth" element={
      <Suspense fallback={<PageLoader />}>
        <Auth />
      </Suspense>
    } />
    <Route element={<ProtectedRoute><Shell /></ProtectedRoute>}>
      <Route path="/" element={<Navigate to="/compras" replace />} />
      <Route path="/compras" element={<Compras />} />
      <Route path="/pedidos">
        <Route path=":id" element={<Compras />} />
      </Route>
    </Route>
    <Route path="/vitrine" element={<Compras />} errorElement={<ErrorPage />} />
    <Route path="/admin-aberto" element={<AdminPainel />} />
  </Routes>);
}`);
    w(dir, 'src/components/layout/PageLoader.tsx', 'export const PageLoader = () => <i/>;');
    w(dir, 'src/components/layout/ErrorPage.tsx', 'export const ErrorPage = () => <i/>;');
    w(dir, 'src/pages/auth/Auth.tsx', 'export default function Auth() { return <form/>; }');
    w(dir, 'src/pages/Compras.tsx', 'export default function Compras() { return <div/>; }');
    w(dir, 'src/pages/AdminPainel.tsx', 'export default function AdminPainel() { return <div/>; }');
    w(dir, 'src/components/layout/sidebarNav.ts', `export const sidebarGroups = [{ title: 'Principal', items: [{ id: 'dash', label: 'Dashboard', path: '/' }, { id: 'c', label: 'Compras', path: '/compras' }] }];`);
  });
  const r = read('rotas.json'); const by = Object.fromEntries(r.urls.map((u) => [u.caminho, u]));
  assert.equal(by['/compras'].protegida, true, 'filha de <Route element={<ProtectedRoute>…}> sem path');
  assert.equal(by['/'].protegida, true, 'redirect dentro do layout protegido');
  assert.equal(by['/pedidos/:id'].protegida, true, 'neta herda pela pilha');
  assert.equal(by['/auth'].componente, 'Auth', 'o fallback do Suspense não é a tela');
  assert.equal(by['/auth'].arquivo, 'src/pages/auth/Auth.tsx');
  assert.equal(by['/auth'].protegida, false, 'a tela de login não é protegida só por se chamar Auth');
  assert.deepEqual(by['/auth'].wrappers, ['Suspense']);
  assert.equal(by['/vitrine'].arquivo, 'src/pages/Compras.tsx', 'errorElement não é a tela');
  assert.equal(by['/vitrine'].protegida, false, 'fora do layout protegido');
  assert.equal(by['/admin-aberto'].protegida, false, 'página AdminPainel sem guarda não é protegida');
  assert.deepEqual(read('ferramentas.json').permissoes.rotas_publicas, ['/admin-aberto', '/auth', '/vitrine']);
  const menu = Object.fromEntries(r.menu.map((x) => [x.rotulo, x]));
  assert.equal(menu.Dashboard.resolve_para, 'src/pages/Compras.tsx', 'item de menu para rota de redirect resolve para a tela final');
  assert.deepEqual(read('baseline.json').alertas.menu_sem_destino, []);
});

test('edge functions: invoke com genérico/query string/template conta como chamada; pasta sem entrada não é edge; _test.ts do Deno é teste', (t) => {
  const nomes = ['fn-generico', 'fn-aninhado', 'fn-query', 'fn-template', 'fn-interp'];
  const read = isolatedFixture(t, (dir) => {
    for (const n of nomes) w(dir, `supabase/functions/${n}/index.ts`, `Deno.serve(() => new Response('ok'));`);
    w(dir, 'src/lib/chamadas.ts', `supabase.functions.invoke<unknown>('fn-generico', { body: {} });
supabase.functions.invoke<Envelope<T>>('fn-aninhado');
supabase.functions.invoke("fn-query?history=true");
supabase.functions.invoke<Payload>(
  \`fn-template?alert_id=\${encodeURIComponent(id)}\`,
  { method: 'GET' },
);
supabase.functions.invoke(\`fn-interp\${dispatch ? '?x=1' : ''}\`);`);
    w(dir, 'supabase/functions/tests/integration_suite.ts', `Deno.test('x', () => {});`);
    w(dir, 'supabase/functions/orphan-fn/rls_test.ts', `Deno.env.get('SO_DO_TESTE'); Deno.test('x', () => {});`);
  });
  const e = read('edge-functions.json'); const by = Object.fromEntries(e.edges.map((x) => [x.nome, x]));
  for (const n of nomes) { assert.deepEqual(by[n].chamada_pelo_front, ['src/lib/chamadas.ts'], n); assert.equal(by[n].orfa, false, n); }
  assert.deepEqual(read('baseline.json').alertas.edges_chamadas_sem_pasta, [], 'nome da função sem a query string');
  assert.equal(by.tests, undefined, 'supabase/functions/tests/ só tem suíte: não é função publicável');
  assert.equal(by['orphan-fn'].arquivos, 1, 'rls_test.ts não é código da função');
  assert.equal(by['orphan-fn'].testes, 1);
  assert.deepEqual(by['orphan-fn'].env, [], 'env lida só pelo teste não é env da função');
  assert.ok(read('testes.json').arquivos.some((x) => x.arquivo === 'supabase/functions/orphan-fn/rls_test.ts'));
  assert.ok(!read('ferramentas.json').env.usadas_nas_edges.includes('SO_DO_TESTE'));
});

test('fatos da aplicação não saem de ferramentas nem de testes: rotas HTTP, hooks, ORM, flags, hosts, papéis, buckets e env', (t) => {
  const read = isolatedFixture(t, (dir) => {
    // Script com trechos de código em string, como scripts/ai-context/cenarios.mjs deste repo.
    w(dir, 'scripts/cenarios-ferramenta.mjs', `const A = "app.get('/rota-falsa', h); export const useFalso = () => 1; pgTable('tabela_falsa', { id: uuid('id') }); isFeatureEnabled('flag-falsa'); fetch('https://host-falso.ferramenta.io/x'); supabase.storage.from('bucket-falso'); supabase.channel('canal-falso'); if (role === 'papelfalso') {}";
const B = "@Entity('entidade_falsa')\\nexport class E {}";`);
    w(dir, 'scripts/modelos.py', 'class ModeloFalso(BaseModel):\n    pass\n');
    w(dir, 'src/__tests__/so-teste.test.ts', `process.env.SO_DO_TESTE_FRONT; fetch('https://host-de-teste.invalido.io/x'); isFeatureEnabled('flag-de-teste'); if (role === 'papelteste') {} it('x', () => {});`);
    w(dir, 'src/lib/vite.ts', 'export const dev = import.meta.env.DEV && import.meta.env.MODE;');
  });
  assert.ok(!read('rotas.json').rotas_http_backend.some((x) => x.caminho === '/rota-falsa'));
  assert.deepEqual(read('rotas.json').rotas_http_backend.map((x) => x.arquivo).sort(), ['backend/app.py', 'server/api.ts', 'server/api.ts']);
  assert.deepEqual(read('hooks.json').hooks.map((h) => h.arquivo), ['src/hooks/useContacts.ts']);
  const banco = read('banco.json');
  assert.deepEqual(banco.fonte, ['python-models', 'src/integrations/supabase/types.ts', 'supabase/migrations'], 'sem drizzle/typeorm inventados');
  for (const falsa of ['tabela_falsa', 'entidade_falsa', 'ModeloFalso']) assert.equal(banco.tabelas[falsa], undefined, falsa);
  assert.ok(!banco.buckets.some((b) => b.nome === 'bucket-falso'));
  const f = read('ferramentas.json');
  assert.deepEqual(f.feature_flags.flags, [{ flag: 'novo-inbox', arquivos: 1 }]);
  assert.deepEqual(f.integracoes.hosts_externos.map((h) => h.host), ['api.resend.com']);
  assert.deepEqual(f.integracoes.realtime, []);
  assert.deepEqual(f.permissoes.papeis_no_codigo, [{ papel: 'admin', ocorrencias: 2 }]);
  assert.deepEqual(f.env.usadas_no_front, ['VITE_ANON', 'VITE_SUPABASE_URL'], 'sem env de teste e sem embutidos do Vite (DEV/MODE)');
  assert.deepEqual(f.env.usadas_mas_nao_declaradas, ['VITE_ANON']);
  assert.ok(read('scripts.json').scripts.some((s) => s.arquivo === 'scripts/cenarios-ferramenta.mjs'), 'o script continua no inventário de scripts');
});

test('storage.from (também quebrado em duas linhas) é bucket, não tabela; role ARIA não é papel', (t) => {
  const read = isolatedFixture(t, (dir) => {
    w(dir, 'src/components/upload/Upload.tsx', `export const Upload = () => {
  supabase.storage.from('avatars').upload('a', f);
  supabase.storage
    .from('comprovantes')
    .upload('a', f);
  return <div role="alert"><span role='status' /><Gate role="gerente" /></div>;
};`);
  });
  const b = read('banco.json');
  assert.deepEqual(read('baseline.json').alertas.tabelas_usadas_sem_definicao, [], 'bucket não vira "tabela sem definição"');
  assert.equal(b.tabelas.comprovantes, undefined);
  assert.equal(b.buckets.find((x) => x.nome === 'comprovantes').usado_em, 1);
  assert.equal(b.buckets.find((x) => x.nome === 'avatars').usado_em, 1);
  assert.deepEqual(read('componentes.json').componentes.find((c) => c.arquivo === 'src/components/upload/Upload.tsx').tabelas, []);
  assert.deepEqual(read('ferramentas.json').permissoes.papeis_no_codigo.map((p) => p.papel), ['admin', 'gerente']);
});

test('workflows: secrets só de expressão real, comentário ignorado, `bun run <script>` e import inline contam como uso', (t) => {
  const read = isolatedFixture(t, (dir) => {
    w(dir, '.github/workflows/guards.yml', `name: Guards
on:
  push:
    branches: [main]
jobs:
  j:
    runs-on: ubuntu-latest
    steps:
      # \`\${{ secrets.COMENTADO }}\` aqui seria pior
      # - run: node scripts/comentado.mjs
      - run: bun run scripts/rls-audit.ts
      - run: node scripts/check-bundle-secrets.mjs --dist dist
      - run: |
          node --input-type=module -e "import { i } from './scripts/identidade.mjs';"
        env:
          T: \${{ secrets.REAL_TOKEN }}
`);
    for (const s of ['rls-audit.ts', 'check-bundle-secrets.mjs', 'identidade.mjs', 'comentado.mjs']) w(dir, `scripts/${s}`, '// Faz algo.\n');
  });
  const wf = read('ferramentas.json').workflows.find((x) => x.nome === 'Guards');
  assert.deepEqual(wf.secrets, ['REAL_TOKEN'], 'nem o nome do arquivo *-secrets.mjs nem o comentário viram secret');
  assert.deepEqual(wf.scripts_usados, ['scripts/check-bundle-secrets.mjs', 'scripts/identidade.mjs', 'scripts/rls-audit.ts']);
  const s = Object.fromEntries(read('scripts.json').scripts.map((x) => [x.arquivo, x.workflows]));
  assert.deepEqual(s['scripts/rls-audit.ts'], ['guards.yml']);
  assert.deepEqual(s['scripts/identidade.mjs'], ['guards.yml']);
  assert.deepEqual(s['scripts/comentado.mjs'], []);
  assert.ok(!read('ferramentas.json').env.secrets_em_workflows.includes('mjs'));
});

test('componentes: export default embrulhado em HOC (memo, withX) continua sendo componente com o nome real', (t) => {
  const read = isolatedFixture(t, (dir) => {
    w(dir, 'src/pages/dashboard/Painel.tsx', `import { memo } from 'react';\nfunction Painel() { return <div/>; }\nexport default memo(Painel);`);
    w(dir, 'src/pages/dashboard/Executivo.tsx', `function Executivo() { return <div/>; }\nexport default withModuleErrorBoundary(Executivo, 'dashboard');`);
    w(dir, 'src/pages/dashboard/Anonimo.tsx', `export default memo(() => <div/>);`);
    w(dir, 'src/hooks/useD.ts', `export default function useD(props) { return props; }`);
  });
  const by = Object.fromEntries(read('componentes.json').componentes.map((c) => [c.arquivo, c]));
  assert.equal(by['src/pages/dashboard/Painel.tsx'].export_default, 'Painel');
  assert.equal(by['src/pages/dashboard/Executivo.tsx'].export_default, 'Executivo');
  assert.equal(by['src/pages/dashboard/Anonimo.tsx'], undefined, 'sem nome exportado não entra como componente nomeado');
  assert.deepEqual(read('hooks.json').hooks.find((h) => h.arquivo === 'src/hooks/useD.ts').hooks_exportados, ['useD'], 'função default nomeada não captura o parâmetro');
});

test('testes: pasta tests-e2e/ na raiz é e2e, tem rótulo próprio e não aparece como órfã de produção', (t) => {
  const read = isolatedFixture(t, (dir) => {
    w(dir, 'tests-e2e/login.spec.ts', `import { f } from './fixtures';\ntest('x', async () => {});`);
    w(dir, 'tests-e2e/fixtures.ts', 'export const f = 1;');
    w(dir, 'src/pages/test-drive/TestDrive.tsx', 'export const TestDrive = () => <div/>;');
  });
  const tst = read('testes.json'); const tipo = Object.fromEntries(tst.arquivos.map((x) => [x.arquivo, x.tipo]));
  assert.equal(tipo['tests-e2e/login.spec.ts'], 'e2e');
  assert.equal(tipo['tests-e2e/fixtures.ts'], 'e2e');
  assert.equal(tst.por_tipo.e2e, 2);
  assert.ok(tst.onde_ficam.some((x) => x.padrao === 'tests-e2e/' && x.arquivos === 2));
  assert.ok(!read('grafo.json').orfaos.includes('tests-e2e/fixtures.ts'));
  assert.ok(read('componentes.json').componentes.some((c) => c.arquivo === 'src/pages/test-drive/TestDrive.tsx'), 'pasta test-* fora da raiz continua sendo aplicação');
});

test('convenções: alias presumido só é publicado se algum import o usa; tsconfig JSONC (comentário + vírgula final) é lido', (t) => {
  const read = isolatedFixture(t, () => {});
  assert.deepEqual(read('convencoes.json').alias_imports, { '(raiz)': { '@/': 'src/' } }, '`~/` nunca foi declarado nem usado');
  const dir = repoMinimo(t, {
    'tsconfig.json': '{\n  // gerado pelo tsc --init\n  "compilerOptions": {\n    /* alias */\n    "paths": { "#app/*": ["./src/app/*"], },\n  },\n}\n',
    'src/app/x.ts': 'export const x = 1;',
    'src/y.ts': `import { x } from '#app/x';\nexport const y = x;`,
  });
  assert.equal(rodar(dir, ['--quiet']).status, 0);
  assert.deepEqual(lerSaida(dir, 'grafo-arestas.json').arestas, { 'src/y.ts': ['src/app/x.ts'] });
  assert.deepEqual(lerSaida(dir, 'convencoes.json').alias_imports, { '(raiz)': { '#app/': 'src/app/' } });
  const semTsconfig = repoMinimo(t, { 'src/b.ts': `import { a } from '@/a';\nexport const b = a;` });
  assert.equal(rodar(semTsconfig, ['--quiet']).status, 0);
  assert.deepEqual(lerSaida(semTsconfig, 'convencoes.json').alias_imports, { '(raiz)': { '@/': 'src/' } }, 'presumido e usado: publicado');
});

test('CLI: argumento desconhecido, flag sem valor, raiz inexistente e --out na raiz saem com exit 2 sem escrever nada', (t) => {
  const dir = repoMinimo(t);
  const casos = [
    [['--quiet', '--outt', 'saida'], /argumento desconhecido: --outt/],
    [['--quiet', '--out'], /--out exige um valor/],
    [['--quiet', '--out', ''], /--out exige um valor/],
    [['--out', '--quiet'], /--out exige um valor/],
    [['--quiet', '--root'], /--root exige um valor/],
    [['--quiet', '--root', path.join(dir, 'nao-existe')], /não é um diretório/],
    [['--quiet', '--root', path.join(dir, 'package.json')], /não é um diretório/],
    [['--quiet', '--out', '.'], /não pode ser a raiz/],
  ];
  for (const [args, erro] of casos) {
    const p = rodar(dir, args);
    assert.equal(p.status, 2, args.join(' '));
    assert.match(p.stderr, erro, args.join(' '));
    assert.match(p.stderr, /Uso: node scripts\/ai-context\/gerar\.mjs/);
    assert.deepEqual(fs.readdirSync(dir).sort(), ['package.json', 'src'], `nada escrito: ${args.join(' ')}`);
  }
  const ajuda = rodar(dir, ['--help']);
  assert.equal(ajuda.status, 0); assert.match(ajuda.stdout, /^Uso: /);
  const fora = path.join(dir, '..', `${path.basename(dir)}-fora`);
  t.after(() => fs.rmSync(fora, { recursive: true, force: true }));
  assert.equal(rodar(dir, ['--quiet', '--out', fora]).status, 0, '--out absoluto fora do repo');
  assert.deepEqual(fs.readdirSync(dir).sort(), ['package.json', 'src'], 'saída fora do repo não suja o repo');
  assert.equal(rodar(dir, ['--quiet', '--out', 'a/b/c']).status, 0, '--out aninhado inexistente é criado');
  const m = lerSaida(dir, 'manifest.json', 'a/b/c');
  assert.deepEqual(Object.keys(m.arquivos).sort(), fs.readdirSync(path.join(dir, 'a/b/c')).filter((f) => f !== 'manifest.json').sort(), 'manifest lista exatamente o que foi escrito');
  for (const [nome, hash] of Object.entries(m.arquivos)) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, 'a/b/c', nome))).digest('hex').slice(0, 16), hash, nome);
});

test('config inválida fica registrada em erros (não some em silêncio); arquivo acima de maxFileMB entra no alerta', (t) => {
  const dir = repoMinimo(t, { 'ai-context.config.json': '{ "out": ' });
  const p = rodar(dir, []);
  assert.equal(p.status, 0, 'continua gerando com os padrões');
  assert.match(p.stdout, /ai-context\.config\.json inválido/);
  const erros = lerSaida(dir, 'manifest.json').erros;
  assert.equal(erros.length, 1); assert.equal(erros[0].secao, 'config');
  assert.match(fs.readFileSync(path.join(dir, 'inventario/ia/INDEX.md'), 'utf8'), /1 seção\(ões\) falharam/);
  for (const invalido of ['null', '[]', '"texto"']) { w(dir, 'ai-context.config.json', invalido); assert.equal(rodar(dir, ['--quiet']).status, 0, invalido); assert.equal(lerSaida(dir, 'manifest.json').erros[0].secao, 'config', invalido); }
  const grande = repoMinimo(t, { 'ai-context.config.json': JSON.stringify({ maxFileMB: 0.001 }), 'src/grande.ts': `export const g = '${'x'.repeat(5000)}';` });
  assert.equal(rodar(grande, ['--quiet']).status, 0);
  assert.deepEqual(lerSaida(grande, 'baseline.json').alertas.arquivos_nao_lidos_por_tamanho, ['src/grande.ts']);
  assert.deepEqual(lerSaida(grande, 'manifest.json').erros, []);
});

test('determinismo: mesma saída em qualquer locale e em qualquer dia (janelas do git contam da data do HEAD)', (t) => {
  const dir = repoMinimo(t);
  for (const nome of ['aa', 'z', 'Ab', 'ab', 'B']) w(dir, `src/lib/${nome}.ts`, `export const v_${nome} = 1;`);
  // HEAD de 400 dias atrás e um commit 3 dias antes dele: com a janela presa ao relógio nada "mudou em 7 dias".
  const commit = (dias, msg) => { const d = new Date(Date.now() - dias * 86400e3).toISOString(); execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', msg], { cwd: dir, env: { ...process.env, GIT_AUTHOR_DATE: d, GIT_COMMITTER_DATE: d } }); };
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['add', 'package.json'], { cwd: dir }); commit(500, 'feat: fora da janela de 90 dias');
  execFileSync('git', ['add', 'src/a.ts'], { cwd: dir }); commit(403, 'feat: três dias antes do HEAD');
  execFileSync('git', ['add', '-A'], { cwd: dir }); commit(400, 'feat: HEAD antigo');
  assert.equal(rodar(dir, ['--quiet'], { LC_ALL: 'C', LANG: 'C' }).status, 0);
  const g = lerSaida(dir, 'baseline.json').git;
  assert.equal(g.arquivos_mudados_7d, 6, 'src/a.ts + 5 de src/lib, contados a partir da data do HEAD');
  assert.deepEqual(g.arquivos_mais_mudados_90d.map((x) => x.arquivo).sort(), ['src/a.ts', 'src/lib/Ab.ts', 'src/lib/B.ts', 'src/lib/aa.ts', 'src/lib/ab.ts', 'src/lib/z.ts'], 'package.json (100 dias antes do HEAD) fica fora');
  const emC = lerSaida(dir, 'manifest.json').arquivos;
  assert.deepEqual(lerSaida(dir, 'logica.json').arquivos.map((x) => path.basename(x.arquivo)), ['aa.ts', 'ab.ts', 'Ab.ts', 'B.ts', 'z.ts']);
  const sonda = spawnSync(process.execPath, ['-e', 'console.log(new Intl.Collator().resolvedOptions().locale)'], { encoding: 'utf8', env: { ...process.env, LC_ALL: 'da_DK.UTF-8', LANG: 'da_DK.UTF-8' } });
  if (!/^da/.test(sonda.stdout)) { t.diagnostic('Node sem ICU para da-DK: comparação entre locales pulada'); return; }
  assert.equal(rodar(dir, ['--quiet'], { LC_ALL: 'da_DK.UTF-8', LANG: 'da_DK.UTF-8' }).status, 0);
  assert.deepEqual(lerSaida(dir, 'manifest.json').arquivos, emC, 'bytes idênticos em LC_ALL=C e LC_ALL=da_DK.UTF-8 ("aa" depois de "z" em dinamarquês)');
});

test('alerta de segredos: credencial fixa sem prefixo conhecido é apontada por arquivo:linha, sem o valor; chave de cache e chave pública não', (t) => {
  // Valor montado em runtime para este arquivo de teste não casar o próprio detector no repo real.
  const valor = ['5f3a9c1e', '7b2d4e6f', '8a0b1c2d', '3e4f5a6b', '7c8d9e0f'].join('');
  const read = isolatedFixture(t, (dir) => {
    w(dir, 'supabase/functions/send-email/chave.ts', `// helper\nconst ACCESS_KEY = "${valor}";\nexport const STORAGE_KEY = 'app-dashboard-layout-settings-persisted-v2';\n`);
    w(dir, 'src/lib/cache.ts', `export const CACHE_KEY = 'promo-supply-dashboard-layout-settings';\nexport const mockApiToken = "${valor}";\nconst vapidPublicKey = '${valor}';\n`);
  });
  const baseline = read('baseline.json');
  assert.deepEqual(baseline.alertas.possiveis_segredos_no_codigo, ['supabase/functions/send-email/chave.ts:2']);
  assert.ok(!JSON.stringify(baseline).includes(valor), 'o valor nunca entra na saída');
});
