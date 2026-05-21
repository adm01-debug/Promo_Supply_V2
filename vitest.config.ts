import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";


export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "eslint-rules/__tests__/**/*.test.ts",
      "scripts/**/__tests__/**/*.test.{mjs,ts}",
    ],
    testTimeout: 10_000,
    pool: 'forks',
    isolate: true,
    css: false,
    // The fix-preview reporter is silent on success; on failures of any
    // date-fns related test file it appends a unified bun.lock diff and a
    // per-package "installed → would-install" table so the developer sees
    // exactly what `rm -rf node_modules && bun install --frozen-lockfile`
    // would change BEFORE running it.
    reporters: ["default"],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/integrations/**',
        'src/vite-env.d.ts',
        'src/main.tsx',
        'src/components/ui/**',
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Edge Functions (Deno) importam zod via URL remota. No vitest (Node)
      // o loader ESM não resolve `https:`, então mapeamos para o pacote npm.
      "https://esm.sh/zod@3.22.4": "zod",
    },
  },
});
