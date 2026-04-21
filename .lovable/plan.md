
## Plan: Robust import scanning for single-line and multi-line specifiers

### Goal
Make `scripts/generate-datefns-smoke-test.mjs` (and `scripts/verify-datefns-locales.mjs`) detect every `date-fns/*` and `date-fns/locale/*` import regardless of formatting — including multi-line braces, trailing commas, comments inside braces, and non-standard whitespace.

### Current limitation
Both scripts use:
```js
/import\s+(type\s+)?\{([^{}]*)\}\s+from\s+["']date-fns\/([^"']+)["']/g
```

This works for compact imports but the `[^{}]*` class also matches newlines, which is good — however it silently breaks on:
- Inline `// comment` inside the braces (the `//` doesn't end the regex but a trailing comment after a specifier can confuse downstream `.split(",")`).
- `/* block comments */` inside or between specifiers — comment text leaks into the names list and gets parsed as a fake specifier.
- Trailing commas before `}` — produces an empty entry that's currently filtered, OK, but worth keeping covered.
- Imports written as `import\n{\n  foo\n}\nfrom\n"date-fns/foo"` (newlines around `from`) — `\s+` already handles this, but worth a regression test.
- Imports with surrounding parentheses or unusual quote escaping — out of scope (not valid TS).

The real gap: **comments inside braces** corrupt the names list and can cause a locale to be missed or misnamed. With multi-line imports this is common (developers add `// keep` notes).

### Change

#### 1. `scripts/generate-datefns-smoke-test.mjs` — strip comments from the names blob before splitting

In the import-extraction loop, after capturing `namesRaw`, run it through a small `stripComments()` helper that removes `/* … */` and `// …` runs before the existing `.split(",")` pipeline.

```js
function stripComments(s) {
  // Remove /* ... */ (non-greedy, multi-line) then // ... to end-of-line.
  return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}
```

Apply it once: `const cleaned = stripComments(namesRaw);` then split `cleaned` instead of `namesRaw`. Existing trim/`type ` strip/alias-strip/empty-filter chain stays untouched.

#### 2. Same fix in `scripts/verify-datefns-locales.mjs`

Mirror the helper and apply it to the captured names group. Even though that script only inspects subpaths (not specifier names), keeping the two scanners byte-identical prevents drift between "what the generator sees" and "what the locale guard sees."

Actually — `verify-datefns-locales.mjs` only reads the subpath capture group (group 3), not the names group, so comments inside braces don't affect it. **Skip the change there**; document this in a one-line code comment so future maintainers don't re-add it.

#### 3. Regex tightening (both scripts)

Replace the inner `[^{}]*` with `[\s\S]*?` (non-greedy, explicit any-char-including-newline). Functionally similar but:
- Documents intent clearly (we accept newlines).
- Non-greedy stops at the first `}`, preventing edge cases where two adjacent `import { … }` blocks could merge if the source had unusual nesting. (`[^{}]*` already prevents this, but `*?` is more idiomatic.)

#### 4. Add a sanity check after parsing

If `IMPORT_RE` matches a `date-fns/locale/*` subpath but `stripComments(namesRaw)` yields zero names after splitting, log a warning to stderr and continue. This surfaces malformed imports (e.g. someone wrote `import { } from "date-fns/locale/pt-BR"`) instead of silently dropping the locale.

### What does NOT change
- Manifest schema, smoke test render template, exit codes.
- ESLint rule (`eslint-rules/date-fns-subpath.js`) — has its own AST-based parser, immune to formatting issues.
- `scripts/ci-check.sh` step ordering or numbers.
- `public/datefns-usage.json` content for the current source tree (no comments inside braces today, so output is byte-identical).

### Verification
1. Add a multi-line import with a `// keep for v2` comment between two specifiers in a `src/` file → regenerate → both specifiers appear in the manifest.
2. Add `import {\n  ptBR /* primary */,\n  enUS,\n} from "date-fns/locale/pt-BR";` style block (block comment + trailing comma) → both names extracted, no fake specifier from the comment text.
3. Add an intentionally empty `import { } from "date-fns/locale/fr";` → stderr warning printed, locale skipped, exit code unchanged on the no-flag path (since the regex didn't yield usable names, the subpath isn't added).
4. Run `node scripts/generate-datefns-smoke-test.mjs --dry-run` on the current tree → output is byte-identical to before the change (no diff).
5. `node scripts/verify-datefns-locales.mjs` still passes; comment in that file explains why no parallel change was needed.

### Risk / scope
~10 added lines in `scripts/generate-datefns-smoke-test.mjs` (one helper + two call sites + one warning), ~3 lines of clarifying comment in `scripts/verify-datefns-locales.mjs`. Zero new deps, zero behavioral change for the current source tree.
