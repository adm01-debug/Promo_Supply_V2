import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import importPlugin from "eslint-plugin-import";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: "./tsconfig.app.json",
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "dot-notation": "off",
      "@typescript-eslint/dot-notation": ["error", { allowIndexSignaturePropertyAccess: true }],
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
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: {
      import: importPlugin,
    },
    settings: {
      "import/resolver": {
        typescript: {
          project: "./tsconfig.app.json",
          alwaysTryTypes: true,
          cache: true,
          cacheDuration: 30000,
        },
        node: true,
      },
    },
    rules: {
      "import/no-unresolved": "error",
      "import/named": "error",
    },
  },
);
