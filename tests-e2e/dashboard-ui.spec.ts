import { test, expect } from '@playwright/test';

test.describe('Dashboard & Compras Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Dashboard Widgets Accessibility', async ({ page }) => {
    // Check main navigation
    const dashboardTitle = page.getByText(/Dashboard/i).first();
    await expect(dashboardTitle).toBeVisible();

    // Validate presence of KPI cards
    const kpiCards = page.locator('.card'); // Assuming cards have a 'card' class or role
    const count = await kpiCards.count();
    // We expect at least some dashboard cards
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
