
## Already implemented — nothing to do

The autofix you're describing was built in the previous turn and is live in the repo:

- **`eslint-rules/date-fns-subpath.js`** — custom ESLint rule with `fixable: "code"`. Matches `ImportDeclaration` nodes for `"date-fns"` and `"date-fns/locale"`, splits each named specifier into its own subpath import (`format` → `date-fns/format`), and uses a built-in camelCase → BCP-47 locale map (`ptBR` → `date-fns/locale/pt-BR`, plus `enUS`, `enGB`, `es`, `fr`, `de`, `it`, `ja`, `zhCN`, `ko`).
- **`eslint.date-fns.config.js`** — registers the rule as `local/date-fns-subpath: "error"`. Replaced the older `no-restricted-imports` entry.
- **`package.json`** — `lint:date-fns:fix` script runs `eslint . --config eslint.date-fns.config.js --fix`.

Conservative bail-outs (report-only, no autofix): default imports, namespace imports, mixed inline type+value specifiers, unknown locale identifiers. Aliased specifiers (`format as fmt`) are fixed correctly.

End-to-end verification was run last turn: a planted `import { format, parseISO } from "date-fns"` plus `import { ptBR } from "date-fns/locale"` was rewritten by `bun run lint:date-fns:fix` into four correct subpath imports, and the strict gate then exited 0.

### How to use
- `bun run lint:date-fns:fix` — apply autofixes locally.
- `bun run lint:date-fns` — strict CI gate (already wired into `scripts/ci-check.sh` and `scripts/ci-smoke.sh`); fails on any remaining barrel import.

### Optional follow-ups (say which, if any)
1. Extend the locale map with the rest of date-fns's locales (~80 more) so no `unfixable` ever fires for legitimate imports.
2. Add the same autofix shape for `lodash` → `lodash/<fn>` (same tree-shaking failure mode).
3. Wire `lint:date-fns:fix` into a pre-commit hook so barrel imports get rewritten before they hit CI.
