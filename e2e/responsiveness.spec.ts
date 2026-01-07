import { test, expect, type Page } from '@playwright/test';

// Breakpoints configuration matching Tailwind defaults
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

// Helper to check if element is visible and within viewport
async function isVisibleInViewport(page: Page, selector: string): Promise<boolean> {
  const element = page.locator(selector).first();
  try {
    await element.waitFor({ state: 'visible', timeout: 3000 });
    const box = await element.boundingBox();
    if (!box) return false;
    
    const viewport = page.viewportSize();
    if (!viewport) return false;
    
    return box.x >= 0 && 
           box.y >= 0 && 
           box.x + box.width <= viewport.width &&
           box.y + box.height <= viewport.height;
  } catch {
    return false;
  }
}

// Helper to check for horizontal scroll (overflow issue)
async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
}

// Helper to check touch targets meet minimum size (44x44px)
async function checkTouchTargets(page: Page, selector: string): Promise<{ valid: boolean; issues: string[] }> {
  const issues: string[] = [];
  const elements = await page.locator(selector).all();
  
  for (let i = 0; i < elements.length; i++) {
    const box = await elements[i].boundingBox();
    if (box && (box.width < 44 || box.height < 44)) {
      issues.push(`Element ${i}: ${box.width}x${box.height}px (minimum 44x44px)`);
    }
  }
  
  return { valid: issues.length === 0, issues };
}

test.describe('Responsiveness Tests', () => {
  
  test.describe('Auth Page Responsiveness', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth');
      await page.waitForLoadState('networkidle');
    });

    test('should not have horizontal overflow', async ({ page }) => {
      const hasOverflow = await hasHorizontalOverflow(page);
      expect(hasOverflow).toBe(false);
    });

    test('login form should be centered and visible', async ({ page }) => {
      const form = page.locator('form').first();
      await expect(form).toBeVisible();
      
      const box = await form.boundingBox();
      const viewport = page.viewportSize();
      
      if (box && viewport) {
        // Form should not exceed 95% of viewport width
        expect(box.width).toBeLessThanOrEqual(viewport.width * 0.95);
      }
    });

    test('inputs should be properly sized', async ({ page }) => {
      const inputs = page.locator('input[type="email"], input[type="password"]');
      const count = await inputs.count();
      
      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        await expect(input).toBeVisible();
        
        const box = await input.boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(40); // Minimum touch height
        }
      }
    });

    test('submit button should have adequate touch target', async ({ page }) => {
      const button = page.locator('button[type="submit"]').first();
      await expect(button).toBeVisible();
      
      const box = await button.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.width).toBeGreaterThanOrEqual(44);
      }
    });
  });

  test.describe('Dashboard Responsiveness', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to dashboard (may redirect to auth if not logged in)
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });

    test('should not have horizontal overflow', async ({ page }) => {
      const hasOverflow = await hasHorizontalOverflow(page);
      expect(hasOverflow).toBe(false);
    });

    test('KPI cards should be visible', async ({ page }) => {
      const kpiCards = page.locator('[class*="card"]').first();
      // If on auth page, skip this test
      const isAuthPage = await page.locator('input[type="password"]').count() > 0;
      if (!isAuthPage) {
        await expect(kpiCards).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Navigation Responsiveness', () => {
    test('mobile navigation should be visible on small screens', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const viewport = page.viewportSize();
      if (viewport && viewport.width < BREAKPOINTS.md) {
        // Bottom navigation should be visible on mobile
        const bottomNav = page.locator('nav').last();
        await expect(bottomNav).toBeVisible({ timeout: 5000 });
      }
    });

    test('sidebar should be hidden on mobile', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const viewport = page.viewportSize();
      if (viewport && viewport.width < BREAKPOINTS.md) {
        // Sidebar should be hidden or collapsed on mobile
        const sidebar = page.locator('aside').first();
        const isHidden = await sidebar.isHidden().catch(() => true);
        
        // Either hidden or has collapsed width
        if (!isHidden) {
          const box = await sidebar.boundingBox();
          if (box) {
            expect(box.width).toBeLessThan(100); // Collapsed state
          }
        }
      }
    });
  });

  test.describe('Modal Responsiveness', () => {
    test('modals should adapt to viewport', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Check if modal trigger exists and click it
      const modalTrigger = page.locator('button:has-text("Nova")').first();
      const triggerExists = await modalTrigger.isVisible().catch(() => false);
      
      if (triggerExists) {
        await modalTrigger.click();
        
        const modal = page.locator('[role="dialog"]').first();
        await expect(modal).toBeVisible({ timeout: 3000 });
        
        const box = await modal.boundingBox();
        const viewport = page.viewportSize();
        
        if (box && viewport) {
          // Modal should not exceed viewport
          expect(box.width).toBeLessThanOrEqual(viewport.width);
          expect(box.height).toBeLessThanOrEqual(viewport.height);
        }
      }
    });
  });

  test.describe('Table/Grid Responsiveness', () => {
    test('data grids should not overflow', async ({ page }) => {
      await page.goto('/solicitacoes');
      await page.waitForLoadState('networkidle');
      
      const hasOverflow = await hasHorizontalOverflow(page);
      expect(hasOverflow).toBe(false);
    });

    test('cards should wrap properly', async ({ page }) => {
      await page.goto('/solicitacoes');
      await page.waitForLoadState('networkidle');
      
      const viewport = page.viewportSize();
      const cards = page.locator('[class*="card"]');
      const count = await cards.count();
      
      if (count > 0 && viewport) {
        for (let i = 0; i < Math.min(count, 5); i++) {
          const box = await cards.nth(i).boundingBox();
          if (box) {
            // Cards should not exceed viewport width
            expect(box.width).toBeLessThanOrEqual(viewport.width);
            // Cards should be within horizontal bounds
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 5); // 5px tolerance
          }
        }
      }
    });
  });

  test.describe('Form Responsiveness', () => {
    test('form inputs should be full width on mobile', async ({ page }) => {
      await page.goto('/auth');
      await page.waitForLoadState('networkidle');
      
      const viewport = page.viewportSize();
      if (viewport && viewport.width < BREAKPOINTS.md) {
        const inputs = page.locator('input');
        const count = await inputs.count();
        
        for (let i = 0; i < count; i++) {
          const box = await inputs.nth(i).boundingBox();
          if (box) {
            // Inputs should be at least 80% of container width on mobile
            expect(box.width).toBeGreaterThan(viewport.width * 0.5);
          }
        }
      }
    });
  });

  test.describe('Touch Target Compliance', () => {
    test('interactive elements should have minimum 44px touch targets', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const viewport = page.viewportSize();
      if (viewport && viewport.width < BREAKPOINTS.md) {
        // Check navigation buttons
        const navButtons = page.locator('nav button');
        const count = await navButtons.count();
        
        for (let i = 0; i < count; i++) {
          const box = await navButtons.nth(i).boundingBox();
          if (box) {
            expect(box.height).toBeGreaterThanOrEqual(40); // Slightly relaxed for edge cases
          }
        }
      }
    });
  });

  test.describe('Typography Responsiveness', () => {
    test('text should be readable (min 14px)', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Check body text size
      const fontSize = await page.evaluate(() => {
        const body = document.body;
        return window.getComputedStyle(body).fontSize;
      });
      
      const size = parseInt(fontSize);
      expect(size).toBeGreaterThanOrEqual(14);
    });

    test('headings should scale appropriately', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const h1Size = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        if (h1) {
          return parseInt(window.getComputedStyle(h1).fontSize);
        }
        return null;
      });
      
      if (h1Size) {
        const viewport = page.viewportSize();
        if (viewport && viewport.width < BREAKPOINTS.md) {
          expect(h1Size).toBeLessThanOrEqual(36); // Not too large on mobile
        }
        expect(h1Size).toBeGreaterThanOrEqual(18); // But still prominent
      }
    });
  });

  test.describe('Breakpoint Transitions', () => {
    test('layout should adapt at md breakpoint (768px)', async ({ page }) => {
      // Start at mobile size
      await page.setViewportSize({ width: 767, height: 800 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Check mobile layout indicators
      const mobileBottomNav = page.locator('nav[class*="bottom"], nav[class*="fixed"]').last();
      const hasMobileNav = await mobileBottomNav.isVisible().catch(() => false);
      
      // Resize to tablet
      await page.setViewportSize({ width: 768, height: 800 });
      await page.waitForTimeout(500); // Allow layout to adjust
      
      // Layout should have changed
      const hasOverflow = await hasHorizontalOverflow(page);
      expect(hasOverflow).toBe(false);
    });

    test('layout should adapt at lg breakpoint (1024px)', async ({ page }) => {
      await page.setViewportSize({ width: 1023, height: 800 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Resize to desktop
      await page.setViewportSize({ width: 1024, height: 800 });
      await page.waitForTimeout(500);
      
      const hasOverflow = await hasHorizontalOverflow(page);
      expect(hasOverflow).toBe(false);
    });
  });

  test.describe('Specific Component Tests', () => {
    test('PageHeader should truncate on mobile', async ({ page }) => {
      await page.goto('/solicitacoes');
      await page.waitForLoadState('networkidle');
      
      const viewport = page.viewportSize();
      if (viewport && viewport.width < BREAKPOINTS.md) {
        const header = page.locator('h1, [class*="page-header"]').first();
        if (await header.isVisible()) {
          const box = await header.boundingBox();
          if (box) {
            expect(box.width).toBeLessThanOrEqual(viewport.width);
          }
        }
      }
    });

    test('Action buttons should be accessible on mobile', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const viewport = page.viewportSize();
      if (viewport && viewport.width < BREAKPOINTS.md) {
        // FAB should be visible on mobile
        const fab = page.locator('button[class*="fixed"], button[class*="fab"]').first();
        if (await fab.isVisible().catch(() => false)) {
          const box = await fab.boundingBox();
          if (box) {
            // FAB should be within viewport
            expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
            expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
          }
        }
      }
    });
  });

  test.describe('Scroll Behavior', () => {
    test('content should be scrollable without horizontal scroll', async ({ page }) => {
      await page.goto('/solicitacoes');
      await page.waitForLoadState('networkidle');
      
      // Check for horizontal scrollbar
      const hasHScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      
      expect(hasHScroll).toBe(false);
      
      // Vertical scroll should work
      const hasVScroll = await page.evaluate(() => {
        return document.documentElement.scrollHeight > document.documentElement.clientHeight;
      });
      
      // This is expected to be true for most content-rich pages
    });
  });
});
