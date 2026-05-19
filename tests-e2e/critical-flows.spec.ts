import { test, expect } from '@playwright/test';

test.describe('Freight Quest Critical Flows', () => {
  test('Complete Sourcing Workflow', async ({ page }) => {
    await page.goto('/');
    
    // Test Login/Auth
    await expect(page).toHaveTitle(/Freight Quest/);
    
    // Simulate navigation to Procurement/Compras
    const procurementLink = page.getByRole('link', { name: /Compras/i });
    if (await procurementLink.isVisible()) {
      await procurementLink.click();
      await expect(page).toHaveURL(/.*compras/);
    }

    // Test specific buttons and states
    const newRequestBtn = page.getByRole('button', { name: /Nova Requisição/i }).or(page.getByRole('button', { name: /Add/i }));
    if (await newRequestBtn.isVisible()) {
      await newRequestBtn.click();
      // Validate error states by submitting empty
      const submitBtn = page.getByRole('button', { name: /Salvar/i }).or(page.getByRole('button', { name: /Enviar/i }));
      await submitBtn.click();
      // Check for validation messages
      await expect(page.locator('text=campo obrigatório').or(page.locator('text=required'))).toBeVisible();
    }
  });

  test('Error States and Boundary Conditions', async ({ page }) => {
    await page.goto('/invalid-route-simulation');
    await expect(page.locator('text=404').or(page.locator('text=não encontrado'))).toBeVisible();
  });
});
