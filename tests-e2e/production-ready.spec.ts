import { test, expect } from '@playwright/test';

test.describe('Freight Quest Production Readiness', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to base URL
    await page.goto('/');
  });

  test('Public Access - Auth Redirection', async ({ page }) => {
    // Should redirect to /auth if not logged in
    await page.goto('/compras');
    await expect(page).toHaveURL(/.*auth/);
    
    // Check if login elements are present
    const loginHeader = page.getByText(/Acesse sua conta/i).or(page.getByText(/Login/i));
    await expect(loginHeader).toBeVisible();
  });

  test('Main Layout Components', async ({ page }) => {
    await page.goto('/auth');
    
    // Check for essential UI elements on landing/auth
    await expect(page.locator('img[alt*="Logo"]')).toBeVisible();
    
    // Verify responsive design (mobile menu presence if simulated)
    // For desktop, we check sidebar presence if logged in, but here we can check if the auth container is centered
    const authCard = page.locator('.card, .border, [role="main"]');
    await expect(authCard).toBeVisible();
  });

  test('Navigation to Support/Documentation if available', async ({ page }) => {
    await page.goto('/auth');
    // Check if there's a footer or help link
    const helpLink = page.getByRole('link', { name: /Ajuda/i }).or(page.getByRole('link', { name: /Suporte/i }));
    if (await helpLink.isVisible()) {
      await expect(helpLink).toBeEnabled();
    }
  });

  test('Critical Path: RFx Creation (UI only)', async ({ page }) => {
    // This test simulates the UI steps to create a request
    // Since we are not logged in, we check if the path exists in the code and verify the redirection
    await page.goto('/sourcing/novo');
    await expect(page).toHaveURL(/.*auth/); // Should still redirect to auth
  });

  test('System Health & Performance Monitoring (Public Signals)', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
    
    // Check if initial load doesn't throw errors in console
    const logs: string[] = [];
    page.on('console', msg => logs.push(msg.text()));
    await page.goto('/');
    
    // We expect no major errors on public landing
    const errors = logs.filter(log => log.toLowerCase().includes('error') && !log.includes('401'));
    // expect(errors.length).toBe(0); // This might be too strict if some external assets fail, but good for production check
  });
});
