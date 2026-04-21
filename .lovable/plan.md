
## Plan: Time-zone guard test for consistent date-fns output

### Goal
Add a small Vitest test that logs the runtime time zone and fails if it's not the expected one, so date-fns formatting (especially `format(...)` with `pt-BR` locale) stays deterministic across local dev, CI, and contributor machines.

### Expected time zone
Default: **`UTC`** — standard for CI determinism. Configurable via env var `EXPECTED_TZ` so contributors in `America/Sao_Paulo` (project is BR-focused) can opt into local-zone runs without editing the test.

### Changes

#### 1. New file: `src/test/dateFns.timezone.test.ts` (~50 lines)

Responsibilities:
- Read `Intl.DateTimeFormat().resolvedOptions().timeZone` (the canonical runtime TZ).
- Read `process.env.EXPECTED_TZ` (default `"UTC"`).
- `console.log` the runtime TZ, the expected TZ, and `process.env.TZ` for visibility in CI logs.
- Assert runtime TZ equals expected.
- Add a date-fns determinism assertion: `format(new Date("2025-01-15T23:30:00Z"), "yyyy-MM-dd HH:mm", { locale: ptBR })` must equal a known value for `UTC` (`"2025-01-15 23:30"`). Skip the value-equality check when `EXPECTED_TZ` is overridden (only the TZ-name check applies).
- Include a third assertion that `Intl` is available and the resolved TZ is a non-empty string (sanity guard for exotic Node builds).

Imports follow the same shape as `dateFns.smoke.test.ts` (subpath imports, no barrel):
```ts
import { format } from "date-fns/format";
import { ptBR } from "date-fns/locale/pt-BR";
```

#### 2. `.github/workflows/ci-check.yml` — pin TZ for the job

Add `TZ: UTC` under the existing `env:` block of the `Run ci-check.sh` step (already has `CI: 'true'`). Guarantees CI matches the test's default expectation.

#### 3. `.github/workflows/datefns-smoke-drift.yml` — same TZ pin

Add `env: { TZ: UTC }` to the verify steps so the timezone test (when picked up by the broader vitest run, if extended later) is deterministic on that workflow too.

#### 4. `README.md` — short note

One paragraph under the existing testing/CI section:
> The `dateFns.timezone.test.ts` test enforces `TZ=UTC` for deterministic `date-fns` output. Override locally with `EXPECTED_TZ=America/Sao_Paulo TZ=America/Sao_Paulo bunx vitest run src/test/dateFns.timezone.test.ts`.

### What does NOT change
- The auto-generated `dateFns.smoke.test.ts` and its generator — this is a separate, hand-written test.
- `tsconfig.smoke.json` — scoped to the smoke test only; the new TZ test runs under the normal vitest config.
- `vitest.config.ts` — the test is picked up by the existing `src/**/*.test.ts` glob.
- `scripts/ci-check.sh` — no new step needed; the test runs as part of the regular vitest suite executed elsewhere in CI. (If you want it in the smoke-only path too, that's a one-line addition I can include — see open question below.)

### Verification
1. `bunx vitest run src/test/dateFns.timezone.test.ts` with `TZ=UTC` → passes, logs `runtime TZ: UTC`.
2. Same command with `TZ=America/Sao_Paulo` → fails with a clear message naming both expected and actual TZ.
3. `EXPECTED_TZ=America/Sao_Paulo TZ=America/Sao_Paulo bunx vitest run …` → passes (override works).
4. CI: green run shows `runtime TZ: UTC` in the vitest output.

### Risk / scope
- 1 new file (~50 lines), 2 workflow `env` additions (~2 lines each), 1 README paragraph.
- 0 new deps, 0 changes to existing tests or generators.
- Zero behavioral change beyond the new test gate.

### Open question
Want this test also run as part of the focused `scripts/ci-smoke.sh` / `[13/14]` smoke step (so a TZ misconfiguration fails fast in the same artifact-uploading step), or keep it in the general vitest suite only? Default in this plan is the general suite — say the word and I'll add it to the smoke path too.
