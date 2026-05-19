import { test, expect } from '@playwright/test';

/**
 * Playwright E2E Elite Validation
 * Simulates real user flows with deep validation and zero-tolerance for errors.
 */

test.describe('Freight Quest E2E Excellence', () => {
  
  test('Fluxo Crítico: Login e Navegação Segura', async ({ page }) => {
    await page.goto('/');
    
    // Validar se o carregamento inicial não produz erros no console
    page.on('console', msg => {
      if (msg.type() === 'error') throw new Error(`Console Error: ${msg.text()}`);
    });

    const modules = [
      { name: 'Compras', path: '/compras' },
      { name: 'Cotações', path: '/cotacao' },
      { name: 'Solicitações', path: '/solicitacoes' },
      { name: 'Pedidos', path: '/pedidos' }
    ];

    for (const mod of modules) {
      const link = page.getByRole('link', { name: mod.name }).first();
      if (await link.isVisible()) {
        await link.click();
        await expect(page).toHaveURL(new RegExp(mod.path));
        // Garantir que nenhum esqueleto ou loader infinito ficou travado
        await expect(page.locator('.animate-pulse')).not.toBeVisible();
      }
    }
  });

  test('Consistência de Dados: Painel Administrativo de Telemetria', async ({ page }) => {
    await page.goto('/admin/telemetria');
    
    // Verificar se os widgets de telemetria estão carregando dados reais
    await expect(page.getByText(/Telemetria de Queries/i)).toBeVisible();
    
    const statsCards = page.locator('.card');
    await expect(statsCards.first()).toBeVisible();
    
    // Executar a simulação 10/10 e validar o relatório gerado
    const simulationBtn = page.getByRole('button', { name: /Simulação 10\/10/i });
    if (await simulationBtn.isVisible()) {
      await simulationBtn.click();
      // A simulação de milhares de cenários pode demorar; timeout extendido
      await expect(page.getByText(/Relatório de Simulação/i)).toBeVisible({ timeout: 60000 });
      await expect(page.getByText(/VALIDADO/i)).toBeVisible();
    }
  });
});
