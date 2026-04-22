# `eslint-rules/__fixtures__/`

Pinned source files that **intentionally violate** the
[`local/date-fns-subpath`](../date-fns-subpath.js) ESLint rule. They are
consumed by the behavior tests in
[`../__tests__/`](../__tests__/) to lock in the rule's report-and-fix
contract end-to-end against real on-disk inputs (not just inline
template strings).

> ⚠️ **DO NOT "fix" these files.** Their value is precisely that they
> are broken on purpose. DO NOT import them from runtime/application
> code — they live outside the `src/` tree and `tsconfig.app.json`'s
> include list for that reason.

---

## Why on-disk fixtures (vs inline test strings)?

Inline strings in a `*.test.ts` file are easy to write but they only
prove the rule works against *what the test author thought to type*.
On-disk fixtures additionally prove:

1. **The rule survives a real file round-trip** — UTF-8 encoding,
   trailing newlines, BOM handling, line endings.
2. **The repo-wide lint gate stays green** — every fixture carries an
   `eslint-disable-next-line local/date-fns-subpath` (and, where
   relevant, `@ts-expect-error`) directive. Without those, CI would
   fail on the fixture itself. Tests strip the directives in-memory
   before invoking the linter, so the rule is still exercised against
   the *raw* violation.
3. **Whole-file behaviors are testable** — e.g. "this autofix output is
   byte-for-byte identical to the input" is a meaningful assertion
   only against an on-disk file with stable bytes.

---

## Fixture catalogue

| File                                  | Violation shape                              | Expected `messageId` | Autofixable? |
| ------------------------------------- | -------------------------------------------- | -------------------- | :----------: |
| `bad-date-fns-import.ts`              | `import { format } from "date-fns"` <br> `import { ptBR } from "date-fns/locale"` | `barrel` + `barrelLocale` | ✅ yes |
| `bad-date-fns-namespace-import.ts`    | `import * as dateFns from "date-fns"`        | `unfixable`          | ❌ no        |
| `bad-date-fns-default-import.ts`      | `import dateFns from "date-fns"`             | `unfixable`          | ❌ no        |
| `bad-date-fns-mixed-imports.ts`       | namespace **+** named barrel in one file     | `unfixable` + `barrel` | ⚠️ partial (named only) |

### `bad-date-fns-import.ts` — the canonical "happy autofix" fixture

Two barrel imports — one function (`format` from `date-fns`) and one
locale (`ptBR` from `date-fns/locale`). Consumed by
[`date-fns-subpath.test.ts`](../__tests__/date-fns-subpath.test.ts) to
prove:

- The rule emits exactly two reports with `messageId`s `barrel` and
  `barrelLocale`.
- `verifyAndFix` rewrites both into `from "date-fns/format"` and
  `from "date-fns/locale/pt-BR"` respectively.

This file does **not** carry an `eslint-disable` directive — the
date-fns-only lint config (`eslint.date-fns.config.js`) ignores
`eslint-rules/__fixtures__/**`, so it doesn't pollute CI.

### `bad-date-fns-namespace-import.ts` — unfixable, byte-stable

A single `import * as dateFns from "date-fns"`. Used by two tests in
[`date-fns-subpath.behavior.test.ts`](../__tests__/date-fns-subpath.behavior.test.ts):

- **`reports the on-disk namespace-import fixture as unfixable`** —
  strips the disable comment in-memory and asserts a single
  `messageId: "unfixable"` report whose message starts with
  `"Namespace import"`. Autofix returns `fixed: false` and unchanged
  output.
- **`autofix is byte-for-byte identical on the raw namespace-import fixture`** —
  feeds the file **verbatim** (disable comment intact) and asserts
  the autofixer's output matches the input across three independent
  dimensions: string equality, byte length, and SHA-256 hash. Pins
  the contract that ESLint never mutates a file containing only
  unfixable violations.

Carries `// eslint-disable-next-line local/date-fns-subpath` on the
violating line. **Do not remove it** — it's the only reason the
repo-wide lint gate stays green.

### `bad-date-fns-default-import.ts` — unfixable, no canonical replacement

A single `import dateFns from "date-fns"`. `date-fns` exposes no
default export, so this is also a latent runtime bug — hence the
accompanying `@ts-expect-error` directive. Consumed by the
**`reports the on-disk default-import fixture as unfixable`** test,
which asserts the rule reports `messageId: "unfixable"` with a
`/Default import/i` message and that autofix is a strict no-op.

Both `// @ts-expect-error` and `// eslint-disable-next-line` directives
must remain in place.

### `bad-date-fns-mixed-imports.ts` — partial-fix partition

Combines a namespace import (unfixable) with a named barrel import
(fixable) in the same file. Consumed by the
**`partitions a mixed namespace + named barrel fixture`** test, which
strips both disable comments and verifies the rule:

1. Reports both violations (`barrel` + `unfixable`).
2. Attaches a `fix` descriptor to exactly one of them.
3. Rewrites the named import into `from "date-fns/format"` while the
   namespace import survives byte-for-byte (asserted via a count of
   remaining `from "date-fns"` occurrences).
4. After the rewrite, the residual lint pass leaves exactly one
   `unfixable` namespace report.

Guards against two regression classes: silently rewriting namespace
imports, or skipping fixable named imports because a sibling violation
in the same file is unfixable.

---

## How tests consume these fixtures

All behavior tests follow the same five-step pattern:

```ts
// 1. Resolve the on-disk path relative to __dirname.
const fixturePath = resolve(__dirname, "../__fixtures__/<name>.ts");

// 2. Read the raw bytes.
const raw = readFileSync(fixturePath, "utf8");

// 3. Strip eslint-disable directives in-memory so the linter sees the
//    raw violation. Use the global flag if multiple disables exist.
const src = raw.replace(/^\s*\/\/ eslint-disable-next-line[^\n]*\n/gm, "");

// 4. Run the rule via espree-backed Linter (parser-light helpers
//    `lint(src)` and `fix(src)` are defined at the top of the test file).
const messages = lint(src);
const fixed = fix(src);

// 5. Assert messageIds, message text, fixability, and (where
//    relevant) the rewritten output or byte-for-byte equality.
expect(messages.map((m) => m.messageId).sort()).toEqual([...]);
expect(fixed.output).toContain('from "date-fns/format"');
```

The shared `CONFIG`, `lint()`, and `fix()` helpers live at the top of
[`date-fns-subpath.behavior.test.ts`](../__tests__/date-fns-subpath.behavior.test.ts).

---

## Adding a new fixture

1. **Create the file** under `eslint-rules/__fixtures__/<descriptive-name>.ts`.
2. **Carry the disable directive** — `// eslint-disable-next-line local/date-fns-subpath`
   on each violating line — so the repo-wide lint gate stays green.
   Add `// @ts-expect-error - <reason>` if the violation also produces
   a TypeScript error (e.g. default-importing a module with no default
   export).
3. **Reference the binding** with an `export const _sample = …` so
   tree-shakers and unused-import lints don't flag the fixture.
4. **Add a row** to the catalogue table above and a short description
   to this README.
5. **Write the test** in `../__tests__/date-fns-subpath.behavior.test.ts`
   following the five-step pattern above. Assert at minimum:
   - The expected `messageId`(s).
   - That `fixed.fixed` matches the autofix expectation.
   - For unfixable cases: `fixed.output === src`.
   - For fixable cases: a `toContain` check on the rewritten subpath.

---

## Related

- Rule source: [`../date-fns-subpath.js`](../date-fns-subpath.js)
- Tests: [`../__tests__/`](../__tests__/)
- Public docs: [`/docs/DATE_FNS_AUTOFIX.md`](../../docs/DATE_FNS_AUTOFIX.md)
  — user-facing rationale, autofix examples, and the namespace-vs-subpath
  contract table.
- CI gate: [`../../.github/workflows/lint-date-fns-locale-fixability.yml`](../../.github/workflows/lint-date-fns-locale-fixability.yml)
- Coverage report: `bun run verify:datefns-locale-coverage`
