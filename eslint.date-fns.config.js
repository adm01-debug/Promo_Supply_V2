// Focused ESLint config used ONLY by the `lint:date-fns` and
// `lint:date-fns:fix` scripts and CI gates. Enforces a single custom rule
// that blocks `date-fns` / `date-fns/locale` barrel imports AND provides an
// autofix that splits them into per-subpath imports.
import tseslint from "typescript-eslint";
import { dateFnsSubpath } from "./eslint-rules/date-fns-subpath.js";

export default tseslint.config({
  files: ["**/*.{ts,tsx,js,jsx}"],
  ignores: [
    "dist/**",
    "node_modules/**",
    "supabase/functions/**",
    "eslint-rules/**",
  ],
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaVersion: 2020, sourceType: "module" },
  },
  // Register the @typescript-eslint plugin so existing inline
  // `eslint-disable @typescript-eslint/...` directives in source files
  // resolve cleanly. We do NOT enable any of its rules — this gate is
  // exclusively for date-fns barrel imports.
  plugins: {
    "@typescript-eslint": tseslint.plugin,
    local: { rules: { "date-fns-subpath": dateFnsSubpath } },
  },
  linterOptions: {
    // Don't fail the gate on stale `eslint-disable` directives — those are
    // a concern for the broader `lint` script, not this surgical check.
    reportUnusedDisableDirectives: "off",
  },
  rules: {
    "local/date-fns-subpath": "error",
  },
});
