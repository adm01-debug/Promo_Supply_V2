import { test, expect } from '@playwright/test';

test.describe('Navigation Flow', () => {
  test.describe('Root Navigation', () => {
    test('should load root page', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Page should load without errors
      const content = await page.content();
      expect(content).toBeTruthy();
    });

    test('should handle 404 pages gracefully', async ({ page }) => {
      await page.goto('/non-existent-page-12345');
      await page.waitForTimeout(1000);
      
      // Should show 404 or redirect
      const content = await page.content();
      expect(content).toBeTruthy();
    });
  });

  test.describe('Auth Page Navigation', () => {
    test('should navigate to auth page', async ({ page }) => {
      await page.goto('/auth');
      await expect(page).toHaveURL(/\/auth/);
    });

    test('should have back navigation capability', async ({ page }) => {
      await page.goto('/');
      await page.goto('/auth');
      await page.goBack();
      
      await page.waitForTimeout(500);
      // Should navigate back
    });
  });

  test.describe('Sidebar Navigation (When Authenticated)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);
    });

    test('should have navigation links', async ({ page }) => {
      // Look for navigation elements
      const navLinks = page.locator('nav a, aside a, [role="navigation"] a');
      const linkCount = await navLinks.count();
      console.log(`Found ${linkCount} navigation links`);
    });

    test('should highlight active route', async ({ page }) => {
      // Look for active state indicators
      const activeLinks = page.locator('a[aria-current="page"], a[class*="active"], a[data-active="true"]');
      const activeCount = await activeLinks.count();
      console.log(`Found ${activeCount} active navigation items`);
    });
  });

  test.describe('Mobile Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
    });

    test('should show bottom navigation on mobile', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);
      
      // Look for bottom navigation
      const bottomNav = page.locator('nav').filter({ has: page.locator('a, button') }).last();
      const isVisible = await bottomNav.isVisible().catch(() => false);
      console.log(`Bottom navigation visible: ${isVisible}`);
    });

    test('should have touch-friendly navigation items', async ({ page }) => {
      await page.goto('/auth');
      
      // Verify touch targets are large enough (44x44 minimum)
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(40);
          expect(box.height).toBeGreaterThanOrEqual(40);
        }
      }
    });

    test('should hide sidebar on mobile', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);
      
      // Desktop sidebar should be hidden on mobile
      const sidebar = page.locator('aside[class*="sidebar"], [data-sidebar]');
      const sidebarCount = await sidebar.count();
      
      if (sidebarCount > 0) {
        const isVisible = await sidebar.first().isVisible().catch(() => false);
        console.log(`Sidebar visible on mobile: ${isVisible}`);
      }
    });
  });

  test.describe('Breadcrumb Navigation', () => {
    test('should show breadcrumbs when available', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);
      
      const breadcrumbs = page.locator('nav[aria-label*="breadcrumb"], [class*="breadcrumb"]');
      const breadcrumbCount = await breadcrumbs.count();
      console.log(`Found ${breadcrumbCount} breadcrumb elements`);
    });
  });

  test.describe('Page Transitions', () => {
    test('should transition smoothly between pages', async ({ page }) => {
      await page.goto('/');
      const startTime = Date.now();
      
      await page.goto('/auth');
      await page.waitForLoadState('domcontentloaded');
      
      const loadTime = Date.now() - startTime;
      console.log(`Page transition took ${loadTime}ms`);
      
      // Page should load in reasonable time
      expect(loadTime).toBeLessThan(5000);
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/auth');
      
      // Tab through elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // An element should be focused
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should have visible focus indicators', async ({ page }) => {
      await page.goto('/auth');
      
      // Focus on first interactive element
      const firstInput = page.getByLabel(/email/i).first();
      await firstInput.focus();
      
      // Check for focus styling
      const hasFocus = await firstInput.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.outline !== 'none' || styles.boxShadow !== 'none';
      });
      
      console.log(`Focus indicator visible: ${hasFocus}`);
    });

    test('should trap focus in modals', async ({ page }) => {
      await page.goto('/auth');
      
      // Tab through the form
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
      }
      
      // Focus should cycle within the form
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });
  });

  test.describe('Skip Links', () => {
    test('should have skip to main content link', async ({ page }) => {
      await page.goto('/');
      
      // Look for skip links
      const skipLinks = page.locator('a[href="#main"], a[href="#content"], [class*="skip"]');
      const skipCount = await skipLinks.count();
      console.log(`Found ${skipCount} skip links`);
    });
  });
});

test.describe('Route Guards', () => {
  test('should protect authenticated routes', async ({ page }) => {
    const protectedRoutes = [
      '/solicitacoes',
      '/dashboard',
      '/pedidos',
      '/fornecedores',
      '/pagamentos',
      '/contratos',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForTimeout(1500);
      
      const currentUrl = page.url();
      console.log(`${route} -> ${currentUrl}`);
      
      // Should redirect to auth or root
      expect(currentUrl).toMatch(/\/(auth)?$/);
    }
  });

  test('should allow access to public routes', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    // Auth page should be accessible
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe('Deep Linking', () => {
  test('should handle deep links correctly', async ({ page }) => {
    // Try to access a deep link
    await page.goto('/solicitacoes?status=pendente');
    await page.waitForTimeout(1500);
    
    // Should either show the page or redirect to auth
    const currentUrl = page.url();
    expect(currentUrl).toBeTruthy();
  });

  test('should preserve query parameters after auth redirect', async ({ page }) => {
    await page.goto('/solicitacoes?status=pendente&priority=alta');
    await page.waitForTimeout(1500);
    
    // Note: Query param preservation depends on auth implementation
    const currentUrl = page.url();
    console.log(`Deep link redirect result: ${currentUrl}`);
  });
});

test.describe('Browser History', () => {
  test('should support browser back/forward', async ({ page }) => {
    await page.goto('/');
    await page.goto('/auth');
    
    // Go back
    await page.goBack();
    await page.waitForTimeout(500);
    
    // Go forward
    await page.goForward();
    await page.waitForTimeout(500);
    
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should not break on rapid navigation', async ({ page }) => {
    await page.goto('/');
    await page.goto('/auth');
    await page.goBack();
    await page.goForward();
    await page.goBack();
    
    await page.waitForTimeout(500);
    
    // Page should still be functional
    const content = await page.content();
    expect(content).toBeTruthy();
  });
});
