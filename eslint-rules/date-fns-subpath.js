/**
 * Custom ESLint rule: blocks barrel imports from `date-fns` and
 * `date-fns/locale`, and provides an autofix that splits the offending
 * declaration into one subpath import per named specifier.
 *
 * Examples:
 *   import { format, parseISO } from "date-fns";
 *     -> import { format } from "date-fns/format";
 *        import { parseISO } from "date-fns/parseISO";
 *
 *   import { ptBR } from "date-fns/locale";
 *     -> import { ptBR } from "date-fns/locale/pt-BR";
 *
 * Conservative: skips fixing (still reports) when the import has a
 * default/namespace specifier, mixes type+value specifiers, or uses an
 * unknown locale identifier.
 */

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
