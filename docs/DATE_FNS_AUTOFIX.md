# date-fns Autofix Guide

This project bans `date-fns` and `date-fns/locale` **barrel imports** because they
break tree-shaking and have regressed in past upgrades. A custom ESLint rule
(`local/date-fns-subpath`) detects violations **and** ships an autofix that
rewrites them into per-subpath imports.

---

## TL;DR — run the autofix

```bash
# Fix every offending import in the repo, in place.
bun run lint:date-fns:fix

# Verify nothing slipped through (this is the same command CI runs).
bun run lint:date-fns
```

`lint:date-fns:fix` resolves to:

```bash
eslint . --config eslint.date-fns.config.js --fix
```

`lint:date-fns` (the gate) resolves to:

```bash
eslint . --config eslint.date-fns.config.js --max-warnings=0
```

After running the autofix, review the diff (`git diff`), run the smoke test
(`bun run date-fns:smoke`), and commit.

---

## Why a focused config?

`eslint.date-fns.config.js` enables **only** the `local/date-fns-subpath` rule
across `**/*.{ts,tsx,js,jsx}`. It is intentionally separate from the project's
main ESLint config so the autofix can be applied surgically — without
triggering unrelated rules or stale `eslint-disable` warnings.

---

## Before / after examples

### 1. Named functions from the main package

**Before** (barrel import — banned):
```ts
import { format, parseISO, addDays } from "date-fns";
```

**After** (autofixed — one import per subpath):
```ts
import { format } from "date-fns/format";
import { parseISO } from "date-fns/parseISO";
import { addDays } from "date-fns/addDays";
```

### 2. Locales

**Before**:
```ts
import { ptBR, enUS } from "date-fns/locale";
```

**After**:
```ts
import { ptBR } from "date-fns/locale/pt-BR";
import { enUS } from "date-fns/locale/en-US";
```

> Locale subpaths use the **kebab-case BCP-47 tag** (e.g. `pt-BR`, `en-US`,
> `es`, `fr`), not the camelCase identifier.

### 3. Mixed / aliased imports

**Before**:
```ts
import { format as fmt, differenceInDays } from "date-fns";
```

**After**:
```ts
import { format as fmt } from "date-fns/format";
import { differenceInDays } from "date-fns/differenceInDays";
```

Aliases (`as fmt`) and type-only imports (`import type { ... }`) are preserved.

---

## When to run it

| Situation                                          | Command                          |
| -------------------------------------------------- | -------------------------------- |
| You just added a new `date-fns` import and want it normalized | `bun run lint:date-fns:fix`      |
| CI failed on the date-fns gate                     | `bun run lint:date-fns:fix`, then `bun run lint:date-fns` |
| Validating before pushing                          | `bun run date-fns:smoke`         |
| Just checking, no writes                           | `bun run lint:date-fns`          |

The pre-commit hook (`scripts/hooks/datefns-precommit.sh`) runs the gate
automatically on staged files, so most violations are caught before they
reach CI.

---

## Manual fix (if autofix can't help)

The autofix handles the common shapes above. For unusual cases (dynamic
imports, re-exports from a barrel file you control, etc.) rewrite by hand:

1. Replace `from "date-fns"` with one `from "date-fns/<name>"` per import.
2. Replace `from "date-fns/locale"` with `from "date-fns/locale/<bcp-47-tag>"`.
3. Re-run `bun run lint:date-fns` to confirm the file is clean.

---

## Related scripts

- `bun run date-fns:smoke` — full local smoke pipeline (regen + verify + vitest).
- `bun run verify:datefns-files` — checks every required subpath file exists on disk.
- `bun run ci:smoke` — what the PR CI workflow runs.
- `bun run ci:check` — full CI gate (lint + types + smoke).

---

## Namespace imports vs per-subpath imports

The rule's whole purpose is to push every `date-fns` consumer onto
**per-subpath imports** so bundlers can tree-shake. That goal makes
**namespace imports** structurally incompatible with the autofix —
there is no safe rewrite for them. This section spells out exactly how
each shape is handled so you don't have to read the rule source.

### ✅ Per-subpath imports — preferred, never reported

```ts
import { format } from "date-fns/format";
import { ptBR } from "date-fns/locale/pt-BR";
import type { Locale } from "date-fns/locale/pt-BR";
```

These are the canonical end state. The rule ignores them entirely:
no report, no fix, no diagnostics. Every autofix in this codebase is
designed to converge on this shape.

### ✅ Named barrel imports — reported AND autofixed

```ts
// before
import { format, parseISO } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";

// after `bun run lint:date-fns:fix`
import { format } from "date-fns/format";
import { parseISO } from "date-fns/parseISO";
import { ptBR } from "date-fns/locale/pt-BR";
import { enUS } from "date-fns/locale/en-US";
```

Aliases (`import { format as fmt }`) and type-only specifiers
(`import type { Locale }`) survive the rewrite intact.

### ❌ Namespace imports — reported, **never** autofixed

```ts
import * as dateFns from "date-fns";        // unfixable
import * as locales from "date-fns/locale"; // unfixable
```

ESLint reports these with `messageId: "unfixable"` and a message
beginning with **"Namespace import"**. The rule deliberately attaches
**no `fix` descriptor**, which means:

- `bun run lint:date-fns` — fails (one error per namespace import).
- `bun run lint:date-fns:fix` — also fails; the source is left
  byte-for-byte unchanged. Pinned by the
  `autofix is byte-for-byte identical on the raw namespace-import fixture`
  test in `eslint-rules/__tests__/date-fns-subpath.behavior.test.ts`.
- The CI dry-run gate
  (`.github/workflows/lint-date-fns-locale-fixability.yml`) treats any
  namespace-import violation as a hard failure.

**Why no autofix?** A namespace import like `dateFns.format(...)` could
reach any of ~200 functions and any of the 95+ locales — picking a
single subpath would silently break all the other call sites. There is
no syntactic transformation that preserves behaviour without scanning
every member access in the file, which is out of scope for a single-
node ESLint rule.

**How to fix manually:**

```ts
// before
import * as dateFns from "date-fns";
const today = dateFns.format(new Date(), "yyyy-MM-dd");
const parsed = dateFns.parseISO("2025-01-01");

// after — one per-subpath import per used member
import { format } from "date-fns/format";
import { parseISO } from "date-fns/parseISO";
const today = format(new Date(), "yyyy-MM-dd");
const parsed = parseISO("2025-01-01");
```

If you genuinely need a single object handle (e.g. passing the library
to a plugin), build it yourself from per-subpath imports and re-export:

```ts
// src/lib/date-fns.ts
import { format } from "date-fns/format";
import { parseISO } from "date-fns/parseISO";
export const dateFns = { format, parseISO };
```

### ❌ Default imports — reported, **never** autofixed

```ts
import dateFns from "date-fns"; // unfixable
```

`date-fns` exposes no default export, so this is a latent bug as well
as a barrel violation. Reported with `messageId: "unfixable"` and a
message beginning with **"Default import"**. Like namespace imports,
the source is never rewritten — replace by hand using the same pattern
shown above.

### ❌ Unknown locale identifiers — reported, **never** autofixed

```ts
import { totallyMadeUpLocale } from "date-fns/locale"; // unfixable
```

The rule only autofixes locales that exist in its `LOCALE_SUBPATHS`
map (verified against `node_modules/date-fns/locale/` and `package.json
#exports` by `bun run verify:datefns-locale-coverage`). An unknown
identifier produces a per-specifier `unfixable` report on top of the
per-declaration `barrelLocale` report. The fix is either to use a real
locale or to add a missing one to `LOCALE_SUBPATHS` — the coverage
script prints the exact map entry to add.

### Mixed-import files

A single file can mix fixable and unfixable shapes — the rule handles
each import independently:

```ts
import * as dateFns from "date-fns";   // ❌ unfixable, kept verbatim
import { format } from "date-fns";     // ✅ rewritten to date-fns/format
```

After autofix, the named import is rewritten and the namespace import
is preserved byte-for-byte. The next lint pass still reports the
namespace import as `unfixable`. Pinned by the
`partitions a mixed namespace + named barrel fixture` test.

### Summary table

| Import shape                                  | Reported? | Autofixed? | `messageId`     |
| --------------------------------------------- | :-------: | :--------: | --------------- |
| `import { x } from "date-fns/x"`              |     —     |     —      | (no report)     |
| `import { x } from "date-fns"`                |    yes    |    yes     | `barrel`        |
| `import { ptBR } from "date-fns/locale"`      |    yes    |    yes     | `barrelLocale`  |
| `import * as df from "date-fns"`              |    yes    |   **no**   | `unfixable`     |
| `import * as l from "date-fns/locale"`        |    yes    |   **no**   | `unfixable`     |
| `import df from "date-fns"`                   |    yes    |   **no**   | `unfixable`     |
| `import { madeUp } from "date-fns/locale"`    |    yes    |   **no**   | `unfixable`     |
