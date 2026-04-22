// ─────────────────────────────────────────────────────────────────────────────
// INTENTIONAL RULE VIOLATION — DO NOT "FIX".
//
// This fixture exists ONLY to feed the unit test at
//   eslint-rules/__tests__/date-fns-subpath.behavior.test.ts
// which asserts that `local/date-fns-subpath` reports default imports
// (`import dateFns from "date-fns"`) as `unfixable` and never autofixes
// them. There is no canonical per-subpath replacement for a default
// import, so the rule must report-but-skip-fix.
//
// Why the inline disable comment below:
//   The repo-wide lint gate (CI / `npm run lint`) runs the rule in error
//   mode. Without `eslint-disable-next-line`, this file would break the
//   main build. The test strips the disable comment in-memory before
//   invoking the linter, so the rule is still exercised end-to-end.
//
// Rules for maintainers:
//   • DO NOT remove the disable comment — it keeps the lint gate green.
//   • DO NOT rewrite this to a subpath import — that would defeat the test.
//   • DO NOT import this file from runtime/application code.
// ─────────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line local/date-fns-subpath
import dateFns from "date-fns";

export const _sample = (dateFns as { format?: (d: Date, f: string) => string })
  .format?.(new Date(), "yyyy-MM-dd");
