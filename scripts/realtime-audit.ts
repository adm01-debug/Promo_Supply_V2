/**
 * OPS-02: Auditoria de canais Realtime — detecta subscribe sem unsubscribe.
 *
 * Regras:
 *   - Todo `supabase.channel(...)` deve ter `removeChannel` ou `unsubscribe`
 *     no cleanup do mesmo arquivo.
 *   - Falha o build se sobrar canal órfão.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["src"];
const orphaned: { file: string; count: number }[] = [];

function walk(dir: string) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(entry)) audit(p);
  }
}

function audit(file: string) {
  const src = readFileSync(file, "utf8");
  const opens = (src.match(/supabase\.channel\s*\(/g) ?? []).length;
  if (opens === 0) return;
  const closes =
    (src.match(/removeChannel\s*\(/g) ?? []).length +
    (src.match(/\.unsubscribe\s*\(/g) ?? []).length;
  if (closes < opens) {
    orphaned.push({ file, count: opens - closes });
  }
}

for (const r of ROOTS) walk(r);

if (orphaned.length === 0) {
  console.log("✅ Nenhum canal Realtime órfão detectado.");
  process.exit(0);
}

console.error("❌ Canais Realtime sem cleanup:");
for (const o of orphaned) console.error(`  - ${o.file} (${o.count} canal(is) sem removeChannel)`);
process.exit(1);
