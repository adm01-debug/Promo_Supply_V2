# `scripts/` — date-fns smoke pipeline

Tooling that keeps `src/test/dateFns.smoke.test.ts` and
`public/datefns-usage.json` in sync with the real `date-fns/<subpath>` imports
under `src/`. The scanner is regex-based (zero TS-parser dependency) so it
must be conservative about what it claims to "see". This README is the
contract.

Companion docs:
- [`docs/DATE_FNS_AUTOFIX.md`](../docs/DATE_FNS_AUTOFIX.md) — the ESLint rule
  that prevents barrel imports in the first place.

---

## Scripts at a glance

| Script | Purpose |
|---|---|
| `generate-datefns-smoke-test.mjs` | Scans `src/`, regenerates the smoke test + manifest. |
| `verify-datefns-locales.mjs` | Fast CI guard: every `date-fns/locale/*` import in `src/` matches the manifest. |
| `verify-datefns-files.mjs` | Confirms every imported subpath resolves on disk in `node_modules/date-fns`. |
| `verify-datefns-generator-input.mjs` | Hashes the generator's inputs (subpaths + version + script fingerprint). |
| `verify-datefns-smoke-freshness.mjs` | Confirms the smoke test was regenerated after locale-import changes. |
| `lib/datefns-scan.mjs` | Pure regex helpers (`scanStaticDateFnsImports`, `detectUnsupportedDateFnsUsage`, `detectMalformedDateFnsImports`). Unit-tested in `lib/__tests__/`. |
| `smoke-date-fns.sh` | End-to-end pipeline: regen → verify subpaths → run vitest. |

Common flags (apply to the generator and locale verifier where noted):

| Flag | Generator | Locale verifier | Meaning |
|---|---|---|---|
| `--verbose` / `-v` | ✓ | ✓ | Per-file trace of every detected / skipped import block, plus per-locale match decisions. |
| `--strict` | ✓ | ✓ | Malformed imports (zero usable specifiers after comment stripping) become a fatal error (exit `1`) instead of a warning. |
| `--dry-run` / `-n` | ✓ | — | Print unified diff of what would change; exit `1` if anything would. |
| `--if-changed` | ✓ | — | Skip regen when the import signature is unchanged. |

---

## ✓ Supported import syntaxes

The scanner reliably extracts named exports from these shapes. Anything
matching one of these patterns will appear in the manifest and the generated
smoke test.

### 1. Single-line static import

```ts
import { format } from "date-fns/format";
import { ptBR } from "date-fns/locale/pt-BR";
import { es } from 'date-fns/locale/es';   // single quotes also OK
```

### 2. Multi-line static import

```ts
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from "date-fns/intervals";
```

Trailing commas and arbitrary internal whitespace are tolerated.

### 3. `as` aliases — alias is **stripped**, original name is captured

```ts
import { ptBR as defaultLocale } from "date-fns/locale/pt-BR";
// → manifest records: locale/pt-BR → ["ptBR"]
```

### 4. Inline `//` and block `/* */` comments inside the brace list

```ts
import {
  // primary formatter
  format, /* used everywhere */
  /*
   * secondary
   */
  formatDistanceToNow, // relative time helper
} from "date-fns/formatters";
```

Comments are stripped before the specifier list is parsed; both `//` and
`/* */` inside the braces are safe.

### 5. Multiple imports of the same subpath — deduped + sorted

```ts
import { format } from "date-fns/format";
import { format as f, parseISO } from "date-fns/format";
// → manifest records: format → ["format", "parseISO"]
```

---

## ✗ Explicitly unsupported / intentionally skipped patterns

The scanner does **not** include these in the manifest. Some are deliberate
skips (type-only imports), some are warnings (require / dynamic imports), and
some are errors under `--strict` (malformed imports). Use the table to decide.

### Skipped silently — by design

#### Type-only imports

```ts
import type { Locale } from "date-fns/locale/pt-BR";
```

Type-only imports do not survive to runtime, so the smoke test must not
assert on them. A sibling **value** import on the same subpath is still
captured normally.

### Surfaced as warnings — invisible to the static scanner

#### CommonJS `require` destructuring

```ts
const { format } = require("date-fns/format");           // ⚠ warning
```

#### Dynamic ESM import

```ts
const mod = await import("date-fns/parseISO");           // ⚠ warning
const { format } = await import("date-fns/format");      // ⚠ warning
```

Both shapes print a warning during generation listing every occurrence with
file:line. They are **never** added to the manifest because the regex
scanner can't reliably enumerate the named exports. **Convert them to a
static `import { … } from "date-fns/<subpath>"`** to regain coverage.

### Surfaced as warnings — fatal under `--strict`

#### Malformed (empty / comment-only) imports

```ts
import { } from "date-fns/format";                       // ⚠  /  ✗ --strict
import { /* TODO */ } from "date-fns/locale/pt-BR";      // ⚠  /  ✗ --strict
import {
  // pending decision
} from "date-fns/locale/en-US";                          // ⚠  /  ✗ --strict
```

Default behavior is a warning so existing pipelines don't break; CI can opt
in with `--strict` to make them a hard failure.

### Not detected at all — out of scope

| Pattern | Why it isn't supported |
|---|---|
| Namespace imports: `import * as df from "date-fns"` | Banned by the ESLint barrel-import rule (`docs/DATE_FNS_AUTOFIX.md`). |
| Default-style barrel: `import df from "date-fns"` | Same — banned. |
| Re-exports: `export { format } from "date-fns/format"` | Not currently scanned; convert to a direct import in the consumer. |
| String concatenation in the path: `import * from \`date-fns/${name}\`` | Path must be a static string literal. |
| Imports inside `eval`, JSX text, or template strings | Must be top-level static imports. |

---

## Comments and locale subpaths — a known caveat

Fully commented-out import lines are still matched (false positive, **not** a
false negative — the scanner errs on the side of over-coverage, never
under-coverage):

```ts
// import { ptBR } from "date-fns/locale/pt-BR";       // STILL matched
/*
import { ptBR } from "date-fns/locale/pt-BR";          // STILL matched
*/
```

Documented and tested in
`scripts/lib/__tests__/datefns-locale-imports.test.mjs`. The tradeoff is
intentional: a commented-out import that gets matched only adds an extra
(harmless) row to the manifest, whereas a missed real import would break the
smoke test silently.

---

## Adding new patterns

If you find an import shape used in `src/` that the generator misses:

1. **First**, prefer rewriting the call site to a supported shape — that's
   almost always the right fix.
2. If the new shape is genuinely needed, extend the scanner:
   - Add a new regex / branch in `scripts/lib/datefns-scan.mjs`.
   - Add a fixture under `scripts/lib/__tests__/fixtures/<case>.ts.txt`.
   - Add an assertion in `scripts/lib/__tests__/datefns-fixtures.test.mjs`.
   - Add unit coverage in `scripts/lib/__tests__/datefns-scan.test.mjs`.
   - Update the table above in this README.
3. Run `bun run date-fns:smoke -- --force` to regenerate everything and
   confirm the new shape ends up in the manifest.

The full test suite for the scanner (57+ tests):

```bash
bunx vitest run scripts/lib/__tests__/
```
