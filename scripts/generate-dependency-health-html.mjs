#!/usr/bin/env node
/**
 * Render public/dependency-health.json → public/dependency-health.html as a
 * self-contained, no-build, no-deps page. Designed to be opened directly
 * (file://) or served from /public for a quick visual on date-fns subpath
 * health: each row gets a green ✓ or red ✗ badge plus a tooltip showing the
 * resolved file under node_modules/date-fns (or the candidates we tried,
 * for missing entries).
 *
 * Pure read-only consumer of the snapshot — never re-walks src/ or shells out
 * to npm/bun. If the snapshot is missing or malformed, exits 1 with a hint.
 *
 * Usage:
 *   node scripts/generate-dependency-health-html.mjs
 *   node scripts/generate-dependency-health-html.mjs --out custom/path.html
 *   node scripts/generate-dependency-health-html.mjs --dry-run   # stdout only
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes("--dry-run");
const outIdx = ARGS.findIndex((a) => a === "--out");
const SNAPSHOT_PATH = resolve(ROOT, "public/dependency-health.json");
const OUT_PATH =
  outIdx >= 0 && ARGS[outIdx + 1]
    ? resolve(ROOT, ARGS[outIdx + 1])
    : resolve(ROOT, "public/dependency-health.html");

if (!existsSync(SNAPSHOT_PATH)) {
  console.error(`✗ ${relative(ROOT, SNAPSHOT_PATH)} not found.`);
  console.error(`  Generate it first: bun run verify:datefns-files -- --write-health`);
  process.exit(1);
}

let snapshot;
try {
  snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"));
} catch (err) {
  console.error(`✗ Failed to parse ${relative(ROOT, SNAPSHOT_PATH)}: ${err?.message ?? err}`);
  process.exit(1);
}

const subpaths = snapshot?.dateFns?.subpaths ?? {};
const entries = Array.isArray(subpaths.entries) ? subpaths.entries : [];
const treeShaking = snapshot?.treeShaking ?? {};
const offenders = Array.isArray(treeShaking.offenders) ? treeShaking.offenders : [];
const suppressed = Array.isArray(treeShaking.suppressed) ? treeShaking.suppressed : [];
const truncated = treeShaking.truncated === true;
const generatedAt = snapshot.generatedAt ?? subpaths.scannedAt ?? new Date().toISOString();
const dateFnsMeta = {
  spec: snapshot?.dateFns?.spec ?? "—",
  installed: snapshot?.dateFns?.installed ?? "—",
  locked: snapshot?.dateFns?.locked ?? "—",
  exactPinned: snapshot?.dateFns?.exactPinned === true,
};
const total = entries.length;
const missingCount = entries.filter((e) => !e.exists).length;
const okCount = total - missingCount;
const scanInput = subpaths.scanInput ?? null;

/** Minimal HTML escape — we never inject user-controlled HTML, but subpath
 *  names and file paths can contain characters worth defanging anyway. */
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderRow(e) {
  const ok = e.exists === true;
  const badgeClass = ok ? "badge badge-ok" : "badge badge-missing";
  const badgeLabel = ok ? "✓ exists" : "✗ missing";
  // Tooltip = resolved file when present, else the candidates we tried.
  const tip = ok
    ? `node_modules/date-fns/${e.resolvedFile ?? "(unknown)"}`
    : `Tried:\n${(e.tried ?? []).map((c) => `node_modules/date-fns/${c}`).join("\n") || "(no candidates recorded)"}`;
  const fileCount = typeof e.fileCount === "number" ? e.fileCount : null;
  const sample = Array.isArray(e.files) && e.files.length > 0
    ? `<div class="files" title="${esc(e.files.join("\n"))}">${esc(e.files.slice(0, 3).join(", "))}${e.files.length > 3 ? ` <span class="muted">+${e.files.length - 3}</span>` : ""}</div>`
    : `<div class="muted">—</div>`;
  const fcLabel = fileCount === null ? "—" : `${fileCount}`;
  return `      <tr class="${ok ? "row-ok" : "row-missing"}">
        <td><code>${esc(e.subpath)}</code></td>
        <td><span class="${badgeClass}" title="${esc(tip)}">${badgeLabel}</span></td>
        <td><code class="resolved" title="${esc(tip)}">${esc(ok ? e.resolvedFile ?? "" : "—")}</code></td>
        <td class="num">${fcLabel}</td>
        <td>${sample}</td>
      </tr>`;
}

const rowsHtml = entries
  .slice()
  .sort((a, b) => String(a.subpath).localeCompare(String(b.subpath)))
  .map(renderRow)
  .join("\n");

const RISK_ORDER = { ok: 0, warning: 1, critical: 2 };

function normalizeRisk(value) {
  return Object.prototype.hasOwnProperty.call(RISK_ORDER, value) ? value : "ok";
}

function renderRiskBadge(risk) {
  const normalized = normalizeRisk(risk);
  const label = normalized === "critical" ? "Critical" : normalized === "warning" ? "Warning" : "OK";
  return `<span class="risk risk-${normalized}">${label}</span>`;
}

const offenderRows = offenders.map((o) => ({
  ...o,
  riskLevel: normalizeRisk(o.riskLevel ?? treeShaking.riskLevel),
  suppressed: false,
  reason: "",
}));
const suppressedRows = suppressed.map((s) => ({
  ...s,
  riskLevel: normalizeRisk(s.riskLevel ?? treeShaking.riskLevel),
  suppressed: true,
  reason: s.reason ?? "Allowlisted",
}));
const allOffenderRows = [...offenderRows, ...suppressedRows];
const sourceLineCache = new Map();

function sourceLineFor(row) {
  const key = `${row.file}:${row.line ?? ""}`;
  if (sourceLineCache.has(key)) return sourceLineCache.get(key);
  try {
    const content = readFileSync(resolve(ROOT, row.file), "utf8");
    const line = content.split(/\r?\n/)[Number(row.line) - 1]?.trim() ?? "";
    sourceLineCache.set(key, line);
    return line;
  } catch {
    sourceLineCache.set(key, "");
    return "";
  }
}

function localeSubpathName(symbol) {
  // date-fns locale exports usually use camel-cased region names (ptBR, enUS)
  // while subpaths use BCP-47 casing (pt-BR, en-US). Keep the common case
  // readable without hardcoding every supported locale.
  return String(symbol).replace(/^([a-z]{2})([A-Z]{2})$/, (_, lang, region) => `${lang}-${region}`);
}

function recommendedReplacement(row) {
  const importLine = sourceLineFor(row);
  const namedMatch = /import\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"]/.exec(importLine);
  const names = namedMatch?.[1]
    ?.split(",")
    .map((part) => part.trim().split(/\s+as\s+/i)[0]?.trim())
    .filter(Boolean) ?? [];

  if (row.importPath === "date-fns/locale") {
    if (names.length === 0) return "Use locale subpaths: date-fns/locale/<locale>";
    return names.map((name) => `date-fns/locale/${localeSubpathName(name)}`).join(" · ");
  }

  if (row.importPath === "date-fns") {
    if (names.length === 0) return "Use function subpaths: date-fns/<function>";
    return names.map((name) => `date-fns/${name}`).join(" · ");
  }

  return "Use the package's direct tree-shakable subpath";
}

function renderOffenderRow(row) {
  return `        <tr data-risk="${esc(row.riskLevel)}" data-suppressed="${row.suppressed ? "true" : "false"}">
          <td><code>${esc(row.file)}</code></td>
          <td class="num">${esc(String(row.line ?? ""))}</td>
          <td>${renderRiskBadge(row.riskLevel)}</td>
          <td><code>from "${esc(row.importPath)}"</code></td>
          <td><code class="replacement">${esc(recommendedReplacement(row))}</code></td>
          <td>${row.suppressed ? `<span class="suppressed-label">Suppressed</span><div class="muted">${esc(row.reason)}</div>` : `<span class="active-label">Active</span>`}</td>
        </tr>`;
}

const scanInputHtml = scanInput
  ? `    <details class="scan-input">
      <summary>Scan input (${scanInput.fileCount ?? "?"} files, hash <code>${esc((scanInput.fileHash ?? "").slice(0, 12))}</code>)</summary>
      <dl>
        <dt>Roots (${esc(scanInput.rootsSource ?? "—")})</dt>
        <dd>${(scanInput.roots ?? []).map((r) => `<code>${esc(r)}</code>`).join(", ") || "—"}</dd>
        <dt>Exclude dirs</dt>
        <dd>${(scanInput.excludeDirs ?? []).map((d) => `<code>${esc(d)}</code>`).join(", ") || "—"}</dd>
        <dt>Exclude file pattern</dt>
        <dd><code>${esc(scanInput.excludeFilePattern ?? "—")}</code></dd>
        <dt>File extensions</dt>
        <dd><code>${esc(scanInput.fileExtensions ?? "—")}</code></dd>
      </dl>
    </details>`
  : "";

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>date-fns dependency health</title>
  <meta name="robots" content="noindex" />
  <style>
    :root {
      color-scheme: light dark;
      --bg: #0f172a;
      --panel: #111827;
      --border: #1f2937;
      --text: #e5e7eb;
      --muted: #94a3b8;
      --ok-bg: #064e3b;
      --ok-fg: #6ee7b7;
      --bad-bg: #7f1d1d;
      --bad-fg: #fecaca;
      --accent: #818cf8;
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #f8fafc;
        --panel: #ffffff;
        --border: #e2e8f0;
        --text: #0f172a;
        --muted: #64748b;
        --ok-bg: #dcfce7;
        --ok-fg: #166534;
        --bad-bg: #fee2e2;
        --bad-fg: #991b1b;
        --accent: #4f46e5;
      }
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: var(--bg); color: var(--text); font: 14px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
    main { max-width: 1100px; margin: 0 auto; padding: 32px 20px 64px; }
    h1 { margin: 0 0 4px; font-size: 22px; letter-spacing: -0.01em; }
    .sub { color: var(--muted); font-size: 13px; margin: 0 0 24px; }
    .summary { display: flex; flex-wrap: wrap; gap: 8px 14px; margin: 0 0 20px; padding: 14px 16px; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; }
    .stat { display: inline-flex; align-items: baseline; gap: 6px; }
    .stat strong { font-size: 16px; }
    .stat .muted { color: var(--muted); font-size: 12px; }
    table { width: 100%; border-collapse: collapse; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
    th, td { padding: 9px 12px; text-align: left; border-bottom: 1px solid var(--border); vertical-align: top; }
    th { background: color-mix(in oklab, var(--panel) 70%, var(--bg) 30%); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); }
    tr:last-child td { border-bottom: none; }
    tr.row-missing { background: color-mix(in oklab, var(--bad-bg) 18%, transparent); }
    code { font: 12.5px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    code.resolved { color: var(--muted); }
    .num { text-align: right; font-variant-numeric: tabular-nums; color: var(--muted); }
    .files { color: var(--muted); font-size: 12px; max-width: 360px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 600; cursor: help; }
    .badge-ok { background: var(--ok-bg); color: var(--ok-fg); }
    .badge-missing { background: var(--bad-bg); color: var(--bad-fg); }
    .muted { color: var(--muted); }
    details.scan-input { margin: 18px 0 0; padding: 12px 14px; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; }
    details.scan-input summary { cursor: pointer; font-weight: 600; }
    details.scan-input dl { margin: 10px 0 0; display: grid; grid-template-columns: max-content 1fr; gap: 4px 16px; }
    details.scan-input dt { color: var(--muted); }
    section.offenders { margin-top: 28px; }
    section.offenders h2 { font-size: 16px; margin: 0 0 10px; }
    .offender-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px 16px; margin: 0 0 12px; padding: 12px 14px; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; }
    .offender-toolbar label { display: inline-flex; align-items: center; gap: 8px; color: var(--muted); font-size: 13px; }
    .offender-toolbar select { color: var(--text); background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 5px 8px; }
    .offender-toolbar input { accent-color: var(--accent); }
    .offender-count { color: var(--muted); font-size: 12px; }
    .risk { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; }
    .risk-ok { background: var(--ok-bg); color: var(--ok-fg); }
    .risk-warning { background: #78350f; color: #fde68a; }
    .risk-critical { background: var(--bad-bg); color: var(--bad-fg); }
    .suppressed-label, .active-label { display: inline-flex; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 600; }
    .suppressed-label { background: var(--border); color: var(--muted); }
    .active-label { background: var(--ok-bg); color: var(--ok-fg); }
    .hidden-by-filter { display: none; }
    .empty-filter-result { margin: 12px 0 0; padding: 12px 14px; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; color: var(--muted); }
    footer { margin-top: 28px; color: var(--muted); font-size: 12px; }
    a { color: var(--accent); }
    [title] { cursor: help; }
  </style>
</head>
<body>
<main>
  <h1>date-fns dependency health</h1>
  <p class="sub">Generated <time datetime="${esc(generatedAt)}">${esc(generatedAt)}</time> from <code>public/dependency-health.json</code>. Hover any badge or path for details.</p>

  <section class="summary" aria-label="Summary">
    <span class="stat"><strong>${total}</strong><span class="muted">subpaths</span></span>
    <span class="stat"><strong style="color:var(--ok-fg)">${okCount}</strong><span class="muted">exist</span></span>
    <span class="stat"><strong style="color:var(--bad-fg)">${missingCount}</strong><span class="muted">missing</span></span>
    <span class="stat"><span class="muted">spec</span><strong>${esc(dateFnsMeta.spec)}</strong></span>
    <span class="stat"><span class="muted">installed</span><strong>${esc(dateFnsMeta.installed)}</strong></span>
    <span class="stat"><span class="muted">locked</span><strong>${esc(dateFnsMeta.locked)}</strong></span>
    <span class="stat"><span class="muted">exact-pinned</span><strong>${dateFnsMeta.exactPinned ? "yes" : "no"}</strong></span>
  </section>

  <table>
    <thead>
      <tr>
        <th scope="col">Subpath</th>
        <th scope="col">Status</th>
        <th scope="col">Resolved file (in node_modules/date-fns)</th>
        <th scope="col" class="num">Imports</th>
        <th scope="col">Sample importing files</th>
      </tr>
    </thead>
    <tbody>
${rowsHtml || `      <tr><td colspan="5" class="muted">No entries recorded. Run <code>bun run verify:datefns-files -- --write-health</code>.</td></tr>`}
    </tbody>
  </table>

${scanInputHtml}

  <section class="offenders" aria-labelledby="offenders-h">
    <h2 id="offenders-h">Tree-shaking offenders <span class="muted">(${offenders.length}${truncated ? "+, truncated" : ""}${suppressed.length ? `, ${suppressed.length} suppressed` : ""})</span></h2>
    <div class="offender-toolbar" aria-label="Offender filters">
      <label>
        Minimum risk
        <select id="risk-filter">
          <option value="ok">OK and above</option>
          <option value="warning">Warning and above</option>
          <option value="critical">Critical only</option>
        </select>
      </label>
      <label>
        <input id="show-suppressed" type="checkbox" />
        Show suppressed offenders
      </label>
      <span id="offender-count" class="offender-count" aria-live="polite"></span>
    </div>
    ${allOffenderRows.length === 0
      ? `<p class="muted">No barrel imports detected — every <code>date-fns</code> import uses a tree-shakable subpath. 🎉</p>`
      : `<table id="offenders-table">
      <thead>
        <tr>
          <th scope="col">File</th>
          <th scope="col" class="num">Line</th>
          <th scope="col">Risk</th>
          <th scope="col">Import statement</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
${allOffenderRows.map(renderOffenderRow).join("\n")}
      </tbody>
    </table>
    <p id="empty-filter-result" class="empty-filter-result" hidden>No offenders match the selected filters.</p>
    ${truncated ? `<p class="muted">List truncated — see <code>public/dependency-health.json</code> for the full set.</p>` : ""}`}
  </section>

  <script>
    (() => {
      const riskRank = { ok: 0, warning: 1, critical: 2 };
      const riskFilter = document.getElementById('risk-filter');
      const showSuppressed = document.getElementById('show-suppressed');
      const count = document.getElementById('offender-count');
      const empty = document.getElementById('empty-filter-result');
      const rows = Array.from(document.querySelectorAll('#offenders-table tbody tr'));
      const update = () => {
        const minRisk = riskRank[riskFilter?.value || 'ok'] ?? 0;
        const includeSuppressed = showSuppressed?.checked === true;
        let visible = 0;
        let hiddenSuppressed = 0;
        for (const row of rows) {
          const risk = riskRank[row.dataset.risk || 'ok'] ?? 0;
          const suppressed = row.dataset.suppressed === 'true';
          const passes = risk >= minRisk && (includeSuppressed || !suppressed);
          row.classList.toggle('hidden-by-filter', !passes);
          if (passes) visible += 1;
          if (suppressed && !includeSuppressed) hiddenSuppressed += 1;
        }
        if (count) count.textContent = visible + ' shown' + (hiddenSuppressed ? ' · ' + hiddenSuppressed + ' suppressed hidden' : '');
        if (empty) empty.hidden = visible !== 0;
      };
      riskFilter?.addEventListener('change', update);
      showSuppressed?.addEventListener('change', update);
      update();
    })();
  </script>


  <footer>
    Source of truth: <code>public/dependency-health.json</code> · Regenerate with
    <code>node scripts/generate-dependency-health-html.mjs</code>.
  </footer>
</main>
</body>
</html>
`;

if (DRY_RUN) {
  process.stdout.write(html);
  console.error(`▶ [dry-run] would write ${relative(ROOT, OUT_PATH)} (${html.length} bytes, ${total} entries)`);
  process.exit(0);
}

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, html, "utf8");
console.log(`✓ Wrote ${relative(ROOT, OUT_PATH)} (${total} entries, ${okCount} ok / ${missingCount} missing)`);
