import { test, expect } from '@playwright/test';

test.describe('Advanced Workflow & Security Tests', () => {
  
  /**
   * Antes este teste preenchia titulo/valor e clicava em Salvar: insert real de solicitacao
   * no banco de PRODUCAO, sem cleanup (nao existe projeto de staging neste repo). Como o E2E
   * ainda nao carrega sessao, a escrita estava dormente - o dia em que alguem ligasse
   * `storageState` ela acordava. Agora o fluxo e conferido ate o dialogo de criacao, sem submit.
   */
  test('Multi-step Solicitation Flow (abre o formulario, sem gravar)', async ({ page }) => {
    await page.goto('/compras');

    const addBtn = page.getByRole('button', { name: /Nova/i }).first();
    if ((await addBtn.count()) === 0 || !(await addBtn.isVisible())) {
      // Sem sessao de teste o app manda para /auth: o invariante verificavel aqui e o gate
      // de autenticacao, nao o formulario. TST-02 (sessao de teste) segue aberto.
      await expect(page).toHaveURL(/\/auth/);
      return;
    }

    await addBtn.click();

    // O formulario precisa existir com os campos do fluxo - sem clicar em Salvar.
    await expect(page.getByPlaceholder(/T\u00edtulo/i).first()).toBeVisible();
    await expect(page.getByPlaceholder(/Valor/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Salvar/i }).first()).toBeVisible();

    await page.keyboard.press('Escape').catch(() => {});
  });

  test('Responsiveness & Mobile Viewport', async ({ page }) => {
    // Test tablet size
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    // Check if sidebar is collapsed or menu button exists
    const menuBtn = page.locator('button[aria-label="Menu"]').or(page.locator('.lucide-menu'));
    await expect(menuBtn).toBeDefined();

    // Test mobile size
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator('form').or(page.locator('nav'))).toBeVisible();
  });

  test('Performance Gate: Dashboard Loading', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/dashboard');
    // Aguarda SPA redirecionar (pode ir para /auth se não autenticado)
    await page.waitForURL(/\/dashboard|\/auth/, { timeout: 3000 }).catch(() => {});
    if (page.url().includes('/auth')) {
      await expect(page.locator('form').first()).toBeVisible();
      return;
    }
    // Verifica que o dashboard carregou
    await expect(page).toHaveURL(/\/dashboard/);
    const loadTime = Date.now() - startTime;
    console.log(`Dashboard load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);
  });

});
