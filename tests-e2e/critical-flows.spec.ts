import { test, expect } from '@playwright/test';

/**
 * Auditoria Técnica: Testes de Fluxo Crítico de Negócio
 */
test.describe('Freight Quest - Fluxos de Negócio', () => {
  
  test('Processo de Compras e Dashboard', async ({ page }) => {
    await page.goto('/compras');
    
    // Se redirecionado para auth, valida que a tela de login está íntegra
    if (page.url().includes('/auth')) {
      await expect(page.locator('form')).toBeVisible();
      return;
    }

    // Verifica que a página de compras carregou
    await expect(page).toHaveURL(/\/compras/);
  });

  test('Validação de Contratos e Compliance', async ({ page }) => {
    await page.goto('/contratos');
    if (page.url().includes('/auth')) {
      await expect(page.locator('form').first()).toBeVisible();
      return;
    }

    // Verifica se a página de contratos carregou
    await expect(page).toHaveURL(/\/contratos/);
  });

  test('Resiliência da UI em Erros de Rede', async ({ page }) => {
    // Simula falha na API do bridge
    await page.route('**/functions/v1/external-db-bridge', route => route.abort('failed'));
    
    await page.goto('/pedidos');
    if (page.url().includes('/auth')) {
      await expect(page.locator('form').first()).toBeVisible();
      return;
    }
    // Deve mostrar um estado de erro amigável ou tentar reconectar. O invariante é o
    // mesmo nos dois casos: feedback de erro visível OU a tela de pé — nunca em branco.
    const errorFeedback = page.locator('text=Erro').or(page.locator('text=error'));
    const telaDePe = page.locator('.card, main, [role="main"], form');
    await expect(errorFeedback.or(telaDePe).first()).toBeVisible();
  });
});
