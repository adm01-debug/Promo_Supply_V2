#!/usr/bin/env node
/**
 * Inventario das rotas do front -> inventario/estado/rotas.json (fonte de consulta dos agentes).
 *
 * Le o codigo, nao documentacao:
 *  - URLs: src/routes/AppRoutes.tsx (path, pagina, ProtectedRoute/requiredRole, Navigate), com as
 *    rotas aninhadas herdando protecao e papeis da rota-pai (o layout <ProtectedRoute><Shell/>).
 *  - Para cada URL: segue os imports a partir do arquivo da pagina (mesma pasta, src/hooks/,
 *    src/services/, src/lib/, src/features/) e lista hooks, edge functions invocadas, RPCs,
 *    tabelas (.from e /rest/v1) e buckets de storage (storage.from).
 *  - `problemas`: URL sem arquivo e import local que nao resolve.
 *
 * Diferenca em relacao ao Zapp_Web_V2 (de onde este script veio): aqui o front e react-router puro,
 * sem o ViewRouter/lazyViews/navigation.service do Zapp, entao nao existe a parte de telas `?view=`
 * nem o cruzamento com o menu.
 *
 * Uso:
 *   node scripts/inventario/gerar-rotas.mjs           grava inventario/estado/rotas.json
 *   node scripts/inventario/gerar-rotas.mjs --check   exit 1 se o arquivo commitado esta desatualizado
 * Saida deterministica (sem data): o mesmo codigo gera o mesmo arquivo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ_PADRAO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SAIDA_REL = 'inventario/estado/rotas.json';
const EXTENSOES = ['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts'];

const ler = (raiz, rel) => fs.readFileSync(path.join(raiz, rel), 'utf8');
const rel = (raiz, abs) => path.relative(raiz, abs).split(path.sep).join('/');
const unico = (lista) => [...new Set(lista)].sort();

/** Resolve um especificador de import para um arquivo do repo (ou null se externo/inexistente). */
export function resolverImport(raiz, deArquivoAbs, especificador) {
  let base;
  if (especificador.startsWith('@/')) base = path.join(raiz, 'src', especificador.slice(2));
  else if (especificador.startsWith('.')) base = path.resolve(path.dirname(deArquivoAbs), especificador);
  else return null;
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const ext of EXTENSOES) if (fs.existsSync(base + ext)) return base + ext;
  return undefined; // local, mas nao existe
}

/** Imports de um arquivo: [{ especificador, nomes[] }] (estaticos e import() dinamico). */
export function extrairImports(texto) {
  const out = [];
  for (const m of texto.matchAll(/import\s+(type\s+)?([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g)) {
    if (m[1]) continue;
    const nomes = [...m[2].matchAll(/\b([A-Za-z_$][\w$]*)\b(?!\s*as\b)/g)].map((x) => x[1])
      .filter((n) => !['type', 'as', 'default'].includes(n));
    out.push({ especificador: m[3], nomes });
  }
  for (const m of texto.matchAll(/(?:import|export)\s*(?:\*\s*from\s*)?['"]([^'"]+)['"]/g)) out.push({ especificador: m[1], nomes: [] });
  for (const m of texto.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) out.push({ especificador: m[1], nomes: [] });
  for (const m of texto.matchAll(/export\s+(?:\{[^}]*\}|\*)\s+from\s+['"]([^'"]+)['"]/g)) out.push({ especificador: m[1], nomes: [] });
  return out;
}

/**
 * Mapa nome -> valor dos `const NOME = 'literal'` (ou `export const`) de nivel de modulo no texto.
 * So resolve o caso mais comum do repo: identificador passado direto pra `.from`/`fromTable`/
 * `storage.from`/`rpc`/`invoke` que e, no mesmo arquivo, uma constante de string (ex.:
 * `TALKX_MEDIA_BUCKET`, `ACL_ALERTS_TABLE`). Nao resolve parametro de funcao nem ternario.
 * Coluna zero sozinha nao basta (achado do Qodo na revisao desta correcao): um `const` dentro
 * de funcao tambem pode estar em coluna zero se o arquivo nao passou pelo Prettier (o repo nao
 * tem `prettier --check` no CI). Por isso conta profundidade de `{`/`}` linha a linha e so
 * aceita o `const` quando a profundidade, ANTES de processar a linha, e zero (nivel de modulo
 * de verdade). Contagem ingenua (nao ignora chave dentro de string/template) e de proposito:
 * na duvida, prefere nao resolver a resolver errado.
 */
function constantesDeString(texto) {
  const mapa = new Map();
  let profundidade = 0;
  for (const linha of texto.split('\n')) {
    if (profundidade === 0) {
      const m = linha.match(/^(?:export\s+)?const\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::\s*[^=]+)?=\s*['"`]([A-Za-z0-9_.-]+)['"`]\s*[;,]?\s*$/);
      if (m) mapa.set(m[1], m[2]);
    }
    for (const ch of linha) {
      if (ch === '{') profundidade++;
      else if (ch === '}') profundidade--;
    }
  }
  return mapa;
}

/**
 * Chamadas ao Supabase num texto: tabelas (`.from` do cliente, `fromTable` de
 * src/lib/supabaseHelpers.ts e `/rest/v1/<tabela>`), buckets (`storage.from`), RPCs (`.rpc`) e
 * edges (`functions.invoke`, `invokeEdge`, `/functions/v1/<edge>`).
 */
export function extrairChamadas(texto) {
  const pegar = (re) => [...texto.matchAll(re)].map((m) => m[1]);
  const consts = constantesDeString(texto);
  const tabelas = [];
  const buckets = [];
  for (const m of texto.matchAll(/(\bstorage\s*)?\.from\(\s*['"`]([A-Za-z0-9_-]+)['"`]/g)) (m[1] ? buckets : tabelas).push(m[2]);
  for (const m of texto.matchAll(/(\bstorage\s*)?\.from\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/g)) {
    if (consts.has(m[2])) (m[1] ? buckets : tabelas).push(consts.get(m[2]));
  }
  // `fromTable('x')` / `fromTable(CONST)` — atalho tipado de src/lib/supabaseHelpers.ts, sempre tabela.
  for (const m of texto.matchAll(/\bfromTable\(\s*['"`]([A-Za-z0-9_-]+)['"`]/g)) tabelas.push(m[1]);
  for (const m of texto.matchAll(/\bfromTable\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/g)) {
    if (consts.has(m[1])) tabelas.push(consts.get(m[1]));
  }
  tabelas.push(...pegar(/\/rest\/v1\/([A-Za-z0-9_]+)/g).filter((t) => t !== 'rpc'));
  return {
    tabelas,
    buckets,
    // `.rpc('x')` e o apelido `const rpc = supabase.rpc.bind(...)` + `rpc('x')`.
    rpcs: [...pegar(/(?:\.|\b)rpc\(\s*['"`]([A-Za-z0-9_]+)['"`]/g), ...pegar(/\/rest\/v1\/rpc\/([A-Za-z0-9_]+)/g)],
    // `functions.invoke` (inclusive quebrado em linha) e o atalho `invokeEdge<T>(...)` de
    // src/lib/invokeEdge.ts; `invoke('evolution-api/connect')` conta como a edge `evolution-api`.
    // `fetch(`${SUPABASE_URL}/functions/v1/get-call-recording`)` (chamada direta pela URL): so dentro
    // de string/template; a URL mostrada como texto em JSX (ex.: GmailWebhookMonitor) nao e chamada.
    edges: [
      ...pegar(/(?:functions\s*\.\s*invoke|\binvokeEdge)(?:<[^>()]*>)?\(\s*['"`]([A-Za-z0-9_-]+)(?:\/[^'"`]*)?['"`]/g),
      ...pegar(/['"`][^'"`\n]*\/functions\/v1\/([A-Za-z0-9_-]+)/g),
    ],
  };
}

const ehTeste = (p) => /(\.test\.|\.spec\.|__tests__|\.stories\.)/.test(p);

/**
 * Fecho de imports a partir do arquivo da pagina. Segue sem limite a pasta da pagina,
 * src/hooks/, src/services/, src/lib/ e src/features/ (helpers que chamam edge/RPC);
 * componentes de fora em src/components/ entram ate MAX_SALTOS_FEATURE saltos. Fica de fora
 * so o kit de UI (src/components/ui/) e teste. Import local que nao resolve vira problema.
 */
export const MAX_SALTOS_FEATURE = 2;
export function fechoDaTela(raiz, arquivoTelaAbs) {
  const pastaFeature = path.dirname(arquivoTelaAbs);
  const dentro = (abs, rel_) => abs.startsWith(path.join(raiz, rel_) + path.sep);
  const livre = (abs) => abs.startsWith(pastaFeature + path.sep) || ['src/hooks', 'src/services', 'src/lib', 'src/features'].some((d) => dentro(abs, d));
  const outraFeature = (abs) => dentro(abs, 'src/components') && !dentro(abs, 'src/components/ui');
  const saltosVistos = new Map(); // arquivo -> menor numero de saltos com que foi visitado
  const hooks = new Map();
  const quebrados = new Set();
  const chamadas = { tabelas: [], buckets: [], rpcs: [], edges: [] };
  const fila = [[arquivoTelaAbs, 0]];
  while (fila.length) {
    const [atual, saltos] = fila.shift();
    if (saltosVistos.has(atual) && saltosVistos.get(atual) <= saltos) continue;
    const primeiraVez = !saltosVistos.has(atual);
    saltosVistos.set(atual, saltos);
    const texto = fs.readFileSync(atual, 'utf8');
    if (primeiraVez) {
      const c = extrairChamadas(texto);
      for (const k of Object.keys(chamadas)) chamadas[k].push(...c[k]);
    }
    for (const imp of extrairImports(texto)) {
      const alvo = resolverImport(raiz, atual, imp.especificador);
      if (alvo === undefined && !/\.(css|scss|svg|png|jpe?g|webp|gif|json)(\?.*)?$|\?/.test(imp.especificador)) {
        quebrados.add(`${rel(raiz, atual)} -> ${imp.especificador}`);
      }
      if (!alvo || ehTeste(alvo)) continue;
      for (const nome of imp.nomes) if (/^use[A-Z]/.test(nome) && !hooks.has(nome)) hooks.set(nome, rel(raiz, alvo));
      if (livre(alvo)) fila.push([alvo, saltos]);
      else if (outraFeature(alvo) && saltos < MAX_SALTOS_FEATURE) fila.push([alvo, saltos + 1]);
    }
  }
  return {
    arquivos_lidos: saltosVistos.size,
    // 'en' fixo: sem locale, a ordem segue LC_ALL/LANG de quem roda (lt_LT, cs_CZ... ordenam diferente).
    hooks: [...hooks.entries()].map(([nome, arquivo]) => ({ nome, arquivo })).sort((a, b) => a.nome.localeCompare(b.nome, 'en')),
    buckets: unico(chamadas.buckets),
    edges: unico(chamadas.edges),
    rpcs: unico(chamadas.rpcs),
    tabelas: unico(chamadas.tabelas),
    imports_quebrados: [...quebrados].sort(),
  };
}

/**
 * Envoltorios de rota: nunca sao a "pagina" da URL. Alem dos do react-router, os deste repo
 * (ModuleErrorBoundary, RouteSkeleton, PageLoader, Shell) e os genericos de erro.
 */
const ENVOLTORIOS = [
  'Route', 'Routes', 'Navigate', 'Suspense', 'ProtectedRoute',
  'ErrorBoundary', 'GlobalErrorBoundary', 'ModuleErrorBoundary',
  'RouteSkeleton', 'PageLoader', 'Shell',
];

/** Papeis exigidos numa tag: requiredRole="admin", requiredRole={['a','b']} ou requiredRoles={[...]}. */
export function papeisDaTag(tag) {
  const m = tag.match(/requiredRoles?\s*=\s*(?:\{\s*\[([^\]]*)\]\s*\}|["']([^"']+)["']|\{\s*["']([^"']+)["']\s*\})/);
  if (!m) return null;
  if (m[1] !== undefined) return (m[1].match(/['"]([^'"]+)['"]/g) || []).map((s) => s.slice(1, -1));
  return [m[2] ?? m[3]];
}

/**
 * URLs do react-router em AppRoutes.tsx.
 *
 * Percorre as tags `<Route ...>` com uma pilha das rotas-pai, porque as rotas deste repo sao
 * aninhadas: o pai `<Route element={<ProtectedRoute><Shell /></ProtectedRoute>}>` nao tem `path` e
 * e quem protege os filhos. O fim de cada tag e achado contando `{`/`}` (o `element={...}` tem `>`
 * dentro), nao pelo primeiro `>`.
 */
export function lerUrls(raiz) {
  const arquivo = 'src/routes/AppRoutes.tsx';
  const texto = ler(raiz, arquivo);
  const abs = path.join(raiz, arquivo);
  const lazy = Object.fromEntries([...texto.matchAll(/const\s+(\w+)\s*=\s*lazy\w*\(\s*\(\)\s*=>\s*import\(\s*['"]([^'"]+)['"]\s*\)/g)]
    .map((m) => [m[1], m[2]]));
  const abertura = texto.search(/<Routes[\s>]/);
  const fechamento = texto.indexOf('</Routes>');
  if (abertura < 0 || fechamento < 0) throw new Error(`${arquivo}: nao achei o bloco <Routes>...</Routes>`);
  // Sem os comentarios JSX `{/* ... */}`: rota comentada nao existe (e um pai comentado nao pode
  // "proteger" as rotas seguintes). So essa forma; `/*` solto pode ser parte de `path="/app/*"`.
  const corpo = texto.slice(abertura, fechamento).replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '');
  const caminhoDaTag = (tag) => (tag.match(/path(?:=|:\s*)["']([^"']+)["']/) || [])[1];

  const urls = [];
  const pilha = []; // tags das rotas-pai ainda abertas
  let i = 0;
  while (i < corpo.length) {
    const aberto = corpo.indexOf('<Route', i);
    const fechado = corpo.indexOf('</Route>', i);
    if (aberto < 0 && fechado < 0) break;
    if (fechado >= 0 && (aberto < 0 || fechado < aberto)) {
      pilha.pop();
      i = fechado + '</Route>'.length;
      continue;
    }
    if (!/^<Route[\s/>]/.test(corpo.slice(aberto, aberto + 7))) { // <Routes ...>
      i = aberto + 6;
      continue;
    }
    let profundidade = 0;
    let fimTag = -1;
    for (let j = aberto; j < corpo.length; j += 1) {
      const ch = corpo[j];
      if (ch === '{') profundidade += 1;
      else if (ch === '}') profundidade -= 1;
      else if (ch === '>' && profundidade === 0) { fimTag = j; break; }
    }
    // Chave desbalanceada: parar aqui devolvia o inventario pela metade, sem erro nenhum.
    if (fimTag < 0) throw new Error(`${arquivo}: <Route> sem fim (chaves desbalanceadas?) em "${corpo.slice(aberto, aberto + 60).replace(/\s+/g, ' ')}"`);
    const tag = corpo.slice(aberto, fimTag + 1);
    const autoFechada = /\/\s*>$/.test(tag);
    const ancestrais = [...pilha];
    const caminhoNaTag = caminhoDaTag(tag);
    // Como no react-router: path sem "/" inicial e relativo ao da rota-pai (pai sem path nao muda nada).
    const caminho = caminhoNaTag && [...ancestrais.map(caminhoDaTag).filter(Boolean), caminhoNaTag]
      .reduce((base, p) => (p.startsWith('/') ? p : `${base.replace(/\/$/, '')}/${p}`));
    if (caminho) {
      const componente = [...tag.matchAll(/<([A-Z]\w*)/g)].map((m) => m[1])
        .find((n) => !ENVOLTORIOS.includes(n)) ?? null;
      const alvo = componente && lazy[componente] ? resolverImport(raiz, abs, lazy[componente]) : null;
      const papeis = papeisDaTag(tag) ?? ancestrais.map(papeisDaTag).filter(Boolean).pop() ?? [];
      urls.push({
        caminho,
        componente,
        arquivo: alvo ? rel(raiz, alvo) : null,
        protegida: [tag, ...ancestrais].some((x) => x.includes('<ProtectedRoute')),
        papeis,
        redireciona: (tag.match(/<Navigate\s+to=["']([^"']+)["']/) || [])[1] ?? null,
      });
    }
    if (!autoFechada) pilha.push(tag);
    i = fimTag + 1;
  }
  return urls.sort((a, b) => a.caminho.localeCompare(b.caminho, 'en'));
}

const FECHO_VAZIO = { arquivos_lidos: 0, hooks: [], buckets: [], edges: [], rpcs: [], tabelas: [], imports_quebrados: [] };

/** Monta o inventario inteiro a partir de uma raiz de repo. */
export function gerarRotas(raiz = RAIZ_PADRAO) {
  const cache = new Map(); // arquivo -> fecho (a mesma pagina serve mais de uma URL, ex. /cotacao e /cotacao/:id)
  const urls = lerUrls(raiz).map((u) => {
    if (!u.arquivo) return { ...u, ...FECHO_VAZIO };
    if (!cache.has(u.arquivo)) cache.set(u.arquivo, fechoDaTela(raiz, path.join(raiz, u.arquivo)));
    return { ...u, ...cache.get(u.arquivo) };
  });

  const hooks = {};
  for (const u of urls) for (const h of u.hooks) {
    hooks[h.nome] ??= { arquivo: h.arquivo, urls: [] };
    hooks[h.nome].urls.push(u.caminho);
  }

  const problemas = [
    ...urls.filter((u) => u.componente && !u.arquivo && !u.redireciona)
      .map((u) => ({ tipo: 'url_sem_arquivo', id: u.caminho, detalhe: `${u.componente} nao resolve em AppRoutes` })),
    ...urls.flatMap((u) => u.imports_quebrados.map((q) => ({ tipo: 'import_quebrado', id: u.caminho, detalhe: q }))),
  ];

  return {
    format_version: 1,
    fonte: 'scripts/inventario/gerar-rotas.mjs (le src/routes/AppRoutes.tsx e os imports de cada pagina)',
    resumo: {
      urls: urls.length,
      paginas: cache.size,
      protegidas: urls.filter((u) => u.protegida).length,
      hooks_distintos: Object.keys(hooks).length,
      problemas: problemas.length,
    },
    urls,
    hooks: Object.fromEntries(Object.keys(hooks).sort().map((k) => [k, { arquivo: hooks[k].arquivo, urls: unico(hooks[k].urls) }])),
    problemas,
  };
}

export const serializar = (inv) => JSON.stringify(inv, null, 2) + '\n';

function main(argv) {
  const saida = path.join(RAIZ_PADRAO, SAIDA_REL);
  const conteudo = serializar(gerarRotas(RAIZ_PADRAO));
  if (argv.includes('--check')) {
    const atual = fs.existsSync(saida) ? fs.readFileSync(saida, 'utf8') : '';
    if (atual !== conteudo) {
      console.error(`${SAIDA_REL} desatualizado: rode node scripts/inventario/gerar-rotas.mjs e commite o resultado.`);
      process.exit(1);
    }
    console.log(`${SAIDA_REL} em dia.`);
    return;
  }
  fs.mkdirSync(path.dirname(saida), { recursive: true });
  fs.writeFileSync(saida, conteudo);
  const r = JSON.parse(conteudo).resumo;
  console.log(`rotas.json: ${r.urls} URLs (${r.protegidas} protegidas), ${r.paginas} paginas, ${r.hooks_distintos} hooks, ${r.problemas} problemas.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
