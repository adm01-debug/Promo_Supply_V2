// Snapshot fixtures for the date-fns autofix dry-run snapshot tests.
// Each export pairs a label with a source string. Add new entries here
// (and re-run `bunx vitest run -u …`) when you want a new shape covered.
// Keep snippets minimal — one import shape per fixture — so a snapshot
// diff points unambiguously at one autofix behaviour.
export const FIXTURES: Array<{ name: string; source: string }> = [
  {
    name: "single-locale-barrel",
    source: `import { ptBR } from "date-fns/locale";\n`,
  },
  {
    name: "multi-locale-barrel",
    source: `import { ptBR, enUS, frCA } from "date-fns/locale";\n`,
  },
  {
    name: "locale-with-alias",
    source: `import { ptBR as defaultLocale } from "date-fns/locale";\n`,
  },
  {
    name: "kebab-locale",
    source: `import { beTarask, jaHira, srLatn } from "date-fns/locale";\n`,
  },
  {
    name: "function-barrel",
    source: `import { format, parseISO, addDays } from "date-fns";\n`,
  },
  {
    name: "mixed-barrel-and-locale",
    source:
      `import { format } from "date-fns";\n` +
      `import { ptBR } from "date-fns/locale";\n`,
  },
  {
    name: "type-only-locale-barrel",
    source: `import type { Locale } from "date-fns/locale";\n`,
  },
  {
    name: "unknown-locale-unfixable",
    // `notARealLocale` isn't in the rule's LOCALE_SUBPATHS map, so the
    // rule must report-but-skip-fix. The snapshot pins that "unfixable"
    // behaviour so a future change to the locale map (or a regression
    // that silently invents a subpath) shows up loudly.
    source: `import { notARealLocale } from "date-fns/locale";\n`,
  },
];
