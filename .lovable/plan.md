
## Plan: Optional pre-push hook for full `ci-smoke.sh`

### Goal
Allow developers to opt into running the full `scripts/ci-smoke.sh` (clean install + full verification) on every push, while keeping the default lightweight `datefns-precommit.sh` for fast feedback.

### Current state
- `.husky/pre-push` runs `scripts/hooks/datefns-precommit.sh` (lightweight: generator drift + tsc only, no clean install)
- `scripts/ci-smoke.sh` is the full smoke lane (~2 min: clean node_modules, install, eslint, verify, tsc, vitest)

### Changes

#### 1. Update `.husky/pre-push`
Replace the single-line invocation with logic that checks for opt-in before deciding which script to run:

```bash
#!/usr/bin/env bash
# Husky pre-push hook: runs either a lightweight date-fns check (default) or
# the full ci-smoke.sh if FULL_SMOKE_PRE_PUSH is set.
# To bypass entirely: git push --no-verify

# Opt-in to full smoke test via environment variable or git config:
#   FULL_SMOKE_PRE_PUSH=1 git push          # one-time
#   git config --local hook.fullSmoke true  # persistent for this repo
if [ "${FULL_SMOKE_PRE_PUSH:-}" = "1" ] || \
   [ "$(git config --local hook.fullSmoke 2>/dev/null || echo false)" = "true" ]; then
  echo "▶ Running full ci-smoke.sh (opt-in mode)..."
  bash "$(dirname "$0")/../scripts/ci-smoke.sh"
else
  # Default: lightweight date-fns integrity check
  bash "$(dirname "$0")/../scripts/hooks/datefns-precommit.sh"
fi
```

#### 2. Add npm script for convenience
Add to `package.json` scripts section:

```json
"hook:smoke:enable": "git config --local hook.fullSmoke true && echo 'Full smoke enabled on pre-push'",
"hook:smoke:disable": "git config --local hook.fullSmoke false && echo 'Full smoke disabled on pre-push'"
```

#### 3. Document in README.md
Add under "Running CI locally" section:

```markdown
### Optional full smoke on every push

By default, the pre-push hook runs a lightweight date-fns check (~10s). To run the full `ci-smoke.sh` lane (clean install + all verifications, ~2 min) on every push instead:

```sh
# One-time (current push only)
FULL_SMOKE_PRE_PUSH=1 git push

# Persistent for this repo (stored in .git/config)
bun run hook:smoke:enable

# Disable and return to lightweight mode
bun run hook:smoke:disable
```

Bypass any hook in an emergency: `git push --no-verify`
```

### Verification
1. Default push (no env, no config): runs lightweight `datefns-precommit.sh` only
2. `FULL_SMOKE_PRE_PUSH=1 git push`: runs full `ci-smoke.sh`, shows summary at end
3. `bun run hook:smoke:enable` then push: runs full smoke (persistent opt-in)
4. `bun run hook:smoke:disable`: returns to default lightweight mode
5. `git push --no-verify`: skips both hooks entirely

### Files edited
- `.husky/pre-push` — add opt-in logic (~15 lines)
- `package.json` — add two npm scripts (~2 lines)
- `README.md` — document the feature (~15 lines)

### Risk / scope
- 3 files edited, ~35 lines total, 0 new files, 0 dependency changes
- Default behavior unchanged (opt-in only)
- Hook remains bypassable with `--no-verify`
