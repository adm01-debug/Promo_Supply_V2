
## Plan: Tighter TS settings for clearer date-fns import errors

### Goal
Make missing/invalid `date-fns` (and any package) imports fail at type-check with precise, actionable errors — not silent runtime failures or vague `any` fallbacks.

### Current state (`tsconfig.app.json`)
- `"strict": true`, `"strictNullChecks": false`, `"noImplicitAny": false`
- `"moduleResolution": "bundler"`, `"verbatimModuleSyntax": false`
- No `"noUncheckedSideEffectImports"`, no `"allowSyntheticDefaultImports"` setting, no `"esModuleInterop"`

Result: a typo'd subpath like `date-fns/formatt` may surface as a generic error, and missing named exports rely solely on TS2305 without extra guards.

### Changes — `tsconfig.app.json`

Add/flip the following compiler options:

| Option | Value | Why |
|---|---|---|
| `noImplicitAny` | `true` | Forces every import binding to have a real type — a missing export can't degrade to `any` silently. |
| `noUncheckedSideEffectImports` | `true` | TS 5.6+: errors on `import "date-fns/foo"` when the subpath doesn't exist on disk — catches typo'd module paths the bundler would otherwise hide. |
| `esModuleInterop` | `true` | Normalizes default vs namespace imports so error messages point at the actual missing named export instead of interop-shape mismatches. |
| `allowSyntheticDefaultImports` | `true` | Pairs with `esModuleInterop`; prevents misleading "no default export" errors masking the real issue. |
| `forceConsistentCasingInFileNames` | already `true` | (keep) |
| `verbatimModuleSyntax` | `true` | Requires `import type` for type-only imports — surfaces ambiguous package exports earlier and makes TS2305 diagnostics sharper. |

Leave untouched: `strict`, `strictNullChecks: false`, `noUnusedLocals/Parameters: false`, `moduleResolution: "bundler"`, `target`, `lib`, `paths`. No source code changes.

### Verification
1. `npx tsc --noEmit` — must report 0 errors (current code uses correct subpaths + `ptBR` locale).
2. Sanity check: temporarily edit one file to `import { formatt } from "date-fns/formatt"` → confirm TS now reports both TS2307 (subpath) and a clear binding error → revert.
3. Smoke test `src/test/dateFns.smoke.test.ts` still passes.

### Risk / scope
- `noImplicitAny: true` + `verbatimModuleSyntax: true` may flag a few pre-existing issues elsewhere in `src/`. If any surface, fix them inline (add explicit types, switch to `import type`) — these are the same kinds of bugs the user wants caught earlier.
- No runtime, UI, schema, or dependency changes. Single-file config edit (plus minimal follow-ups if strict flags reveal latent issues).
