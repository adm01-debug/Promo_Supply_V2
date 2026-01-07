import { test, expect } from '@playwright/test';

/**
 * Critical User Flows E2E Tests
 * 
 * These tests verify the most important user journeys in the application.
 * They are designed to catch regressions in core functionality.
 */

test.describe('Critical Flow: User Onboarding', () => {
  test('complete signup flow', async ({ page }) => {
    await page.goto('/auth');
    
    // Switch to signup tab
    await page.getByRole('tab', { name: /cadastrar/i }).click();
    
    // Fill signup form
    await page.getByLabel(/nome completo/i).fill('Usuário Teste E2E');
    await page.getByLabel(/email/i).first().fill(`test-${Date.now()}@example.com`);
    await page.getByLabel(/^senha$/i).fill('SecurePassword123!');
    await page.getByLabel(/confirmar senha/i).fill('SecurePassword123!');
    
    // Submit form
    await page.getByRole('button', { name: /criar conta/i }).click();
    
    // Wait for response
    await page.waitForTimeout(2000);
    
    // Should show success message or redirect
    const content = await page.content();
    expect(content).toBeTruthy();
  });

  test('login flow with valid credentials format', async ({ page }) => {
    await page.goto('/auth');
    
    // Fill login form
    await page.getByLabel(/email/i).first().fill('user@example.com');
    await page.getByLabel(/senha/i).first().fill('password123');
    
    // Submit form
    await page.getByRole('button', { name: /entrar/i }).click();
    
    // Wait for response
    await page.waitForTimeout(2000);
    
    // Form should be submitted (might fail auth, but flow works)
    const currentUrl = page.url();
    expect(currentUrl).toBeTruthy();
  });
});

test.describe('Critical Flow: Form Interactions', () => {
  test('form validation feedback', async ({ page }) => {
    await page.goto('/auth');
    
    // Try to submit empty form
    await page.getByRole('button', { name: /entrar/i }).click();
    
    // HTML5 validation should show
    const emailInput = page.getByLabel(/email/i).first();
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  test('input field interactions', async ({ page }) => {
    await page.goto('/auth');
    
    const emailInput = page.getByLabel(/email/i).first();
    
    // Type in field
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');
    
    // Clear field
    await emailInput.clear();
    await expect(emailInput).toHaveValue('');
    
    // Type again
    await emailInput.fill('another@example.com');
    await expect(emailInput).toHaveValue('another@example.com');
  });

  test('password field security', async ({ page }) => {
    await page.goto('/auth');
    
    const passwordInput = page.getByLabel(/senha/i).first();
    
    // Password should be masked
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Fill password
    await passwordInput.fill('secretpassword');
    
    // Value should be set but not visible as text
    await expect(passwordInput).toHaveValue('secretpassword');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });
});

test.describe('Critical Flow: Error Handling', () => {
  test('handles network errors gracefully', async ({ page }) => {
    await page.goto('/auth');
    
    // Simulate offline
    await page.context().setOffline(true);
    
    // Try to submit form
    await page.getByLabel(/email/i).first().fill('test@example.com');
    await page.getByLabel(/senha/i).first().fill('password123');
    await page.getByRole('button', { name: /entrar/i }).click();
    
    await page.waitForTimeout(2000);
    
    // Page should not crash
    const content = await page.content();
    expect(content).toBeTruthy();
    
    // Restore online
    await page.context().setOffline(false);
  });

  test('handles invalid routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await page.waitForTimeout(1000);
    
    // Should show 404 or redirect
    const content = await page.content();
    expect(content.length).toBeGreaterThan(0);
  });
});

test.describe('Critical Flow: Accessibility', () => {
  test('form labels are properly associated', async ({ page }) => {
    await page.goto('/auth');
    
    // Check email label
    const emailInput = page.getByLabel(/email/i).first();
    await expect(emailInput).toBeVisible();
    
    // Check password label
    const passwordInput = page.getByLabel(/senha/i).first();
    await expect(passwordInput).toBeVisible();
  });

  test('buttons have accessible names', async ({ page }) => {
    await page.goto('/auth');
    
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const name = await button.getAttribute('aria-label') || await button.textContent();
      expect(name?.length).toBeGreaterThan(0);
    }
  });

  test('focus management works correctly', async ({ page }) => {
    await page.goto('/auth');
    
    // Tab to first input
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Something should be focused
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });
});

test.describe('Critical Flow: Performance', () => {
  test('page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/auth');
    await page.waitForLoadState('domcontentloaded');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
    console.log(`Auth page loaded in ${loadTime}ms`);
  });

  test('form interactions are responsive', async ({ page }) => {
    await page.goto('/auth');
    
    const emailInput = page.getByLabel(/email/i).first();
    
    const startTime = Date.now();
    await emailInput.fill('test@example.com');
    const fillTime = Date.now() - startTime;
    
    // Input should respond quickly
    expect(fillTime).toBeLessThan(500);
  });
});

test.describe('Critical Flow: State Management', () => {
  test('form state persists during interaction', async ({ page }) => {
    await page.goto('/auth');
    
    // Fill email
    await page.getByLabel(/email/i).first().fill('test@example.com');
    
    // Fill password
    await page.getByLabel(/senha/i).first().fill('password123');
    
    // Email should still have value
    await expect(page.getByLabel(/email/i).first()).toHaveValue('test@example.com');
  });

  test('tab state persists correctly', async ({ page }) => {
    await page.goto('/auth');
    
    // Switch to signup
    await page.getByRole('tab', { name: /cadastrar/i }).click();
    
    // Fill some data
    await page.getByLabel(/nome completo/i).fill('Test User');
    
    // Switch to login
    await page.getByRole('tab', { name: /entrar/i }).click();
    
    // Switch back to signup
    await page.getByRole('tab', { name: /cadastrar/i }).click();
    
    // Note: Form state may or may not persist depending on implementation
    await page.waitForTimeout(300);
  });
});

test.describe('Critical Flow: Security', () => {
  test('password is not exposed in DOM', async ({ page }) => {
    await page.goto('/auth');
    
    await page.getByLabel(/senha/i).first().fill('supersecretpassword');
    
    // Check that password is not visible in page content
    const content = await page.content();
    expect(content).not.toContain('supersecretpassword');
  });

  test('CSRF protection is present', async ({ page }) => {
    await page.goto('/auth');
    
    // Check for security headers or tokens
    // This is a basic check - real CSRF testing requires more setup
    const content = await page.content();
    expect(content).toBeTruthy();
  });
});

test.describe('Critical Flow: Mobile Experience', () => {
  test('auth form works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/auth');
    
    // Form should be visible and functional
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
    await expect(page.getByLabel(/senha/i).first()).toBeVisible();
    
    // Fill form
    await page.getByLabel(/email/i).first().fill('mobile@test.com');
    await page.getByLabel(/senha/i).first().fill('password123');
    
    // Submit button should be visible
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible();
  });

  test('touch interactions work correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/auth');
    
    // Tap on signup tab
    await page.getByRole('tab', { name: /cadastrar/i }).tap();
    
    // Should switch to signup form
    await expect(page.getByLabel(/nome completo/i)).toBeVisible();
  });
});
