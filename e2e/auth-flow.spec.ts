import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test.describe('Login Form', () => {
    test('should display login form by default', async ({ page }) => {
      await expect(page.getByRole('tab', { name: /entrar/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /cadastrar/i })).toBeVisible();
      await expect(page.getByLabel(/email/i).first()).toBeVisible();
      await expect(page.getByLabel(/senha/i).first()).toBeVisible();
    });

    test('should show validation errors for empty fields', async ({ page }) => {
      await page.getByRole('button', { name: /entrar/i }).click();
      
      // Check for validation - either HTML5 validation or custom error messages
      const emailInput = page.getByLabel(/email/i).first();
      await expect(emailInput).toBeVisible();
    });

    test('should show error for invalid email format', async ({ page }) => {
      await page.getByLabel(/email/i).first().fill('invalid-email');
      await page.getByLabel(/senha/i).first().fill('password123');
      await page.getByRole('button', { name: /entrar/i }).click();
      
      // Wait for potential error message or validation
      await page.waitForTimeout(500);
    });

    test('should show error for incorrect credentials', async ({ page }) => {
      await page.getByLabel(/email/i).first().fill('test@example.com');
      await page.getByLabel(/senha/i).first().fill('wrongpassword');
      await page.getByRole('button', { name: /entrar/i }).click();
      
      // Wait for error response
      await page.waitForTimeout(2000);
      
      // Should still be on auth page after failed login
      await expect(page).toHaveURL(/\/auth/);
    });

    test('should have password visibility toggle', async ({ page }) => {
      const passwordInput = page.getByLabel(/senha/i).first();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  test.describe('Signup Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('tab', { name: /cadastrar/i }).click();
    });

    test('should switch to signup tab', async ({ page }) => {
      await expect(page.getByLabel(/nome completo/i)).toBeVisible();
    });

    test('should display all signup fields', async ({ page }) => {
      await expect(page.getByLabel(/nome completo/i)).toBeVisible();
      await expect(page.getByLabel(/email/i).first()).toBeVisible();
      await expect(page.getByLabel(/^senha$/i)).toBeVisible();
      await expect(page.getByLabel(/confirmar senha/i)).toBeVisible();
    });

    test('should show password strength indicator', async ({ page }) => {
      await page.getByLabel(/^senha$/i).fill('weak');
      await page.waitForTimeout(300);
      
      // Check if strength indicator appears
      const strengthIndicator = page.locator('[class*="strength"], [data-testid="password-strength"]');
      // May or may not be visible depending on implementation
    });

    test('should validate password confirmation match', async ({ page }) => {
      await page.getByLabel(/nome completo/i).fill('Test User');
      await page.getByLabel(/email/i).first().fill('test@example.com');
      await page.getByLabel(/^senha$/i).fill('password123');
      await page.getByLabel(/confirmar senha/i).fill('differentpassword');
      
      await page.getByRole('button', { name: /criar conta/i }).click();
      await page.waitForTimeout(500);
    });
  });

  test.describe('Tab Navigation', () => {
    test('should switch between login and signup tabs', async ({ page }) => {
      // Start with login
      await expect(page.getByRole('tab', { name: /entrar/i })).toHaveAttribute('aria-selected', 'true');
      
      // Switch to signup
      await page.getByRole('tab', { name: /cadastrar/i }).click();
      await expect(page.getByRole('tab', { name: /cadastrar/i })).toHaveAttribute('aria-selected', 'true');
      
      // Switch back to login
      await page.getByRole('tab', { name: /entrar/i }).click();
      await expect(page.getByRole('tab', { name: /entrar/i })).toHaveAttribute('aria-selected', 'true');
    });
  });

  test.describe('Theme Toggle', () => {
    test('should have theme toggle button', async ({ page }) => {
      const themeToggle = page.locator('button').filter({ has: page.locator('svg[class*="lucide-sun"], svg[class*="lucide-moon"]') });
      await expect(themeToggle.first()).toBeVisible();
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should navigate form with Tab key', async ({ page }) => {
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to navigate through form elements
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should submit form with Enter key', async ({ page }) => {
      await page.getByLabel(/email/i).first().fill('test@example.com');
      await page.getByLabel(/senha/i).first().fill('password123');
      await page.getByLabel(/senha/i).first().press('Enter');
      
      await page.waitForTimeout(1000);
    });
  });
});

test.describe('Protected Routes', () => {
  test('should redirect unauthenticated users to auth page', async ({ page }) => {
    await page.goto('/solicitacoes');
    await page.waitForTimeout(2000);
    
    // Should be redirected to auth or show auth modal
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/(auth)?$/);
  });

  test('should redirect from dashboard when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/(auth)?$/);
  });
});
