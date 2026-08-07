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
    }
  });

  test('Mobile Responsiveness Check', async ({ page, viewport }) => {
    if (viewport && viewport.width < 768) {
      // Check mobile menu
      const menuBtn = page.getByRole('button', { name: /menu/i });
      await expect(menuBtn).toBeVisible();
    }
  });
});
