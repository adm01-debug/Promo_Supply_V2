// Focused ESLint config used ONLY by the `lint:date-fns` script and CI gates.
// Enforces the no-restricted-imports rule for date-fns barrel imports and
// nothing else, so unrelated lint debt cannot mask (or be masked by) this
// regression-blocking check.
import tseslint from "typescript-eslint";

export default tseslint.config({
  files: ["**/*.{ts,tsx,js,jsx}"],
  ignores: ["dist/**", "node_modules/**", "supabase/functions/**"],
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaVersion: 2020, sourceType: "module" },
  },
  rules: {
    "no-restricted-imports": ["error", {
      paths: [
        {
          name: "date-fns",
          message: "Import from a date-fns subpath instead, e.g. `from \"date-fns/format\"`. Top-level barrel imports break tree-shaking.",
        },
        {
          name: "date-fns/locale",
          message: "Import the specific locale subpath, e.g. `from \"date-fns/locale/pt-BR\"`.",
        },
      ],
    }],
  },
});
