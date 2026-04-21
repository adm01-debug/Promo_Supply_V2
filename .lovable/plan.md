
## Plan: No-op — preflight already implemented in `scripts/ci-smoke.sh`

### Finding
`scripts/ci-smoke.sh` already runs the requested preflight check on its second line:

```bash
source "$(dirname "$0")/lib/preflight.sh"
preflight
```

The shared `preflight()` function in `scripts/lib/preflight.sh` checks for both `bun` and `node`, and on missing tools prints an actionable error to stderr and exits `127`:

```
✗ Missing required tools: bun
  Install Bun: https://bun.sh   |   Node: https://nodejs.org
```

It also detects the platform (unix / windows / unknown) for downstream cache-eviction logic. This satisfies the request as stated — bun is verified, the error is actionable (names the missing tool + install URL), and the script aborts before any `bun install` runs.

### Recommendation
No changes needed. If you want to go further, pick one and I'll plan it:

1. **Stricter Bun version gate** — also check `bun --version` against a minimum (e.g. `>= 1.1.0`) and fail with an upgrade hint.
2. **Richer error formatting** — colorize the `✗` line, add a "Why this matters" sentence, and detect WSL vs native Windows for a more specific install command.
3. **Extend the same check to other scripts** — audit `scripts/ci-check.sh`, `scripts/smoke-date-fns.sh`, `scripts/test-date-fns.sh`, `.husky/pre-push` and ensure each sources `preflight.sh` (today only `ci-check.sh` and `ci-smoke.sh` do).
4. **Add a unit test** — a tiny shell test that runs `preflight` with `PATH=` stubbed to confirm the exit code and message format don't regress.
