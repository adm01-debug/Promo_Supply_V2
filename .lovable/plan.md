
## Already done — nothing to implement

The `no-restricted-imports` rule blocking `date-fns` and `date-fns/locale` is already in `eslint.config.js` (lines ~26–37 of the file shown in current-code), at `error` severity with helpful messages.

### Verify it's working
Run `npx eslint src --rule 'no-restricted-imports: error'` — any offending import will surface immediately. None should exist today (the codebase already uses subpath imports like `date-fns/format` and `date-fns/locale/pt-BR` everywhere).

### Possible next steps (pick one if you want me to do it)
1. **Extend the block to more packages** prone to the same tree-shaking issue (e.g. `lodash`, `@radix-ui/react-icons` barrels) — same rule, more entries.
2. **Add a `patterns` entry** to also block deep-but-still-barrel paths like `date-fns/esm` or `date-fns/fp`, which the current `paths`-only config doesn't cover.
3. **Wire `eslint` into CI** as a required check (the repo has `ci-check.sh` but no GitHub Actions workflow for lint specifically — separate from the `verify-date-fns` workflow already planned).
4. **Pre-commit hook** that runs `eslint --max-warnings 0` on staged `.ts/.tsx` files so the rule fails locally before push.

Tell me which (if any) and I'll plan it.
