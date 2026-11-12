import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Testes rodam no fuso dos usuários (Brasil). Em UTC (CI) bugs de data sem hora
// ficavam invisíveis: "2024-06-15" exibido como 14/06 e "hoje" recusado no prazo
// de entrega. Fixar aqui torna o resultado igual em qualquer máquina e na CI.
// Workers herdam o ambiente, então todo arquivo de teste vê este fuso.
process.env.TZ = "America/Sao_Paulo";


export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
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
      // Redirect Deno-style HTTPS zod import used in edge function shared contracts
      "https://esm.sh/zod@3.22.4": path.resolve(__dirname, "node_modules/zod/lib/index.mjs"),
    },
  },
});
