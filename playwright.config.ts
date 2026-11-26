import { defineConfig } from '@playwright/test';

// Sem `globalSetup` (etapa 280): tests-e2e/global-setup.ts faz login real contra o
// projeto de producao, grava tests-e2e/.auth-state.json e NENHUM spec consome esse
// arquivo — nenhum spec importa ../fixtures e nao ha `use.storageState` aqui. O unico
// efeito era autenticar em producao a cada PR/push e engolir a falha num catch.
// O setup e a fixture ficam no repo para quando houver um projeto de teste que nao
// seja producao; aí a sessao pode ser ligada de proposito.
export default defineConfig({
  testDir: './tests-e2e',
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
  ],
});
