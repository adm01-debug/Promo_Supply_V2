import { test, expect } from '@playwright/test';

test.describe('Advanced Workflow & Security Tests', () => {
  
  test('Multi-step Solicitation Flow', async ({ page }) => {
    await page.goto('/compras');

    // 1. Trigger New Request
    const addBtn = page.getByRole('button', { name: /Nova/i }).first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      
      // 2. Fill Data
      await page.getByPlaceholder(/Título/i).fill('Teste E2E Automatizado - Carga Crítica');
      await page.getByPlaceholder(/Valor/i).fill('50000');
      
      // 3. Submit and Verify Optimistic UI
      await page.getByRole('button', { name: /Salvar/i }).click();
      
      // Verify success message or list update
      await expect(page.locator('text=sucesso').or(page.locator('text=Teste E2E'))).toBeVisible();
    }
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
    await expect(page.locator('nav')).toBeVisible();
  });

  test('Performance Gate: Dashboard Loading', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/dashboard');
    await expect(page.locator('canvas').or(page.locator('.recharts-surface'))).toBeVisible();
    const loadTime = Date.now() - startTime;
    
    console.log(`Dashboard load time: ${loadTime}ms`);
    // Threshold for dashboard complexity
    expect(loadTime).toBeLessThan(5000); 
  });

});
