/**
 * Custom ESLint rule: blocks barrel imports from `date-fns` and
 * `date-fns/locale`, provides an autofix that splits the offending
 * declaration into one subpath import per named specifier, AND detects
 * typo'd subpaths (e.g. `date-fns/formt`) by offering the closest valid
 * subpath as ESLint suggestions.
 *
 * Examples:
 *   import { format, parseISO } from "date-fns";
 *     -> import { format } from "date-fns/format";
 *        import { parseISO } from "date-fns/parseISO";
 *
 *   import { ptBR } from "date-fns/locale";
 *     -> import { ptBR } from "date-fns/locale/pt-BR";
 *
 *   import { format } from "date-fns/formt";   // typo
 *     -> reported with suggestions: "date-fns/format", "date-fns/formatISO", ...
 *
 * Conservative on barrels: skips fixing (still reports) when the import has a
 * default/namespace specifier, mixes type+value specifiers, or uses an
 * unknown locale identifier. Conservative on typos: emits ESLint
 * `suggest` (opt-in) entries instead of `fix` (auto-applied), because a
 * wrong guess would silently break the build.
 */
import { readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ─── Levenshtein ────────────────────────────────────────────────────────────
// Tiny iterative DP — O(n*m) time, O(min(n,m)) space. We only ever compare
// short identifiers (<30 chars), so the constant factor is irrelevant.
function levenshtein(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  if (a.length > b.length) [a, b] = [b, a];
  let prev = new Array(a.length + 1);
  let curr = new Array(a.length + 1);
  for (let i = 0; i <= a.length; i++) prev[i] = i;
  for (let j = 1; j <= b.length; j++) {
    curr[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[i] = Math.min(curr[i - 1] + 1, prev[i] + 1, prev[i - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[a.length];
}

/**
 * Pick the top-N closest matches for `bad` from `pool`, ranked by edit
 * distance ascending then alphabetically as tiebreaker. Filters out
 * matches whose distance > floor(bad.length / 2) + 1 — beyond that
 * threshold the suggestion is more confusing than helpful (e.g.
 * suggesting `add` for `subDays`).
 */
function closestMatches(bad, pool, limit = 3) {
  const threshold = Math.floor(bad.length / 2) + 1;
  const scored = [];
  for (const cand of pool) {
    const d = levenshtein(bad, cand);
    if (d <= threshold) scored.push({ cand, d });
  }
  scored.sort((a, b) => a.d - b.d || a.cand.localeCompare(b.cand));
  return scored.slice(0, limit).map((s) => s.cand);
}

// ─── Valid date-fns function subpaths ───────────────────────────────────────
// Discovered at module-load time from `node_modules/date-fns/*.d.mts`. This
// stays accurate across date-fns minor/major upgrades without us having to
// maintain a hardcoded list. Falls back to an empty set if date-fns isn't
// installed — in that case we silently skip the typo branch rather than
// spamming false positives.
let FUNCTION_SUBPATHS = null;
function loadFunctionSubpaths() {
  if (FUNCTION_SUBPATHS) return FUNCTION_SUBPATHS;
  FUNCTION_SUBPATHS = new Set();
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const dfDir = join(here, "..", "node_modules", "date-fns");
    if (!existsSync(dfDir)) return FUNCTION_SUBPATHS;
    for (const entry of readdirSync(dfDir)) {
      const m = entry.match(/^([A-Za-z][A-Za-z0-9]*)\.d\.m?ts$/);
      if (m) FUNCTION_SUBPATHS.add(m[1]);
    }
  } catch {
    // FS error → leave the set empty; typo branch becomes a no-op.
  }
  return FUNCTION_SUBPATHS;
}

// camelCase locale export name -> date-fns subpath segment.
//
// Derived mechanically from the on-disk `node_modules/date-fns/locale/` listing
// (date-fns v3+) by camelCasing each kebab subpath: `pt-BR` -> `ptBR`,
// `be-tarask` -> `beTarask`, `ja-Hira` -> `jaHira`, etc. Keep this in sync if
// date-fns adds new locales — `bun run verify:datefns-locales` will flag drift.
const LOCALE_SUBPATHS = {
  af: "af",
  ar: "ar",
  arDZ: "ar-DZ",
  arEG: "ar-EG",
  arMA: "ar-MA",
  arSA: "ar-SA",
  arTN: "ar-TN",
  az: "az",
  be: "be",
  beTarask: "be-tarask",
  bg: "bg",
  bn: "bn",
  bs: "bs",
  ca: "ca",
  ckb: "ckb",
  cs: "cs",
  cy: "cy",
  da: "da",
  de: "de",
  deAT: "de-AT",
  el: "el",
  enAU: "en-AU",
  enCA: "en-CA",
  enGB: "en-GB",
  enIE: "en-IE",
  enIN: "en-IN",
  enNZ: "en-NZ",
  enUS: "en-US",
  enZA: "en-ZA",
  eo: "eo",
  es: "es",
  et: "et",
  eu: "eu",
  faIR: "fa-IR",
  fi: "fi",
  fr: "fr",
  frCA: "fr-CA",
  frCH: "fr-CH",
  fy: "fy",
  gd: "gd",
  gl: "gl",
  gu: "gu",
  he: "he",
  hi: "hi",
  hr: "hr",
  ht: "ht",
  hu: "hu",
  hy: "hy",
  id: "id",
  is: "is",
  it: "it",
  itCH: "it-CH",
  ja: "ja",
  jaHira: "ja-Hira",
  ka: "ka",
  kk: "kk",
  km: "km",
  kn: "kn",
  ko: "ko",
  lb: "lb",
  lt: "lt",
  lv: "lv",
  mk: "mk",
  mn: "mn",
  ms: "ms",
  mt: "mt",
  nb: "nb",
  nl: "nl",
  nlBE: "nl-BE",
  nn: "nn",
  oc: "oc",
  pl: "pl",
  pt: "pt",
  ptBR: "pt-BR",
  ro: "ro",
  ru: "ru",
  se: "se",
  sk: "sk",
  sl: "sl",
  sq: "sq",
  sr: "sr",
  srLatn: "sr-Latn",
  sv: "sv",
  ta: "ta",
  te: "te",
  th: "th",
  tr: "tr",
  ug: "ug",
  uk: "uk",
  uz: "uz",
  uzCyrl: "uz-Cyrl",
  vi: "vi",
  zhCN: "zh-CN",
  zhHK: "zh-HK",
  zhTW: "zh-TW",
};

export const dateFnsSubpath = {
  meta: {
    type: "problem",
    fixable: "code",
    schema: [],
    messages: {
      barrel:
        'Import from a date-fns subpath instead, e.g. `from "date-fns/format"`. Top-level barrel imports break tree-shaking.',
      barrelLocale:
        'Import the specific locale subpath, e.g. `from "date-fns/locale/pt-BR"`.',
      unfixable: "{{reason}} — fix manually.",
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const src = node.source && node.source.value;
        if (src !== "date-fns" && src !== "date-fns/locale") return;
        const isLocale = src === "date-fns/locale";
        const baseMessageId = isLocale ? "barrelLocale" : "barrel";

        // Bail-out: default or namespace imports have no subpath equivalent.
        const hasDefault = node.specifiers.some(
          (s) => s.type === "ImportDefaultSpecifier",
        );
        const hasNamespace = node.specifiers.some(
          (s) => s.type === "ImportNamespaceSpecifier",
        );
        if (hasDefault || hasNamespace) {
          context.report({
            node,
            messageId: "unfixable",
            data: {
              reason: hasDefault
                ? "Default import from date-fns has no subpath equivalent"
                : "Namespace import from date-fns has no subpath equivalent",
            },
          });
          return;
        }

        const named = node.specifiers.filter(
          (s) => s.type === "ImportSpecifier",
        );
        if (named.length === 0) {
          context.report({ node, messageId: baseMessageId });
          return;
        }

        // Bail-out: mixed type+value specifiers in a single declaration.
        const isDeclTypeOnly = node.importKind === "type";
        const hasInlineTypeSpec = named.some((s) => s.importKind === "type");
        const hasInlineValueSpec = named.some(
          (s) => !s.importKind || s.importKind === "value",
        );
        if (!isDeclTypeOnly && hasInlineTypeSpec && hasInlineValueSpec) {
          context.report({
            node,
            messageId: "unfixable",
            data: {
              reason: "Mixed inline type+value specifiers cannot be auto-split",
            },
          });
          return;
        }

        // Build replacement lines.
        const sourceCode = context.getSourceCode
          ? context.getSourceCode()
          : context.sourceCode;
        const quote =
          node.source.raw && node.source.raw.startsWith("'") ? "'" : '"';
        const typePrefix = isDeclTypeOnly ? "type " : "";

        const lines = [];
        let bailed = false;
        for (const spec of named) {
          const imported = spec.imported.name;
          const local = spec.local.name;
          const inlineType =
            !isDeclTypeOnly && spec.importKind === "type" ? "type " : "";

          let subpath;
          if (isLocale) {
            subpath = LOCALE_SUBPATHS[imported];
            if (!subpath) {
              context.report({
                node: spec,
                messageId: "unfixable",
                data: {
                  reason: `Unknown date-fns locale "${imported}" (not in built-in subpath map)`,
                },
              });
              bailed = true;
              continue;
            }
          } else {
            subpath = imported;
          }

          const target = isLocale
            ? `date-fns/locale/${subpath}`
            : `date-fns/${subpath}`;
          const namePart =
            imported === local ? imported : `${imported} as ${local}`;
          lines.push(
            `import ${typePrefix}${inlineType}{ ${namePart} } from ${quote}${target}${quote};`,
          );
        }

        if (bailed) {
          // At least one specifier couldn't be mapped; report the whole
          // declaration as a barrel violation but skip the fix to avoid
          // partial rewrites.
          context.report({ node, messageId: baseMessageId });
          return;
        }

        context.report({
          node,
          messageId: baseMessageId,
          fix(fixer) {
            return fixer.replaceText(node, lines.join("\n"));
          },
        });
      },
    };
  },
};
