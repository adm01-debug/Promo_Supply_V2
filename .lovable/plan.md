
## Plan: Strict ESLint gate for date-fns barrel imports

### Goal
Fail the build (CI + local) the moment any `date-fns` or `date-fns/locale` barrel import is reintroduced, using `eslint --max-warnings=0` scoped to the rule that already blocks them.

### Context
- `eslint.config.js` already declares `no-restricted-imports: error` for `date-fns` and `date-fns/locale` (verified earlier — zero current violations).
- No npm script currently runs ESLint as a gate. `scripts/ci-check.sh` does type-check + smoke tests but never invokes ESLint.
- Repo uses `bun` as primary runner; `npx`/`bunx` both work for the ESLint binary.

### Change 1 — `package.json`

Add two script entries (idempotent — only if missing):

```json
"lint": "eslint . --max-warnings=0",
"lint:date-fns": "eslint . --max-warnings=0 --rule 'no-restricted-imports: error' --no-eslintrc-disable-on-rules"
```

Notes:
- `lint` is the broad gate (full config, zero warnings tolerated).
- `lint:date-fns` is a **focused** gate that only enforces the barrel-import rule. Uses `--rule` to override; safe even if someone temporarily downgrades the rule in `eslint.config.js`. The `--no-eslintrc-disable-on-rules` flag isn't a real ESLint flag — drop it; instead rely on `--rule` which already takes precedence. Final form:
  ```json
  "lint:date-fns": "eslint . --max-warnings=0 --rule 'no-restricted-imports: [\"error\", {\"paths\": [{\"name\": \"date-fns\"}, {\"name\": \"date-fns/locale\"}]}]'"
  ```

### Change 2 — `scripts/ci-check.sh`

Insert a new step right after the install-report step (currently `[5/10]`), before type-check, so lint failures surface fast:

```bash
echo "▶ [6/11] Running ESLint with --max-warnings=0 (date-fns barrel gate)..."
npx eslint . --max-warnings=0
```

Renumber subsequent steps `[7/11]…[11/11]`. The full-repo `eslint .` is preferred over the focused variant here because the project's eslint config *is* the source of truth — if someone weakens the rule, `ci-check.sh` should also catch other regressions (`react-hooks/rules-of-hooks`, `import/no-unresolved`, etc. that are already configured at error level).

### Change 3 — `scripts/ci-smoke.sh`

Add the same lint step early in the script, mirroring `ci-check.sh`. Smoke is meant as the "fast feedback" loop, so lint belongs there too — it's <5s on this codebase.

### Change 4 — `.github/workflows/verify-date-fns.yml` (the workflow planned earlier — extend, don't duplicate)

Add one step after `bun install --frozen-lockfile`, before the resolver self-test:

```yaml
- name: Lint (zero warnings, blocks date-fns barrels)
  run: bunx eslint . --max-warnings=0
```

Same workflow file, same required-status name (`verify-date-fns`) — branch protection picks up the stricter check automatically.

### Why this shape
- **`eslint .` not a narrower glob.** The config already restricts file matching via `files: ["**/*.{ts,tsx}"]` blocks, so `eslint .` won't lint stray JS or generated files. Narrowing the CLI glob would just create drift between local and CI.
- **`--max-warnings=0` everywhere.** Single uniform threshold — no "warn locally, error in CI" split that lets warnings rot.
- **Lint runs before tsc and tests** in CI scripts. Lint is the cheapest check; failing fast on a barrel import beats waiting 30s for tsc.
- **Two scripts, one purpose.** `lint` for general use, `lint:date-fns` for someone debugging "is this *specifically* a barrel-import problem?" — drops noise from unrelated rules.
- **No new ESLint plugin, no new config file.** The existing rule already does the work; this plan only adds *enforcement*.

### Verification
1. `bun run lint` on current tree → exits 0 (rule passes; other configured rules also pass). If pre-existing non-date-fns errors surface, list them in a follow-up — do not weaken `--max-warnings=0`.
2. Add throwaway `import { format } from "date-fns"` somewhere in `src/` → `bun run lint` exits 1 with the configured "Import from a date-fns subpath instead" message. Revert.
3. Add `import { ptBR } from "date-fns/locale"` → same, with the locale-specific message. Revert.
4. `bash scripts/ci-check.sh` and `bash scripts/ci-smoke.sh` → both green, lint step visible in output.
5. Open PR after workflow change → GitHub Actions `verify-date-fns` job shows the new lint step; failing imports block the merge.

### Pre-flight risk: existing non-date-fns lint errors
Earlier verification noted unrelated `no-explicit-any` errors in the codebase. With `--max-warnings=0` running the *full* config (which has `@typescript-eslint/no-unused-vars: "off"` but leaves `no-explicit-any` at default = error from `tseslint.configs.recommended`), the broad `lint` script may fail today.

**Decision point** — pick one when implementing:
- **(a) Keep strict.** Run `eslint .` once, fix every reported error before wiring the gate. Cleanest end state. Could be a non-trivial cleanup pass.
- **(b) Stage it.** Wire only the focused `lint:date-fns` script (Change 1, second entry) into CI scripts and the workflow. The broad `lint` script still exists for opt-in use. Guarantees the user's literal request ("fail the build on date-fns barrel violations") without blocking on unrelated cleanup.

Recommend **(b)** for this turn — it matches the request precisely and avoids scope creep. Switch to (a) in a dedicated follow-up.

### Risk / scope (option b)
- Two script entries in `package.json`. One new step each in `ci-check.sh`, `ci-smoke.sh`, and the GitHub workflow — all running the focused `lint:date-fns` command.
- Zero source changes. Zero new files. No dependency, route, or schema changes.
- Failure path is strictly additive: anything that passed before still passes; only newly-introduced barrel imports start failing.
