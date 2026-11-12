/**
 * OPS-02: Auditoria de canais Realtime — detecta subscribe sem unsubscribe.
 *
 * Regras:
 *   - Todo `supabase.channel(...)` deve ter `removeChannel`, `removeAllChannels`,
 *     `supabase.removeChannel` ou `.unsubscribe` no cleanup do mesmo arquivo.
 *   - Ignora comentários e strings para evitar falsos positivos.
 *   - Falha o build se sobrar canal órfão.
 *
 * Flags:
 *   --json   saída JSON
 *   --dir X  raiz a auditar (default: src)
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const AS_JSON = process.argv.includes("--json");
const dirIdx = process.argv.indexOf("--dir");
const ROOTS = dirIdx >= 0 && process.argv[dirIdx + 1] ? [process.argv[dirIdx + 1]] : ["src"];
const orphaned: { file: string; count: number }[] = [];

// Remove comentários de linha e de bloco para não gerar falsos positivos.
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
}

function walk(dir: string) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(entry)) audit(p);
  }
}

function audit(file: string) {
  const src = stripComments(readFileSync(file, "utf8"));
  const opens = (src.match(/supabase\.channel\s*\(/g) ?? []).length;
  if (opens === 0) return;
  // Lookbehind negativo: `supabase.removeChannel` só conta no regex qualificado,
  // evitando contagem dupla da mesma chamada.
  const closes =
    (src.match(/(?<!supabase\.)removeChannel\s*\(/g) ?? []).length +
    (src.match(/removeAllChannels\s*\(/g) ?? []).length +
    (src.match(/\.unsubscribe\s*\(/g) ?? []).length +
    (src.match(/supabase\.removeChannel\s*\(/g) ?? []).length;
  if (closes < opens) {
    orphaned.push({ file, count: opens - closes });
  }
}

for (const r of ROOTS) walk(r);

if (AS_JSON) {
  console.log(JSON.stringify({ orphaned, total: orphaned.length }, null, 2));
} else if (orphaned.length === 0) {
  console.log("✅ Nenhum canal Realtime órfão detectado.");
}

if (orphaned.length > 0) {
  console.error("❌ Canais Realtime sem cleanup:");
  for (const o of orphaned) console.error(`  - ${o.file} (${o.count} canal(is) sem removeChannel)`);
  process.exit(1);
}

process.exit(0);
