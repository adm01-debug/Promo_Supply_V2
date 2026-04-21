
## Plan: Verify installed date-fns version matches package.json + lockfile

### Goal
Add a one-shot verification step that cross-checks three sources of truth for `date-fns` and reports any mismatch:
1. Declared spec in `package.json`
2. Resolved entry in `bun.lock`
3. Actual `version` in `node_modules/date-fns/package.json`

### Approach
Run a small inline shell script (no new file committed — pure verification, not source code). It reads each source, prints a compact report, and exits non-zero if any of the three disagree.

### Steps
1. **Read `package.json` spec**
   `node -p "require('./package.json').dependencies['date-fns']"` → expect `3.6.0`.

2. **Read installed version**
   `node -p "require('./node_modules/date-fns/package.json').version"` → expect `3.6.0`.

3. **Read lockfile resolution**
   `grep -E '"date-fns@[^"]+"' bun.lock | head -3` → extract the resolved version string.

4. **Compare & report**
   Inline bash:
   ```bash
   SPEC=$(node -p "require('./package.json').dependencies['date-fns']")
   INSTALLED=$(node -p "require('./node_modules/date-fns/package.json').version")
   LOCKED=$(grep -oE 'date-fns@[0-9]+\.[0-9]+\.[0-9]+' bun.lock | head -1 | cut -d@ -f2)
   echo "spec=$SPEC installed=$INSTALLED locked=$LOCKED"
   [ "$SPEC" = "$INSTALLED" ] && [ "$INSTALLED" = "$LOCKED" ] \
     && echo "OK: all three agree on $INSTALLED" \
     || { echo "MISMATCH"; exit 1; }
   ```

5. **On mismatch** — report the three values to the user and recommend `bun install` (if lockfile drifted) or `bun add date-fns@3.6.0 --exact` (if `package.json` drifted). No automatic remediation in this step.

### Notes
- No file edits. No dependency changes. Pure read-only verification executed in default mode.
- Output is a single line + OK/MISMATCH verdict — easy to paste back to the user.
