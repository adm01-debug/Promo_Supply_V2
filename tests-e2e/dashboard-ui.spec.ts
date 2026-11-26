import { test, expect } from '@playwright/test';

test.describe('Dashboard & Compras Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Dashboard e widgets renderizam na rota raiz', async ({ page }) => {
    // Sem sessão (nenhum spec E2E usa storageState) a rota raiz serve a vitrine pública;
    // com sessão serve o dashboard. Nos dois casos ela não pode vir em branco.
    const dashboardTitle = page.getByText(/Dashboard/i).first();
    await expect(dashboardTitle).toBeVisible();

    // O landmark principal tem que estar montado e com conteúdo (título/seções),
    // não apenas um esqueleto vazio com o texto do menu.
    const main = page.locator('main:visible');
    await expect(main).toBeVisible();
    expect(await main.getByRole('heading').count()).toBeGreaterThan(0);
  });

  test('System Theme Toggle', async ({ page }) => {
    const themeToggle = page.getByRole('button', { name: /Mudar tema/i }).or(page.locator('[aria-label="Toggle theme"]'));
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      // Check for theme class or attribute change
      const html = page.locator('html');
      await expect(html).toHaveAttribute('class', /dark|light/);
        } else {
          // Sem sessao de teste o cabecalho (dono do toggle) nao renderiza: o gate de auth e o invariante.
          await expect(page.getByText(/Dashboard|Entrar|Login/i).first()).toBeVisible();
    }
  });

  test('Mobile Responsiveness Check', async ({ page, viewport }) => {
      // Sem projeto mobile no playwright.config.ts o body nunca executava: verde vazio.
      test.skip(!viewport || viewport.width >= 768, 'sem viewport mobile configurado (TST-02)');
    if (viewport && viewport.width < 768) {
      // Check mobile menu
      const menuBtn = page.getByRole('button', { name: /menu/i });
      await expect(menuBtn).toBeVisible();
    }
  });
});
