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
