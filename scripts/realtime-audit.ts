/**
 * OPS-02: Auditoria de canais Realtime — detecta subscribe sem unsubscribe.
 *
 * Regras:
 *   - Todo `.channel(...)` deve ter `removeChannel`, `removeAllChannels` ou `.unsubscribe`
 *     no cleanup do mesmo arquivo.
 *   - Canal aberto dentro de `useEffect` tem de ser fechado no cleanup do próprio efeito
 *     (OPS-02b): fechar num `onClick` empata os totais do arquivo mas vaza o canal quando a
 *     tela desmonta.
 *   - Comentário e conteúdo de string não contam (nem como abertura, nem como cleanup).
 *   - Falha o build se sobrar canal órfão.
 *
 * Uso:
 *   bun run scripts/realtime-audit.ts [--dir <raiz>]... [--json]
 *   (roda igual com `node scripts/realtime-audit.ts`; sem dependência de npm)
 *
 * A abertura é contada por `.channel(` com QUALQUER receptor. A versão anterior exigia
 * `supabase.channel(` na mesma linha e por isso só enxergava 2 dos 8 canais do `src/` — os outros
 * 6 usam a cadeia quebrada em linhas (`supabase\n  .channel('x')`) e nunca foram auditados.
 *
 * Exit: 0 = nenhum órfão · 1 = canal sem cleanup · 2 = uso/IO (inclui "nenhum arquivo lido").
 */
import { lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export interface Orfao {
  file: string;
  opens: number;
  closes: number;
  count: number;
}

const IGNORAR_DIR = new Set(["node_modules", "dist", "coverage", ".git"]);

/**
 * Troca comentários e o CONTEÚDO de strings e de regex literais por espaços, preservando quebras de
 * linha e o código dentro de `${...}` em template literal. Não é um parser de TS: basta para que
 * `// supabase.channel(` ou "removeChannel(" dentro de aspas não entrem na conta. String e regex
 * nunca atravessam a linha, então um apóstrofo solto em texto JSX estraga no máximo aquela linha.
 */
const ANTES_DE_REGEX = new Set(["(", ",", "=", ":", "[", "!", "&", "|", "?", "{", ";", "+", "-", "*", "%", "~", "^"]);
const PALAVRA_ANTES_DE_REGEX = new Set(["return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "case", "do", "else", "yield", "await"]);

export function somenteCodigo(src: string): string {
  let out = "";
  let i = 0;
  const n = src.length;
  // Pilha de contexto: "code" (com profundidade de chaves, para achar o fim de `${...}`) ou "tpl".
  const pilha: { tipo: "code" | "tpl"; chaves: number }[] = [{ tipo: "code", chaves: 0 }];
  const branco = (c: string) => (c === "\n" || c === "\r" ? c : " ");
  // Último caractere significativo de código (e o anterior a ele) — decide se `/` abre regex ou divide.
  let ultimo = "";
  let penultimo = "";
  let palavra = "";
  const podeAbrirRegex = () =>
    ultimo === "" ||
    ANTES_DE_REGEX.has(ultimo) ||
    (ultimo === ">" && penultimo === "=") ||
    (palavra !== "" && PALAVRA_ANTES_DE_REGEX.has(palavra));

  while (i < n) {
    const topo = pilha[pilha.length - 1];
    const c = src[i];
    const d = src[i + 1];

    if (topo.tipo === "tpl") {
      if (c === "\\") {
        out += "  ";
        i += 2;
      } else if (c === "`") {
        pilha.pop();
        out += c;
        i++;
      } else if (c === "$" && d === "{") {
        pilha.push({ tipo: "code", chaves: 0 });
        out += "${";
        i += 2;
      } else {
        out += branco(c);
        i++;
      }
      continue;
    }

    if (c === "/" && d === "/") {
      while (i < n && src[i] !== "\n") {
        out += " ";
        i++;
      }
    } else if (c === "/" && d === "*") {
      const fim = src.indexOf("*/", i + 2);
      const ate = fim === -1 ? n : fim + 2;
      for (; i < ate; i++) out += branco(src[i]);
    } else if (c === "/" && podeAbrirRegex()) {
      // Regex literal: `/"/g` não pode abrir string. Termina no `/` fora de classe `[...]`.
      out += c;
      i++;
      let classe = false;
      while (i < n && src[i] !== "\n" && (classe || src[i] !== "/")) {
        if (src[i] === "\\") {
          out += "  ";
          i += 2;
          continue;
        }
        if (src[i] === "[") classe = true;
        else if (src[i] === "]") classe = false;
        out += " ";
        i++;
      }
      if (src[i] === "/") {
        out += "/";
        i++;
      }
      penultimo = ultimo;
      ultimo = "/";
      palavra = "x"; // depois do regex vem flag/ponto, nunca outro regex
    } else if (c === '"' || c === "'") {
      out += c;
      i++;
      while (i < n && src[i] !== c && src[i] !== "\n") {
        if (src[i] === "\\") {
          out += "  ";
          i += 2;
        } else {
          out += " ";
          i++;
        }
      }
      if (src[i] === c) {
        out += c;
        i++;
      }
      penultimo = ultimo;
      ultimo = c;
      palavra = "";
    } else if (c === "`") {
      pilha.push({ tipo: "tpl", chaves: 0 });
      out += c;
      i++;
      penultimo = ultimo;
      ultimo = c;
      palavra = "";
    } else if (c === "{") {
      topo.chaves++;
      out += c;
      i++;
      penultimo = ultimo;
      ultimo = c;
      palavra = "";
    } else if (c === "}") {
      if (topo.chaves === 0 && pilha.length > 1) pilha.pop(); // fim de `${...}`: volta ao template
      else if (topo.chaves > 0) topo.chaves--;
      out += c;
      i++;
      penultimo = ultimo;
      ultimo = c;
      palavra = "";
    } else {
      if (/[A-Za-z0-9_$]/.test(c)) {
        palavra = /[A-Za-z0-9_$]/.test(src[i - 1] ?? "") ? palavra + c : c;
        penultimo = ultimo;
        ultimo = c;
      } else if (!/\s/.test(c)) {
        penultimo = ultimo;
        ultimo = c;
        palavra = "";
      }
      out += c;
      i++;
    }
  }
  return out;
}

export function contarCanais(src: string): { opens: number; closes: number } {
  const codigo = somenteCodigo(src);
  const conta = (re: RegExp) => (codigo.match(re) ?? []).length;
  // `abrirCanalPostgres(`/`abrirCanalCompartilhado(` (src/lib/realtime.ts) tambem abrem canal.
  // O lookbehind descarta a declaracao das proprias funcoes, que nao e uma abertura.
  const opens =
    conta(/\.channel\s*\(/g) + conta(/(?<![\w.])(?<!function )abrirCanal[A-Za-z]*\s*\(/g);
  // `removeAllChannels(` fecha tudo que o arquivo abriu.
  if (conta(/\bremoveAllChannels\s*\(/g) > 0) return { opens, closes: opens };
  // `\bremoveChannel(` casa tanto `supabase.removeChannel(` quanto `removeChannel(` desestruturado, uma vez só.
  const closes = conta(/\bremoveChannel\s*\(/g) + conta(/\.unsubscribe\s*\(/g);
  return { opens, closes };
}

export function auditarArquivo(file: string, src: string): Orfao | null {
  const { opens, closes } = contarCanais(src);
  if (opens === 0 || closes >= opens) return null;
  return { file, opens, closes, count: opens - closes };
}

const ABRE_CANAL = [/\.channel\s*\(/g, /(?<![\w.])(?<!function )abrirCanal[A-Za-z]*\s*\(/g];
const FECHA_CANAL = /\bremoveChannel\s*\(|\.unsubscribe\s*\(|\bremoveAllChannels\s*\(/;

const abreCanal = (trecho: string) => ABRE_CANAL.some((re) => new RegExp(re.source).test(trecho));

/**
 * A partir de `idx` (índice do `(` de abertura), devolve o conteúdo até o `)` que o fecha,
 * contando também `{` e `[`. Devolve `null` se o parêntese nunca fecha (arquivo truncado).
 */
function extrairArgumentos(codigo: string, idx: number): string | null {
  let profundidade = 0;
  for (let i = idx; i < codigo.length; i++) {
    const c = codigo[i];
    if (c === "(" || c === "{" || c === "[") profundidade++;
    else if (c === ")" || c === "}" || c === "]") {
      profundidade--;
      if (profundidade === 0) return codigo.slice(idx + 1, i);
    }
  }
  return null;
}

/**
 * Trecho de cleanup de um corpo de `useEffect`: tudo a partir do primeiro `return` que
 * devolve uma função (`return () =>`, `return function`). Deliberadamente generoso — o
 * guard só deve acusar quem claramente não fecha; falso positivo aqui vira ruído e o
 * time passa a ignorar o guard.
 */
export function trechoDeCleanup(corpo: string): string | null {
  for (const m of corpo.matchAll(/\breturn\b/g)) {
    const depois = corpo.slice(m.index + 6, m.index + 66);
    if (/^[\s(]*(?:\(|function\b|async\b)/.test(depois) && /=>|function\b/.test(depois)) {
      return corpo.slice(m.index);
    }
  }
  return null;
}

/**
 * OPS-02b: canal aberto dentro de `useEffect` precisa ser fechado no cleanup do próprio
 * efeito. `contarCanais` só compara totais por arquivo, então um componente que abre no
 * `useEffect` e só fecha num `onClick` passava no guard e mesmo assim vazava o canal ao
 * desmontar a tela — exatamente a classe de bug que derrubou a aplicação em produção.
 */
export function efeitosSemCleanup(src: string): number {
  const codigo = somenteCodigo(src);
  let faltando = 0;
  for (const m of codigo.matchAll(/\buseEffect\s*\(/g)) {
    const corpo = extrairArgumentos(codigo, m.index + m[0].length - 1);
    if (corpo === null || !abreCanal(corpo)) continue;
    const cleanup = trechoDeCleanup(corpo);
    if (cleanup === null || !FECHA_CANAL.test(cleanup)) faltando++;
  }
  return faltando;
}

/** Percorre `dir` (sem seguir symlink) e devolve os `.ts`/`.tsx`, em ordem estável. */
export function listarFontes(dir: string): string[] {
  const achados: string[] = [];
  const andar = (d: string) => {
    for (const entry of readdirSync(d).sort()) {
      const p = join(d, entry);
      const st = lstatSync(p);
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) {
        if (!IGNORAR_DIR.has(entry)) andar(p);
      } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".d.ts")) achados.push(p);
    }
  };
  andar(dir);
  return achados;
}

interface Opcoes {
  dirs: string[];
  json: boolean;
  ajuda: boolean;
}

export function lerArgs(argv: string[]): Opcoes {
  const o: Opcoes = { dirs: [], json: false, ajuda: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") o.json = true;
    else if (a === "--help" || a === "-h") o.ajuda = true;
    else if (a === "--dir") {
      const v = argv[++i];
      if (!v) throw new Error("--dir exige um caminho");
      o.dirs.push(v);
    } else throw new Error(`argumento desconhecido: ${a}`);
  }
  if (o.dirs.length === 0) o.dirs.push("src");
  return o;
}

const AJUDA = `Uso: bun run scripts/realtime-audit.ts [--dir <raiz>]... [--json]
  --dir <raiz>  pasta a auditar (pode repetir; padrão: src)
  --json        imprime o resultado como um único documento JSON no stdout`;

export function principal(argv: string[]): number {
  let o: Opcoes;
  try {
    o = lerArgs(argv);
  } catch (e) {
    console.error(`❌ ${(e as Error).message}\n${AJUDA}`);
    return 2;
  }
  if (o.ajuda) {
    console.log(AJUDA);
    return 0;
  }

  const orphaned: Orfao[] = [];
  const missingCleanup: { file: string; effects: number }[] = [];
  let arquivos = 0;
  let canais = 0;
  try {
    for (const dir of o.dirs) {
      for (const file of listarFontes(dir)) {
        arquivos++;
        const src = readFileSync(file, "utf8");
        canais += contarCanais(src).opens;
        const orfao = auditarArquivo(file, src);
        if (orfao) orphaned.push(orfao);
        const efeitos = efeitosSemCleanup(src);
        if (efeitos > 0) missingCleanup.push({ file, effects: efeitos });
      }
    }
  } catch (e) {
    console.error(`❌ Realtime audit não conseguiu ler: ${(e as Error).message}`);
    return 2;
  }
  if (arquivos === 0) {
    // Fail-closed: zero arquivos lidos não prova nada (pasta errada ou vazia).
    console.error(`❌ Realtime audit: nenhum .ts/.tsx em ${o.dirs.join(", ")} — nada foi auditado.`);
    return 2;
  }

  if (o.json)
    console.log(
      JSON.stringify(
        { files: arquivos, channels: canais, orphaned, total: orphaned.length, missingCleanup, totalMissingCleanup: missingCleanup.length },
        null,
        2,
      ),
    );

  if (orphaned.length === 0 && missingCleanup.length === 0) {
    if (!o.json) console.log(`✅ Nenhum canal Realtime órfão detectado (${canais} canal(is) em ${arquivos} arquivo(s)).`);
    return 0;
  }

  if (orphaned.length > 0) {
    console.error("❌ Canais Realtime sem cleanup:");
    for (const x of orphaned) console.error(`  - ${x.file} (${x.count} canal(is) sem removeChannel)`);
  }
  if (missingCleanup.length > 0) {
    console.error("❌ useEffect abre canal e não fecha no cleanup (vaza ao desmontar a tela):");
    for (const x of missingCleanup) console.error(`  - ${x.file} (${x.effects} efeito(s) sem removeChannel no return)`);
  }
  return 1;
}

const ehPrincipal = (() => {
  try {
    return process.argv[1] !== undefined && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
})();

if (ehPrincipal) process.exit(principal(process.argv.slice(2)));
