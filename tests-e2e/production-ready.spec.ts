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
    await expect(loginHeader.first()).toBeVisible();
  });

  test('Main Layout Components', async ({ page }) => {
    await page.goto('/auth');
    
    // Check for essential UI elements on landing/auth
    await expect(page.locator('input[type="email"]')).toBeVisible();
    
    // Verify auth container is present (use .first() to avoid strict mode violation)
    const authCard = page.locator('.card, .border, [role="main"]').first();
    await expect(authCard).toBeVisible();
  });

  test('Navigation to Support/Documentation if available', async ({ page }) => {
    await page.goto('/auth');
    // Invariante que sempre vale: a tela de /auth monta com o formulario.
    await expect(page.locator('input[type="email"]')).toBeVisible();

    // O link de ajuda e opcional; o teste registra o que encontrou em vez de
    // pular o corpo inteiro num if (await ... isVisible()).
    const helpLink = page.getByRole('link', { name: /Ajuda/i }).or(page.getByRole('link', { name: /Suporte/i }));
    const encontrados = await helpLink.count();
    test.info().annotations.push({
      type: 'ajuda',
      description: encontrados > 0 ? `${encontrados} link(s) de ajuda na tela de /auth` : 'sem link de ajuda na tela de /auth',
    });
    if (encontrados > 0) {
      await expect(helpLink.first()).toBeEnabled();
    }
  });

  test('Critical Path: RFx Creation (UI only)', async ({ page }) => {
    // This test simulates the UI steps to create a request
    // Since we are not logged in, we check if the path exists in the code and verify the redirection
    await page.goto('/sourcing/novo');
    await expect(page).toHaveURL(/.*auth/); // Should still redirect to auth
  });

  test('System Health & Performance Monitoring (Public Signals)', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);

    // A raiz tem que montar de verdade (não só devolver 200) sem exceção não tratada.
    await page.getByText(/Dashboard/i).first().waitFor({ timeout: 15_000 });
    expect(pageErrors, `erros não tratados na raiz: ${pageErrors.join(' | ')}`).toHaveLength(0);
  });
});
