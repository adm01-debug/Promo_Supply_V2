/**
 * Configuração dedicada dos testes de RLS — roda em Node (não jsdom) e sem
 * setup de React, porque atinge o Supabase real via HTTP.
 *
 * Rodar: `bunx vitest run --config vitest.rls.config.ts`
 */
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests-rls/**/*.test.ts"],
    testTimeout: 20_000,
    hookTimeout: 20_000,
    pool: "forks",
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
