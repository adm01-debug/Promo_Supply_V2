/**
 * TEST-01 — Auditoria de RLS do schema `public`.
 *
 * Reprova (exit 1) quando encontra:
 *   - política PERMISSIVE com `USING (true)` / `WITH CHECK (true)` aplicada a papel não privilegiado;
 *   - tabela de `public` com RLS desligado.
 *
 * Uso:
 *   SUPABASE_DB_URL=... bun run scripts/rls-audit.ts [--strict] [--json] [--allowlist <arquivo>]
 *   (roda igual com `node scripts/rls-audit.ts` — sem dependência de npm; precisa de `psql` no PATH)
 *
 * Por que conexão direta e não PostgREST: a versão anterior lia `pg_catalog.pg_policies` pelo
 * PostgREST com a service role. MEDIDO em 2026-11-09 neste projeto: a API responde
 * `406 PGRST106 Invalid schema: pg_catalog` (só `public` e `graphql_public` são expostos), então
 * aquela leitura nunca funcionou — com credencial o script sempre saía 1, sem credencial pulava.
 * Aqui a leitura é por `psql` em transação READ ONLY (`scripts/lib/psql-leitura.mjs`).
 *
 * Quem é isento: política cujos papéis (`pg_policies.roles`) são TODOS privilegiados
 * (`service_role`, `postgres`, `supabase_*admin`). A isenção é pelo papel, não pelo nome: antes
 * bastava a política se chamar `service_role_*` para passar, mesmo valendo para `public`.
 * Exceção aceita pelo dono entra em `scripts/rls-audit.allowlist.json`, com motivo.
 *
 * Sem `SUPABASE_DB_URL` a auditoria NÃO roda: avisa (`::warning::`) e sai 0 para não quebrar o CI
 * que ainda não tem o secret. Com `--strict` (ou `RLS_AUDIT_STRICT=1`) sai 1.
 *
 * Exit: 0 = sem achado (ou não executada, sem --strict) · 1 = achado ou auditoria impossível · 2 = uso.
 */
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { consultarJson, montarAmbientePsql } from "./lib/psql-leitura.mjs";

export interface PolicyRow {
  tablename: string;
  policyname: string;
  permissive: string;
  roles: string[];
  cmd: string;
  qual: string | null;
  with_check: string | null;
}

export interface TableRow {
  relname: string;
  relrowsecurity: boolean;
  relforcerowsecurity: boolean;
  policies: number;
}

export interface Snapshot {
  policies: PolicyRow[];
  tables: TableRow[];
}

export interface Excecao {
  table: string;
  policy: string;
  motivo: string;
}

export interface Achado {
  tipo: "politica_aberta" | "rls_desligado";
  tabela: string;
  politica?: string;
  cmd?: string;
  papeis?: string[];
  using?: string | null;
  with_check?: string | null;
}

export interface Resultado {
  achados: Achado[];
  aceitas: Achado[];
  excecoesObsoletas: Excecao[];
  semPolitica: string[];
  totalPoliticas: number;
  totalTabelas: number;
}

const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const ALLOWLIST_PADRAO = path.join(AQUI, "rls-audit.allowlist.json");

/** Papéis que já ignoram ou administram RLS: política só para eles não abre nada a usuário. */
export const PAPEIS_PRIVILEGIADOS = new Set([
  "service_role",
  "postgres",
  "supabase_admin",
  "supabase_auth_admin",
  "supabase_storage_admin",
  "supabase_realtime_admin",
  "supabase_replication_admin",
  "dashboard_user",
]);

export const SQL_AUDITORIA = `
SELECT json_build_object(
  'policies', (
    SELECT coalesce(json_agg(p ORDER BY p.tablename, p.policyname), '[]'::json)
    FROM (
      SELECT tablename, policyname, permissive, roles::text[] AS roles, cmd, qual, with_check
      FROM pg_catalog.pg_policies
      WHERE schemaname = 'public'
    ) p
  ),
  'tables', (
    SELECT coalesce(json_agg(t ORDER BY t.relname), '[]'::json)
    FROM (
      SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity,
             (SELECT count(*)::int FROM pg_catalog.pg_policy pol WHERE pol.polrelid = c.oid) AS policies
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    ) t
  )
)`;

/** `true`, `(true)`, `((TRUE))`, `(1 = 1)` — expressão que não filtra nada. */
export function sempreVerdadeira(expr: string | null | undefined): boolean {
  if (expr === null || expr === undefined) return false;
  let t = String(expr).toLowerCase().replace(/\s+/g, "");
  while (t.startsWith("(") && t.endsWith(")") && parentesesExternosCasam(t)) t = t.slice(1, -1);
  return t === "true" || t === "1=1";
}

function parentesesExternosCasam(t: string): boolean {
  let nivel = 0;
  for (let i = 0; i < t.length; i++) {
    if (t[i] === "(") nivel++;
    else if (t[i] === ")") nivel--;
    if (nivel === 0 && i < t.length - 1) return false;
  }
  return nivel === 0;
}

export function soPapeisPrivilegiados(roles: string[] | null | undefined): boolean {
  if (!Array.isArray(roles) || roles.length === 0) return false;
  return roles.every((r) => PAPEIS_PRIVILEGIADOS.has(String(r).toLowerCase()));
}

/** A política libera tudo? Considera qual expressão vale para cada comando. */
export function politicaAberta(p: PolicyRow): boolean {
  if (String(p.permissive).toUpperCase() !== "PERMISSIVE") return false; // RESTRICTIVE só restringe
  const cmd = String(p.cmd).toUpperCase();
  const usaUsing = cmd !== "INSERT";
  const usaCheck = cmd === "INSERT" || cmd === "UPDATE" || cmd === "ALL";
  return (usaUsing && sempreVerdadeira(p.qual)) || (usaCheck && sempreVerdadeira(p.with_check));
}

export function avaliar(snapshot: Snapshot, excecoes: Excecao[] = []): Resultado {
  const chave = (tabela: string, politica: string) => `${tabela}\u0000${politica}`;
  const aceitasPorChave = new Map(excecoes.map((e) => [chave(e.table, e.policy), e]));
  const usadas = new Set<string>();

  const achados: Achado[] = [];
  const aceitas: Achado[] = [];

  for (const t of snapshot.tables) {
    if (t.relrowsecurity !== true) achados.push({ tipo: "rls_desligado", tabela: t.relname });
  }

  for (const p of snapshot.policies) {
    if (!politicaAberta(p) || soPapeisPrivilegiados(p.roles)) continue;
    const achado: Achado = {
      tipo: "politica_aberta",
      tabela: p.tablename,
      politica: p.policyname,
      cmd: p.cmd,
      papeis: p.roles,
      using: p.qual,
      with_check: p.with_check,
    };
    const k = chave(p.tablename, p.policyname);
    if (aceitasPorChave.has(k)) {
      usadas.add(k);
      aceitas.push(achado);
    } else {
      achados.push(achado);
    }
  }

  return {
    achados,
    aceitas,
    excecoesObsoletas: excecoes.filter((e) => !usadas.has(chave(e.table, e.policy))),
    semPolitica: snapshot.tables.filter((t) => t.relrowsecurity === true && t.policies === 0).map((t) => t.relname),
    totalPoliticas: snapshot.policies.length,
    totalTabelas: snapshot.tables.length,
  };
}

/** Lê e valida o arquivo de exceções. Arquivo ausente = nenhuma exceção; malformado = erro. */
export function lerExcecoes(arquivo: string): Excecao[] {
  if (!existsSync(arquivo)) return [];
  let dados: unknown;
  try {
    dados = JSON.parse(readFileSync(arquivo, "utf8"));
  } catch {
    throw new Error(`allowlist ${arquivo} não é JSON válido`);
  }
  const lista = (dados as { excecoes?: unknown })?.excecoes;
  if (!Array.isArray(lista)) throw new Error(`allowlist ${arquivo}: falta o array "excecoes"`);
  return lista.map((item, i) => {
    const e = item as Partial<Excecao>;
    const valido = [e?.table, e?.policy, e?.motivo].every((v) => typeof v === "string" && v.trim().length > 0);
    if (!valido) throw new Error(`allowlist ${arquivo}: excecoes[${i}] precisa de "table", "policy" e "motivo" não vazios`);
    return { table: e.table as string, policy: e.policy as string, motivo: e.motivo as string };
  });
}

export function validarSnapshot(dados: unknown): Snapshot {
  const s = dados as Partial<Snapshot> | null;
  if (!s || !Array.isArray(s.policies) || !Array.isArray(s.tables)) {
    throw new Error("resposta do banco fora do formato esperado (policies/tables)");
  }
  if (s.tables.length === 0) {
    // Fail-closed: banco oficial tem dezenas de tabelas; zero indica destino errado ou falta de permissão.
    throw new Error("nenhuma tabela encontrada em public — auditoria não comprovou nada");
  }
  return s as Snapshot;
}

interface Opcoes {
  strict: boolean;
  json: boolean;
  allowlist: string;
  ajuda: boolean;
}

export function lerArgs(argv: string[], env: Record<string, string | undefined> = {}): Opcoes {
  const o: Opcoes = { strict: env.RLS_AUDIT_STRICT === "1", json: false, allowlist: ALLOWLIST_PADRAO, ajuda: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--strict") o.strict = true;
    else if (a === "--json") o.json = true;
    else if (a === "--help" || a === "-h") o.ajuda = true;
    else if (a === "--allowlist") {
      const v = argv[++i];
      if (!v) throw new Error("--allowlist exige um caminho");
      o.allowlist = path.resolve(v);
    } else throw new Error(`argumento desconhecido: ${a}`);
  }
  return o;
}

const AJUDA = `Uso: SUPABASE_DB_URL=... bun run scripts/rls-audit.ts [--strict] [--json] [--allowlist <arquivo>]
  --strict     sai 1 também quando a auditoria não pôde rodar (sem SUPABASE_DB_URL)
  --json       imprime o resultado como um único documento JSON no stdout
  --allowlist  arquivo de exceções aceitas (padrão: scripts/rls-audit.allowlist.json)`;

export function principal(argv: string[], env: Record<string, string | undefined>): number {
  let o: Opcoes;
  try {
    o = lerArgs(argv, env);
  } catch (e) {
    console.error(`❌ ${(e as Error).message}\n${AJUDA}`);
    return 2;
  }
  if (o.ajuda) {
    console.log(AJUDA);
    return 0;
  }
  // Em --json o stdout é só o documento; todo o resto vai para stderr.
  const diga = o.json ? console.error : console.log;

  const dbUrl = env.SUPABASE_DB_URL?.trim();
  if (!dbUrl) {
    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("❌ RLS Audit: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY não bastam.");
      console.error("   O PostgREST deste projeto não expõe pg_catalog (PGRST106). Defina SUPABASE_DB_URL.");
      return 1;
    }
    const msg = "RLS Audit NÃO EXECUTADA: SUPABASE_DB_URL ausente — nenhuma política foi verificada.";
    if (o.json) console.log(JSON.stringify({ executada: false, motivo: "SUPABASE_DB_URL ausente" }));
    if (o.strict) {
      console.error(`❌ ${msg}`);
      return 1;
    }
    diga(`::warning title=RLS Audit::${msg}`);
    diga(`⚠️  ${msg}`);
    return 0;
  }

  let resultado: Resultado;
  try {
    const excecoes = lerExcecoes(o.allowlist);
    const ambiente = montarAmbientePsql(dbUrl, { refEsperado: env.VITE_SUPABASE_PROJECT_ID?.trim() || undefined });
    diga("🔍 RLS Audit: lendo pg_policies e pg_class (transação somente leitura)…");
    resultado = avaliar(validarSnapshot(consultarJson(SQL_AUDITORIA, ambiente)), excecoes);
  } catch (e) {
    console.error(`❌ RLS Audit não conseguiu auditar: ${(e as Error).message}`);
    return 1;
  }

  if (o.json) console.log(JSON.stringify({ executada: true, ...resultado }, null, 2));

  for (const e of resultado.excecoesObsoletas) {
    diga(`⚠️  exceção obsoleta na allowlist (não casa com política aberta): ${e.table} / ${e.policy}`);
  }
  if (resultado.aceitas.length > 0) {
    diga(`ℹ️  ${resultado.aceitas.length} política(s) aberta(s) aceita(s) pela allowlist.`);
  }
  if (resultado.semPolitica.length > 0) {
    diga(`ℹ️  ${resultado.semPolitica.length} tabela(s) com RLS ligado e nenhuma política (acesso só por service role).`);
  }

  if (resultado.achados.length > 0) {
    console.error(`\n🚨 RLS Audit: ${resultado.achados.length} achado(s) em ${resultado.totalTabelas} tabela(s).`);
    for (const a of resultado.achados) {
      if (a.tipo === "rls_desligado") console.error(`  - ${a.tabela}: RLS DESLIGADO`);
      else {
        console.error(
          `  - ${a.tabela} / ${a.politica} (${a.cmd}) para [${(a.papeis ?? []).join(", ")}]: ` +
            `using=${a.using ?? "—"} with_check=${a.with_check ?? "—"}`,
        );
      }
    }
    return 1;
  }

  diga(`✅ RLS Audit: ${resultado.totalPoliticas} política(s) em ${resultado.totalTabelas} tabela(s), nenhuma aberta.`);
  return 0;
}

const ehPrincipal = (() => {
  try {
    return process.argv[1] !== undefined && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
})();

if (ehPrincipal) process.exit(principal(process.argv.slice(2), process.env));
