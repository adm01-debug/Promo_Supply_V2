
## Add autofix tests for named vs default locale imports

### Goal
Pin the rule's contract for **named** vs **default** import shapes targeting `date-fns/locale`, asserting the autofix produces the exact correct subpath for named imports and refuses to fix default imports (date-fns ships no default export from the locale barrel).

### New file
`eslint-rules/__tests__/date-fns-subpath.named-vs-default.test.ts`

### Test matrix

**A. Named locale imports — must autofix to canonical subpath**
1. Single named: `import { ptBR } from "date-fns/locale"` → `date-fns/locale/pt-BR`
2. Multi named: `import { ptBR, enUS, frCA } from "date-fns/locale"` → split into 3 subpath lines, each path asserted exactly
3. Aliased named: `import { ptBR as brazilianPT } from "date-fns/locale"` → `date-fns/locale/pt-BR` with alias preserved
4. Type-only named (already-correct subpath): `import type { Locale } from "date-fns/locale/types"` style — sanity that already-correct subpaths aren't touched
5. Re-lint sweep: every fixed output must produce zero further `local/date-fns-subpath` reports (idempotency)

**B. Default locale imports — must report `unfixable`, never autofix**
1. `import ptBR from "date-fns/locale"` → reported, source byte-identical after fix
2. `import locale from "date-fns/locale/pt-BR"` (default from a real subpath) → if rule reports it, assert no autofix; if rule ignores it (subpath is already correct shape), assert zero reports. Behaviour discovered at test time and pinned.
3. Mixed file with one default + one named locale import → named is rewritten, default line preserved verbatim, exactly one residual `unfixable` report remains

**C. Path-correctness assertions (the explicit user ask)**
For every fixable case, assert the **exact** generated import string with `toBe` on the trimmed line — not just `toContain` — so any drift in casing (`pt-br`, `PT-BR`), separator (`pt_BR`), or identifier leakage (`date-fns/locale/ptBR`) fails loudly with the wrong path named in the diff.

### Test infrastructure
- Reuse the established pattern from `date-fns-subpath.behavior.test.ts`: espree parser via default `Linter` config, `lint()` and `fix()` helpers, rule loaded from `../date-fns-subpath.js`.
- No new fixtures on disk — all sources are inline strings (default-import-of-locale-barrel is a synthetic shape we don't need a permanent fixture for; the existing `bad-date-fns-default-import.ts` covers the bare-package default case).
- No production code changes. Tests-only.

### Acceptance
- New suite: ~10 tests, all green.
- Full `eslint-rules/__tests__` suite stays green (no regressions in the existing 50+ tests).
- Each fixable assertion uses exact-string matching so the failing test name + diff identifies the wrong subpath immediately.
