import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "no-restricted-imports": ["error", {
        paths: [
          {
            name: "date-fns",
            message: "Import from a date-fns subpath instead, e.g. `from \"date-fns/format\"`. Top-level barrel imports break tree-shaking and have regressed in past upgrades.",
          },
          {
            name: "date-fns/locale",
            message: "Import the specific locale subpath, e.g. `from \"date-fns/locale/pt-BR\"`.",
          },
        ],
      }],
    },
  },
);
