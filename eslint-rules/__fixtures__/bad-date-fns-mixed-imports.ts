// ─────────────────────────────────────────────────────────────────────────────
// INTENTIONAL RULE VIOLATIONS — DO NOT "FIX".
//
// This fixture exists ONLY to feed the unit test at
//   eslint-rules/__tests__/date-fns-subpath.behavior.test.ts
// which asserts that `local/date-fns-subpath` correctly partitions a file
// containing BOTH a namespace import (unfixable) and a named barrel import
// (fixable) — the rule must autofix the named import while leaving the
// namespace import reported-but-untouched.
//
// Why the inline disable comments below:
//   The repo-wide lint gate runs the rule in error mode. Without the
//   disables, this file would break CI. The test strips both disable
//   comments in-memory before invoking the linter so the rule is still
//   exercised end-to-end.
//
// Rules for maintainers:
//   • DO NOT remove the disable comments — they keep the lint gate green.
//   • DO NOT rewrite either import — that would defeat the test.
//   • DO NOT import this file from runtime/application code.
// ─────────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line local/date-fns-subpath
import * as dateFns from "date-fns";
// eslint-disable-next-line local/date-fns-subpath
import { format } from "date-fns";

export const _sample = format(new Date(), "yyyy-MM-dd");
export const _ns = dateFns;
