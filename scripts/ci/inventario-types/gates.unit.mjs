// Cenarios dos dois gates do types-sync: typecheck-ratchet.mjs (Gate 1, com tsc de verdade num projeto de
// mentira) e check-remocoes-destrutivas.mjs (Gate 2). Os scripts sao copiados para dentro da arvore de teste
// porque resolvem a raiz do repo a partir do proprio caminho.
// Os casos de Gate 1 que COMPILAM de verdade precisam do pacote `typescript` (node_modules/typescript do repo
// ou INVENTARIO_TEST_TYPESCRIPT=<pasta>); sem ele ficam `skip`. Os que usam tsc de mentira, os de uso invalido
// e todos os de Gate 2 rodam so com node.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { REPO, FERRAMENTAS, acha, pastaNova, repoFalso, requer, rodar } from './lib.mjs';

const G1 = 'scripts/types-sync/typecheck-ratchet.mjs';
const G2 = 'scripts/types-sync/check-remocoes-destrutivas.mjs';
const TS_REAL = FERRAMENTAS.typescript;
const SEM_TS = requer(TS_REAL, 'pacote typescript ausente (instale as dependencias ou defina INVENTARIO_TEST_TYPESCRIPT)');
const SEM_BASH = requer(FERRAMENTAS.bash && acha('tee'), 'bash e/ou tee ausentes no PATH');
const ALVO = 'src/integrations/supabase/types.ts';

// ---- gerador de types.ts no formato do `supabase gen types typescript` ----
const BASE = {
  Tables: {
    pedidos: { id: 'string', total: 'number', status: 'Database["public"]["Enums"]["status_pedido"]' },
    itens: { id: 'string', pedido_id: 'string', nome: 'string' },
    sem_uso: { id: 'string' },
  },
  Views: { v_resumo: { total: 'number | null' } },
  Functions: { fn_total: { Args: '{ p_id: string }', Returns: 'number' }, fn_sem_uso: { Args: 'never', Returns: 'undefined' } },
  Enums: { status_pedido: ['aberto', 'fechado', 'cancelado'], enum_sem_uso: ['a', 'b'] },
  CompositeTypes: {},
};
const clone = (o) => JSON.parse(JSON.stringify(o));
function gerarTypes(esquema, { cabecalho = '', extraSchema = '' } = {}) {
  const linhasDe = (cols, n) => Object.entries(cols).map(([c, t]) => `${' '.repeat(n)}${c}: ${t}`).join('\n');
  const tabela = (nome, cols) => `      ${nome}: {\n        Row: {\n${linhasDe(cols, 10)}\n        }\n        Insert: {\n${linhasDe(cols, 10)}\n        }\n        Update: {\n${linhasDe(Object.fromEntries(Object.entries(cols).map(([c, t]) => [`${c}?`, t])), 10)}\n        }\n        Relationships: []\n      }`;
  const view = (nome, cols) => `      ${nome}: {\n        Row: {\n${linhasDe(cols, 10)}\n        }\n        Relationships: []\n      }`;
  const fn = (nome, f) => `      ${nome}: { Args: ${f.Args}; Returns: ${f.Returns} }`;
  const en = (nome, vals) => (vals.length > 2 ? `      ${nome}:\n${vals.map((v) => `        | "${v}"`).join('\n')}` : `      ${nome}: ${vals.map((v) => `"${v}"`).join(' | ')}`);
  const bloco = (titulo, itens) => `    ${titulo}: {\n${itens.length ? itens.join('\n') : '      [_ in never]: never'}\n    }`;
  return `${cabecalho}export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
${extraSchema}  public: {
${bloco('Tables', Object.entries(esquema.Tables).map(([n, c]) => tabela(n, c)))}
${bloco('Views', Object.entries(esquema.Views).map(([n, c]) => view(n, c)))}
${bloco('Functions', Object.entries(esquema.Functions).map(([n, f]) => fn(n, f)))}
${bloco('Enums', Object.entries(esquema.Enums).map(([n, v]) => en(n, v)))}
${bloco('CompositeTypes', Object.entries(esquema.CompositeTypes).map(([n, c]) => `      ${n}: {\n${linhasDe(c, 8)}\n      }`))}
  }
}

export type Tables<T extends keyof (Database["public"]["Tables"] & Database["public"]["Views"])> =
  (Database["public"]["Tables"] & Database["public"]["Views"])[T] extends { Row: infer R } ? R : never
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T]

export const Constants = {
  public: {
    Enums: {
${Object.entries(esquema.Enums).map(([n, v]) => `      ${n}: [${v.map((x) => `"${x}"`).join(', ')}],`).join('\n')}
    },
  },
} as const
`;
}
const mudar = (f) => { const e = clone(BASE); f(e); return e; };

const USO = `import type { Database, Tables, Enums } from './integrations/supabase/types';
type Pedido = Tables<'pedidos'>;
type Status = Enums<'status_pedido'>;
declare const sb: { from: (t: keyof Database['public']['Tables']) => unknown; rpc: (f: keyof Database['public']['Functions']) => unknown };
export const total = (p: Pedido): number => p.total;
export const cancelado: Status = 'cancelado';
export const item = (i: Database['public']['Tables']['itens']['Row']): string => i.nome;
export const consulta = () => sb.from('pedidos');
export const chamada = () => sb.rpc('fn_total');
`;
const TSCONFIG = JSON.stringify({ compilerOptions: { strict: true, noEmit: true, incremental: true, tsBuildInfoFile: 'node_modules/.cache/tsbuildinfo/app.tsbuildinfo', module: 'ESNext', moduleResolution: 'bundler', target: 'ES2020', skipLibCheck: true, types: [] }, include: ['src'] });

function projeto({ extras = {}, tscFalso = null, semTsc = false, original = 'ORIGINAL NO DISCO — tem de voltar\n' } = {}) {
  const raiz = repoFalso({ 'tsconfig.app.json': TSCONFIG, 'src/uso.ts': USO, [ALVO]: original, ...extras }, { scripts: [G1, G2], nome: 'gates' });
  if (!semTsc) {
    fs.mkdirSync(path.join(raiz, 'node_modules'), { recursive: true });
    if (tscFalso) {
      fs.mkdirSync(path.join(raiz, 'node_modules/typescript/bin'), { recursive: true });
      fs.writeFileSync(path.join(raiz, 'node_modules/typescript/bin/tsc'), tscFalso);
    } else if (TS_REAL) fs.symlinkSync(TS_REAL, path.join(raiz, 'node_modules/typescript'));
    else {
      // sem typescript real: os casos que seguem so validam o que acontece ANTES do tsc; se ele rodar, estoura
      fs.mkdirSync(path.join(raiz, 'node_modules/typescript/bin'), { recursive: true });
      fs.writeFileSync(path.join(raiz, 'node_modules/typescript/bin/tsc'), "console.error('SENTINELA: o tsc nao devia ter rodado neste caso'); process.exit(77);\n");
    }
  }
  return raiz;
}
const arq = (raiz, nome, conteudo) => { const p = path.join(raiz, nome); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, conteudo); return p; };
const gate1 = (raiz, antes, depois, env = {}) => rodar(process.execPath, [path.join(raiz, G1), antes, depois].filter((x) => x !== undefined), { cwd: '/', env: { ...process.env, ...env }, timeout: 120_000 });
const gate2 = (raiz, antes, depois) => rodar(process.execPath, [path.join(raiz, G2), antes, depois].filter((x) => x !== undefined), { cwd: '/' });
const lerAlvo = (raiz) => fs.readFileSync(path.join(raiz, ALVO), 'utf8');

// ============================ GATE 1 ============================
function caso1(nome, candidato, esperado, { extras, baseline, confere } = {}) {
  test(`gate1: ${nome} -> exit ${esperado}`, { skip: SEM_TS }, () => {
    const raiz = projeto({ extras });
    const a = arq(raiz, 'tmp/old.ts', baseline ?? gerarTypes(BASE));
    const d = arq(raiz, 'tmp/novo tipos.ts', candidato);
    const r = gate1(raiz, a, d);
    assert.equal(r.status, esperado, r.saida);
    assert.equal(lerAlvo(raiz), 'ORIGINAL NO DISCO — tem de voltar\n', 'types.ts do repo restaurado');
    if (esperado === 0) assert.match(r.stdout, /OK: TypeScript nao piorou \(\d+ -> \d+ erro\(s\)\)\./);
    if (esperado === 1) assert.match(r.stderr, /ERRO: o types\.ts candidato introduz \d+ erro\(s\) de TypeScript/);
    confere?.(r);
  });
}
caso1('arquivo identico', gerarTypes(BASE), 0, { confere: (r) => assert.match(r.stdout, /\(0 -> 0 erro/) });
caso1('so ordem das tabelas e comentario de cabecalho', gerarTypes(mudar((e) => { e.Tables = Object.fromEntries(Object.entries(e.Tables).reverse()); }), { cabecalho: '// gerado em outra data\n' }), 0);
caso1('so whitespace (linhas vazias a mais)', gerarTypes(BASE).replace(/\n/g, '\n\n'), 0);
caso1('tipos novos (tabela, coluna, enum, funcao)', gerarTypes(mudar((e) => { e.Tables.nova = { id: 'string' }; e.Tables.pedidos.obs = 'string | null'; e.Enums.novo = ['x']; e.Functions.fn_nova = { Args: 'never', Returns: 'undefined' }; })), 0);
caso1('tabela consumida removida', gerarTypes(mudar((e) => { delete e.Tables.pedidos; })), 1, { confere: (r) => assert.match(r.stderr, /src\/uso\.ts: error TS\d+/) });
caso1('tabela sem consumidor removida', gerarTypes(mudar((e) => { delete e.Tables.sem_uso; })), 0);
caso1('coluna consumida removida', gerarTypes(mudar((e) => { delete e.Tables.pedidos.total; })), 1);
caso1('coluna consumida renomeada', gerarTypes(mudar((e) => { delete e.Tables.itens.nome; e.Tables.itens.descricao = 'string'; })), 1);
caso1('coluna nao consumida removida', gerarTypes(mudar((e) => { delete e.Tables.itens.pedido_id; })), 0);
caso1('enum encolhido (valor usado some)', gerarTypes(mudar((e) => { e.Enums.status_pedido = ['aberto', 'fechado']; })), 1);
caso1('enum encolhido (valor nao usado some)', gerarTypes(mudar((e) => { e.Enums.status_pedido = ['aberto', 'cancelado']; })), 0);
caso1('funcao consumida removida', gerarTypes(mudar((e) => { delete e.Functions.fn_total; })), 1);
caso1('view/funcao/enum sem consumidor removidos', gerarTypes(mudar((e) => { delete e.Views.v_resumo; delete e.Functions.fn_sem_uso; delete e.Enums.enum_sem_uso; })), 0);
caso1('candidato vazio', '', 1);
caso1('candidato truncado no meio', gerarTypes(BASE).slice(0, 700), 1);
caso1('candidato que nao e types.ts (texto de erro)', 'Error: failed to connect\n', 1);
caso1('main ja tinha erro e o candidato nao acrescenta nenhum', gerarTypes(BASE), 0, { extras: { 'src/velho.ts': 'export const x: number = "erro antigo";\n' }, confere: (r) => assert.match(r.stdout, /\(1 -> 1 erro/) });
caso1('main ja tinha erro e o candidato acrescenta outro', gerarTypes(mudar((e) => { delete e.Tables.pedidos.total; })), 1, { extras: { 'src/velho.ts': 'export const x: number = "erro antigo";\n' } });
caso1('candidato CONSERTA erro que a main tinha', gerarTypes(BASE), 0, { baseline: gerarTypes(mudar((e) => { delete e.Tables.pedidos.total; })), confere: (r) => assert.match(r.stdout, /\(1 -> 0 erro/) });
caso1('troca um erro por outro (mesma contagem) reprova', gerarTypes(mudar((e) => { delete e.Tables.itens.nome; })), 1, { baseline: gerarTypes(mudar((e) => { delete e.Tables.pedidos.total; })) });
caso1('erro existente so muda de linha (linhas vazias no topo do types) nao conta como novo', `\n\n\n${gerarTypes(mudar((e) => { e.Tables.pedidos.total = 'string'; }))}`, 0, { baseline: gerarTypes(mudar((e) => { e.Tables.pedidos.total = 'string'; })) });

test('gate1: uso invalido / arquivo ausente / tsc ausente -> exit 2 e types.ts intocado', () => {
  const raiz = projeto();
  const a = arq(raiz, 'tmp/old.ts', gerarTypes(BASE));
  for (const args of [[undefined, undefined], [a, undefined], [a, path.join(raiz, 'nao-existe.ts')], [path.join(raiz, 'nao-existe.ts'), a]]) {
    const r = gate1(raiz, ...args);
    assert.equal(r.status, 2, r.saida);
    assert.equal(lerAlvo(raiz), 'ORIGINAL NO DISCO — tem de voltar\n');
  }
  const semTsc = projeto({ semTsc: true });
  const r = gate1(semTsc, arq(semTsc, 'o.ts', gerarTypes(BASE)), arq(semTsc, 'n.ts', gerarTypes(BASE)));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /typescript nao instalado/);
});

test('gate1: types.ts do repo ausente -> exit 2 (nao exit 1, que o workflow le como "piorou")', () => {
  const raiz = projeto();
  fs.rmSync(path.join(raiz, ALVO));
  const r = gate1(raiz, arq(raiz, 'o.ts', gerarTypes(BASE)), arq(raiz, 'n.ts', gerarTypes(BASE)));
  assert.equal(r.status, 2, r.saida);
  assert.ok(!fs.existsSync(path.join(raiz, ALVO)), 'nao pode deixar um types.ts que nao existia');
});

test('gate1: uso do README (baseline = o proprio types.ts do repo) nao trunca nem altera o arquivo', { skip: SEM_TS }, () => {
  const original = gerarTypes(BASE);
  const raiz = projeto({ original });
  const d = arq(raiz, 'tmp/novo.ts', gerarTypes(mudar((e) => { delete e.Tables.pedidos.total; })));
  const r = rodar(process.execPath, [G1, ALVO, d], { cwd: raiz });
  assert.equal(r.status, 1, r.saida);
  assert.equal(lerAlvo(raiz), original);
  const r2 = rodar(process.execPath, [G1, ALVO, ALVO], { cwd: raiz });
  assert.equal(r2.status, 0, r2.saida);
  assert.equal(lerAlvo(raiz), original);
});

test('gate1: tsconfig do projeto ausente -> exit 2 (nao pode aprovar "1 -> 1" sem ter checado nada)', () => {
  const raiz = projeto();
  const a = arq(raiz, 'tmp/old.ts', gerarTypes(BASE));
  const d = arq(raiz, 'tmp/novo.ts', gerarTypes(mudar((e) => { delete e.Tables.pedidos; })));
  const r = gate1(raiz, a, d, { TYPES_SYNC_TSCONFIG: 'tsconfig.nao-existe.json' });
  assert.equal(r.status, 2, r.saida);
  assert.equal(lerAlvo(raiz), 'ORIGINAL NO DISCO — tem de voltar\n');
});

// tsc de mentira: se comporta conforme o conteudo do types.ts que encontra no lugar
const tscFalso = (corpoCandidato, corpoBaseline = 'process.exit(0);') => `#!/usr/bin/env node
const fs = require('fs');
const alvo = fs.readFileSync(require('path').join(process.cwd(), '${ALVO}'), 'utf8');
if (alvo.includes('CANDIDATO')) { ${corpoCandidato} } else { ${corpoBaseline} }
`;
for (const [nome, corpo] of [
  ['morre sem saida (exit 134, como OOM)', 'process.exit(134);'],
  ['morre por sinal (SIGKILL)', "process.kill(process.pid, 'SIGKILL');"],
  ['sai 1 sem nenhuma linha de erro (instalacao quebrada)', "console.error('Error: Cannot find module ../lib/tsc.js'); process.exit(1);"],
  ['sai 3 (projeto invalido)', 'process.exit(3);'],
  ['estoura o buffer de saida', "const b = Buffer.alloc(1024 * 1024, 120); for (let i = 0; i < 70; i += 1) fs.writeSync(1, b); process.exit(0);"],
]) {
  test(`gate1: tsc que ${nome} no candidato -> exit 2, nunca "OK"`, () => {
    const raiz = projeto({ tscFalso: tscFalso(corpo) });
    const r = gate1(raiz, arq(raiz, 'o.ts', '// BASELINE\n'), arq(raiz, 'n.ts', '// CANDIDATO\n'));
    assert.equal(r.status, 2, r.saida.slice(0, 600));
    assert.ok(!/OK: TypeScript nao piorou/.test(r.stdout));
    assert.equal(lerAlvo(raiz), 'ORIGINAL NO DISCO — tem de voltar\n');
  });
}
test('gate1: tsc que morre tambem na medicao do baseline -> exit 2', () => {
  const raiz = projeto({ tscFalso: tscFalso('process.exit(0);', 'process.exit(134);') });
  const r = gate1(raiz, arq(raiz, 'o.ts', '// BASELINE\n'), arq(raiz, 'n.ts', '// CANDIDATO\n'));
  assert.equal(r.status, 2, r.saida);
});
test('gate1: tsc de mentira saudavel (erros iguais nas duas rodadas, exit 2 do tsc) -> exit 0; erro duplicado a mais -> exit 1', () => {
  const linha = "console.log(\"src/a.ts(1,1): error TS2322: Type 'string' is not assignable to type 'number'.\");";
  let raiz = projeto({ tscFalso: tscFalso(`${linha} process.exit(2);`, `${linha.replace('(1,1)', '(9,9)')} process.exit(2);`) });
  let r = gate1(raiz, arq(raiz, 'o.ts', '// BASELINE\n'), arq(raiz, 'n.ts', '// CANDIDATO\n'));
  assert.equal(r.status, 0, r.saida);
  raiz = projeto({ tscFalso: tscFalso(`${linha} ${linha.replace('(1,1)', '(5,5)')} process.exit(2);`, `${linha} process.exit(2);`) });
  r = gate1(raiz, arq(raiz, 'o.ts', '// BASELINE\n'), arq(raiz, 'n.ts', '// CANDIDATO\n'));
  assert.equal(r.status, 1, r.saida);
  assert.match(r.stderr, /introduz 1 erro\(s\) de TypeScript \(1 -> 2\)/);
});

for (const [nome, grupo] of [['SIGTERM so no script', false], ['SIGINT no grupo (Ctrl-C)', true], ['SIGHUP so no script', false]]) {
  test(`gate1: ${nome} durante o tsc -> nao declara OK, sai != 0 e devolve o types.ts`, async () => {
    const dorme = "const t = Date.now(); while (Date.now() - t < 1500) {} process.exit(0);";
    const raiz = projeto({ tscFalso: tscFalso(dorme, `fs.writeFileSync(require('path').join(process.cwd(), 'tsc-rodando'), ''); ${dorme}`) });
    const p = spawn(process.execPath, [path.join(raiz, G1), arq(raiz, 'o.ts', '// BASELINE\n'), arq(raiz, 'n.ts', '// CANDIDATO\n')], { cwd: '/', detached: grupo, stdio: ['ignore', 'pipe', 'pipe'] });
    let saida = '';
    p.stdout.on('data', (d) => { saida += d; });
    p.stderr.on('data', (d) => { saida += d; });
    const fim = new Promise((r) => p.on('close', (status, sig) => r({ status, sig })));
    for (let i = 0; i < 200 && !fs.existsSync(path.join(raiz, 'tsc-rodando')); i += 1) await new Promise((r) => setTimeout(r, 20));
    const sinal = nome.startsWith('SIGINT') ? 'SIGINT' : nome.split(' ')[0];
    if (grupo) process.kill(-p.pid, sinal); else p.kill(sinal);
    const { status, sig } = await fim;
    assert.equal(lerAlvo(raiz), 'ORIGINAL NO DISCO — tem de voltar\n');
    if (grupo) {
      // Ctrl-C mata o tsc junto: nao houve medicao, entao nao pode haver "OK" nem exit 0
      assert.ok(status !== 0 || sig, `status 0 depois de ${sinal}: ${saida}`);
      assert.ok(!/OK: TypeScript nao piorou/.test(saida), saida);
    } else {
      // sinal so no node: o spawnSync segura o processo ate o tsc acabar; a medicao termina de verdade
      assert.match(saida, /\[depois \(types\.ts candidato\)\] tsc: 0 erro/);
    }
  });
}

test('workflow/Gate 1 e 2: so exit 0 vira passed=true (exit 1 e 2 viram passed=false) com o `| tee` + pipefail do YAML', { skip: SEM_BASH }, () => {
  const yaml = fs.readFileSync(path.join(REPO, '.github/workflows/types-sync.yml'), 'utf8');
  assert.match(yaml, /if node scripts\/types-sync\/typecheck-ratchet\.mjs \/tmp\/types\.old\.ts \/tmp\/types\.new\.ts 2>&1 \| tee \/tmp\/tsc\.log; then/);
  assert.match(yaml, /if node scripts\/types-sync\/check-remocoes-destrutivas\.mjs \/tmp\/types\.old\.ts \/tmp\/types\.new\.ts 2>&1 \| tee \/tmp\/gate2\.log; then/);
  for (const [codigo, esperado] of [[0, 'true'], [1, 'false'], [2, 'false'], [134, 'false']]) {
    const r = rodar(FERRAMENTAS.bash, ['--noprofile', '--norc', '-euo', 'pipefail', '-c', `set -o pipefail\nif bash -c 'echo saida; exit ${codigo}' 2>&1 | tee /dev/null; then echo "passed=true"; else echo "passed=false"; fi`]);
    assert.equal(r.status, 0);
    assert.match(r.stdout, new RegExp(`passed=${esperado}`));
  }
});

// ============================ GATE 2 ============================
const CONSUMO = {
  'src/a.ts': "export const q = () => supabase.from('pedidos').select('*');\n",
  'src/b.tsx': 'type I = Tables<"itens">;\nconst r = await supabase.rpc(`fn_total`, {});\n',
  'src/c.ts': "type S = Database['public']['Enums']['status_pedido'];\ntype V = Database[\"public\"][\"Views\"][\"v_resumo\"];\n",
};
function caso2(nome, candidato, esperado, { extras = CONSUMO, baseline, confere } = {}) {
  test(`gate2: ${nome} -> exit ${esperado}`, () => {
    const raiz = projeto({ extras: { 'src/uso.ts': '', ...extras }, semTsc: true });
    const r = gate2(raiz, arq(raiz, 'tmp/old.ts', baseline ?? gerarTypes(BASE)), arq(raiz, 'tmp/novo tipos.ts', candidato));
    assert.equal(r.status, esperado, r.saida);
    assert.equal(lerAlvo(raiz), 'ORIGINAL NO DISCO — tem de voltar\n', 'gate 2 nao escreve em nada');
    confere?.(r);
  });
}
const sem = (f) => gerarTypes(mudar(f));
caso2('arquivo identico', gerarTypes(BASE), 0, { confere: (r) => assert.equal(r.stdout, 'OK: nenhum objeto removido (8 -> 8).\n') });
caso2('so ordem, whitespace e cabecalho', gerarTypes(mudar((e) => { e.Tables = Object.fromEntries(Object.entries(e.Tables).reverse()); }), { cabecalho: '// x\n' }).replace(/\n\n/g, '\n\n\n'), 0);
caso2('CRLF no candidato', gerarTypes(BASE).replace(/\n/g, '\r\n'), 0, { confere: (r) => assert.match(r.stdout, /8 -> 8/) });
caso2('tipos novos', sem((e) => { e.Tables.nova = { id: 'string' }; e.Enums.novo = ['x']; }), 0, { confere: (r) => assert.match(r.stdout, /8 -> 10/) });
caso2('tabela consumida por .from() removida', sem((e) => { delete e.Tables.pedidos; }), 1, { confere: (r) => { assert.match(r.stderr, /- Tables\/pedidos\n\s+src\/a\.ts:1: /); } });
caso2('tabela consumida por Tables<"x"> removida', sem((e) => { delete e.Tables.itens; }), 1, { confere: (r) => assert.match(r.stderr, /- Tables\/itens\n\s+src\/b\.tsx:1: /) });
caso2('tabela sem consumidor removida', sem((e) => { delete e.Tables.sem_uso; }), 0, { confere: (r) => assert.match(r.stdout, /Aviso: objeto\(s\) removido\(s\) sem consumidor em src\/ \(permitido\): Tables\/sem_uso\nOK: nenhuma remocao com call-site/) });
caso2('view consumida removida', sem((e) => { delete e.Views.v_resumo; }), 1, { confere: (r) => assert.match(r.stderr, /- Views\/v_resumo/) });
caso2('funcao consumida por .rpc() removida', sem((e) => { delete e.Functions.fn_total; }), 1, { confere: (r) => assert.match(r.stderr, /- Functions\/fn_total\n\s+src\/b\.tsx:2: /) });
caso2('enum consumido removido', sem((e) => { delete e.Enums.status_pedido; }), 1, { confere: (r) => assert.match(r.stderr, /- Enums\/status_pedido/) });
caso2('funcao/enum sem consumidor removidos', sem((e) => { delete e.Functions.fn_sem_uso; delete e.Enums.enum_sem_uso; }), 0);
caso2('coluna removida (nao e papel do gate 2: quem pega e o gate 1)', sem((e) => { delete e.Tables.pedidos.total; }), 0, { confere: (r) => assert.match(r.stdout, /nenhum objeto removido/) });
caso2('coluna renomeada', sem((e) => { delete e.Tables.itens.nome; e.Tables.itens.descricao = 'string'; }), 0);
caso2('enum encolhido', sem((e) => { e.Enums.status_pedido = ['aberto']; }), 0);
caso2('tabela renomeada com consumidor do nome antigo', sem((e) => { e.Tables.pedidos_v2 = e.Tables.pedidos; delete e.Tables.pedidos; }), 1);
caso2('consumida e nao consumida removidas juntas: bloqueia e lista as duas', sem((e) => { delete e.Tables.pedidos; delete e.Tables.sem_uso; }), 1, { confere: (r) => { assert.match(r.stdout, /Aviso: .*Tables\/sem_uso/); assert.match(r.stderr, /- Tables\/pedidos/); } });
caso2('candidato vazio', '', 2, { confere: (r) => assert.match(r.stderr, /nenhum objeto reconhecido/) });
caso2('candidato que nao e types.ts', 'Error: failed\n', 2);
caso2('candidato com outra indentacao (4 espacos)', gerarTypes(BASE).replace(/^( +)/gm, '$1$1'), 2);
caso2('baseline vazio', gerarTypes(BASE), 2, { baseline: '' });
caso2('candidato truncado depois da 1a tabela (pedidos fica, itens some)', gerarTypes(BASE).slice(0, gerarTypes(BASE).indexOf('      itens: {')), 1, { confere: (r) => assert.match(r.stderr, /- Tables\/itens/) });
caso2('nome que e prefixo de outro nao gera falso bloqueio', sem((e) => { delete e.Tables.itens; }), 0, { extras: { 'src/a.ts': "supabase.from('itens_arquivados');\ntype T = Tables<'itens_x'>;\n" } });
caso2('consumidor so no proprio types.ts, em node_modules ou em pasta oculta nao conta', sem((e) => { delete e.Tables.pedidos; }), 0, { extras: { 'src/node_modules/x/a.ts': "supabase.from('pedidos');\n", 'src/.cache/a.ts': "supabase.from('pedidos');\n", 'src/doc.md': "supabase.from('pedidos')\n" } });
caso2('consumidor so em teste dentro de src/ conta (conservador)', sem((e) => { delete e.Tables.pedidos; }), 1, { extras: { 'src/__tests__/a.test.ts': "supabase.from('pedidos');\n" } });
caso2('realtime numa linha: .on(..., { table: "x" })', sem((e) => { delete e.Tables.pedidos; }), 1, { extras: { 'src/rt.ts': "ch.on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, cb);\n" } });
caso2('realtime formatado em varias linhas (table: "x" na linha de baixo)', sem((e) => { delete e.Tables.pedidos; }), 1, { extras: { 'src/rt.ts': "ch.on(\n  'postgres_changes',\n  {\n    event: '*',\n    schema: 'public',\n    table: 'pedidos',\n  },\n  cb,\n);\n" } });
caso2('outro schema e o bloco Constants nao entram no inventario', gerarTypes(BASE), 0, { baseline: gerarTypes(BASE, { extraSchema: '  graphql_public: {\n    Tables: {\n      so_no_graphql: {\n      }\n    }\n  }\n' }), confere: (r) => assert.match(r.stdout, /8 -> 8/) });
caso2('mais de 5 call-sites: lista 5 e resume o resto', sem((e) => { delete e.Tables.pedidos; }), 1, { extras: { 'src/muitos.ts': "supabase.from('pedidos');\n".repeat(8) }, confere: (r) => assert.match(r.stderr, /\.\.\. e 3 outro\(s\) call-site\(s\)\./) });

test('gate2: uso invalido / arquivo ausente -> exit 2', () => {
  const raiz = projeto({ semTsc: true });
  const a = arq(raiz, 'o.ts', gerarTypes(BASE));
  assert.equal(gate2(raiz).status, 2);
  assert.equal(gate2(raiz, a).status, 2);
  const r = gate2(raiz, a, path.join(raiz, 'nao-existe.ts'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /^ERRO: /);
});

test('gate2 no repo REAL (so leitura): types.ts atual x ele mesmo = 0; sem tabela consumida = 1 com call-sites; sem tabela nao consumida = 0', (t) => {
  const real = fs.readFileSync(path.join(REPO, ALVO), 'utf8');
  const dir = pastaNova('real');
  const cmd = (a, d) => rodar(process.execPath, [path.join(REPO, G2), a, d], { cwd: REPO });
  const r = cmd(path.join(REPO, ALVO), path.join(REPO, ALVO));
  assert.equal(r.status, 0, r.saida);
  assert.match(r.stdout, /^OK: nenhum objeto removido \((\d+) -> \1\)\.\n$/);
  const semTabela = (nome) => {
    const linhas = real.split('\n');
    const ini = linhas.findIndex((l) => l === `      ${nome}: {`);
    assert.ok(ini > 0, nome);
    const fim = linhas.findIndex((l, i) => i > ini && l === '      }');
    const p = path.join(dir, `sem-${nome}.ts`);
    fs.writeFileSync(p, [...linhas.slice(0, ini), ...linhas.slice(fim + 1)].join('\n'));
    return p;
  };
  const consumida = real.match(/^ {6}(solicitacoes|pedidos|fornecedores|notifications): \{$/m)?.[1];
  if (!consumida) { t.skip('nenhuma tabela de referencia (solicitacoes/pedidos/fornecedores/notifications) no types.ts atual'); return; }
  const rm = cmd(path.join(REPO, ALVO), semTabela(consumida));
  assert.equal(rm.status, 1, rm.saida);
  assert.match(rm.stderr, new RegExp(`- Tables/${consumida}\\n\\s+src/`));
});
