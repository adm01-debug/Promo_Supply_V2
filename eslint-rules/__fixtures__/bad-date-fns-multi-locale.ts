// ─────────────────────────────────────────────────────────────────────────────
// INTENTIONAL RULE VIOLATIONS — DO NOT "FIX".
//
// This fixture exists ONLY to feed the unit test at
//   eslint-rules/__tests__/date-fns-subpath.behavior.test.ts
// which asserts that `local/date-fns-subpath` correctly autofixes a file
// containing MULTIPLE distinct `date-fns/locale` barrel violations —
// each in its own `import` declaration — and rewrites every one to its
// canonical kebab subpath.
//
// The fixture deliberately mixes:
//   • Single-specifier barrel        — `{ ptBR }`
//   • Multi-specifier barrel         — `{ enUS, frCA, deAT }`
//   • Aliased specifier              — `{ jaHira as japaneseHiragana }`
//   • Mixed-case kebab subpaths      — `srLatn`, `beTarask`, `uzCyrl`
// so a single autofix run exercises every named-import branch of the
// locale rewrite path together. Type-only imports are covered
// separately by the espree-incompatible TS test suites.
// so a single autofix run exercises every branch of the locale rewrite
// path together.
//
// Why the inline disable comments below:
//   The repo-wide lint gate runs the rule in error mode. Without the
//   disables, this file would break CI. The test strips them in-memory
//   before invoking the linter so the rule is still exercised end-to-end.
//
// Rules for maintainers:
//   • DO NOT remove the disable comments — they keep the lint gate green.
//   • DO NOT rewrite any of these imports — that would defeat the test.
//   • DO NOT import this file from runtime/application code.
// ─────────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line local/date-fns-subpath
import { ptBR } from "date-fns/locale";
// eslint-disable-next-line local/date-fns-subpath
import { enUS, frCA, deAT } from "date-fns/locale";
// eslint-disable-next-line local/date-fns-subpath
import { jaHira as japaneseHiragana } from "date-fns/locale";
// eslint-disable-next-line local/date-fns-subpath
import { srLatn, beTarask, uzCyrl } from "date-fns/locale";

// Reference every binding so unused-import lints don't strip them.
export const _locales = {
  ptBR,
  enUS,
  frCA,
  deAT,
  japaneseHiragana,
  srLatn,
  beTarask,
  uzCyrl,
};

