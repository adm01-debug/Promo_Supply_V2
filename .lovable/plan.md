
## Plan: Auto-fix `date-fns` barrel imports → subpath imports

### Goal
When someone writes `import { format, parseISO } from "date-fns"`, an ESLint autofix rewrites it to two separate subpath imports:
```ts
import { format } from "date-fns/format";
import { parseISO } from "date-fns/parseISO";
```
Same for `date-fns/locale` → `date-fns/locale/<code>`. Runnable via `bun run lint:date-fns:fix`.

### Why a custom rule (not `no-restricted-imports`)
`no-restricted-imports` has no fixer — it can only report. To autofix, we need a tiny custom ESLint rule that:
1. Matches `ImportDeclaration` nodes whose `source.value` is `"date-fns"` or `"date-fns/locale"`.
2. For each named specifier, emits a new `import { X } from "date-fns/X"` line (or `date-fns/locale/<X>` for locales — note the locale export is the camelCase name, but the **subpath** is the kebab/region code, e.g. `ptBR` → `date-fns/locale/pt-BR`).
3. Replaces the original declaration with the joined new lines via `fixer.replaceText`.

### Locale name → subpath mapping
date-fns ships locale subpaths under their BCP-47-ish code, not the JS export name. The rule needs a small lookup table for the locales actually used in this codebase. Confirmed usage (grep `from "date-fns/locale/`):
- `ptBR` → `pt-BR`

That's the only locale in use today. The rule will:
- Ship a built-in map covering the ~10 most common (`ptBR→pt-BR`, `enUS→en-US`, `enGB→en-GB`, `es`, `fr`, `de`, `it`, `ja`, `zhCN→zh-CN`, `ko`).
- For unknown locale identifiers, **report but skip the fix** (safer than guessing the wrong subpath and silently breaking the build).

### Skipped cases (report-only, no autofix)
The fixer must be conservative. It will NOT autofix when:
- The import has a **default specifier** (`import df from "date-fns"`) — there is no default export on subpaths.
- The import has a **namespace specifier** (`import * as df from "date-fns"`) — no equivalent on subpaths.
- The import is **type-only** with mixed value/type specifiers — splitting needs careful `import type` handling; report and let the dev fix manually.
- A named specifier uses `as` aliasing where the local name shadows another binding — too risky to auto-rewrite. Actually aliasing itself is fine (`import { format as fmt } from "date-fns/format"` works); only skip if the imported name isn't a known date-fns export. Keep this simple: allow aliases, fix them.
- A locale specifier isn't in the known map.

In all skipped cases, emit the same error message as today's `no-restricted-imports` rule so the gate still fails — the dev just has to write the fix themselves.

### Files

#### New — `eslint-rules/date-fns-subpath.js` (~110 lines)
Plain CommonJS-style ESLint rule (flat-config compatible — exported via `export default`):
```js
// Pseudocode shape
const LOCALE_SUBPATHS = { ptBR: "pt-BR", enUS: "en-US", /* ... */ };

export const dateFnsSubpath = {
  meta: {
    type: "problem",
    fixable: "code",
    messages: {
      barrel: 'Import from a date-fns subpath instead, e.g. `from "date-fns/format"`.',
      barrelLocale: 'Import the specific locale subpath, e.g. `from "date-fns/locale/pt-BR"`.',
      unfixable: '{{reason}} — fix manually.',
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const src = node.source.value;
        if (src !== "date-fns" && src !== "date-fns/locale") return;
        const isLocale = src === "date-fns/locale";
        // Bail-out checks (default/namespace/type-only-mixed) → report w/o fix
        // Build replacement lines per specifier
        // context.report({ node, messageId, fix: (fixer) => fixer.replaceText(node, joined) })
      },
    };
  },
};
```

#### Modified — `eslint.date-fns.config.js`
Register the local rule as a plugin and enable it as `error`. Drop the now-redundant `no-restricted-imports` (the custom rule supersedes it and provides identical error messaging plus autofix). Keep `@typescript-eslint` plugin registered for disable-directive resolution.

```js
import tseslint from "typescript-eslint";
import { dateFnsSubpath } from "./eslint-rules/date-fns-subpath.js";

export default tseslint.config({
  files: ["**/*.{ts,tsx,js,jsx}"],
  ignores: ["dist/**", "node_modules/**", "supabase/functions/**", "eslint-rules/**"],
  // ...existing parser, plugins, linterOptions...
  plugins: {
    "@typescript-eslint": tseslint.plugin,
    "local": { rules: { "date-fns-subpath": dateFnsSubpath } },
  },
  rules: {
    "local/date-fns-subpath": "error",
  },
});
```

The `eslint-rules/**` ignore prevents the rule file from linting itself.

#### Modified — `package.json`
Add one new script:
```json
"lint:date-fns:fix": "eslint . --config eslint.date-fns.config.js --fix"
```
Existing `lint:date-fns` (the `--max-warnings=0` gate) stays exactly as-is — it now uses the same custom rule under the hood, so violations still block CI with the same error messages. CI scripts (`ci-check.sh`, `ci-smoke.sh`) need NO changes.

### Verification (after switch to default mode)
1. Plant `import { format, parseISO } from "date-fns";` in a throwaway file → `bun run lint:date-fns` fails with the barrel message.
2. `bun run lint:date-fns:fix` → file becomes:
   ```ts
   import { format } from "date-fns/format";
   import { parseISO } from "date-fns/parseISO";
   ```
   and `bun run lint:date-fns` exits 0.
3. Plant `import { ptBR } from "date-fns/locale";` → autofix produces `import { ptBR } from "date-fns/locale/pt-BR";`. Smoke test (`bun run smoke:date-fns`) still passes (file exists in pinned 3.6.0).
4. Plant `import df from "date-fns";` → reports `unfixable` (no default export on subpaths), gate fails, no autofix applied. Manual cleanup needed.
5. Plant `import { someUnknownLocale } from "date-fns/locale";` → reports `unfixable` (locale not in map), gate fails, no autofix.
6. Run `bun run lint:date-fns` on the clean tree → exits 0 (no current violations).
7. `bash scripts/ci-check.sh` and `bash scripts/ci-smoke.sh` → unchanged, still green; the gate step now uses the custom rule but produces identical pass/fail behavior on existing code.

### Risk / scope
- One new file (~110 lines). Two existing files modified (`eslint.date-fns.config.js` ~10 line diff; `package.json` one new script entry). Zero source-code, dependency, route, or schema changes.
- Behavior change for the gate: error message wording shifts slightly (still mentions subpath, still blocks). If anything currently passes the old `no-restricted-imports` rule, it also passes the new custom rule (both target the same source values).
- New autofix is **opt-in** via the `:fix` script — never runs automatically in CI, so there's no risk of CI silently rewriting code.
