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
const LOCALE_SUBPATHS = {
  ptBR: "pt-BR",
  enUS: "en-US",
  enGB: "en-GB",
  es: "es",
  fr: "fr",
  de: "de",
  it: "it",
  ja: "ja",
  zhCN: "zh-CN",
  ko: "ko",
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
