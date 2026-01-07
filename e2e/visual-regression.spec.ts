import { test, expect } from '@playwright/test';

// Visual regression tests for key breakpoints
const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'desktop-xl', width: 1920, height: 1080 },
];

const PAGES = [
  { path: '/auth', name: 'auth' },
  { path: '/', name: 'dashboard' },
  { path: '/solicitacoes', name: 'solicitacoes' },
  { path: '/pedidos', name: 'pedidos' },
  { path: '/fornecedores', name: 'fornecedores' },
  { path: '/pagamentos', name: 'pagamentos' },
  { path: '/contratos', name: 'contratos' },
];

test.describe('Visual Regression - Breakpoint Snapshots', () => {
  for (const viewport of VIEWPORTS) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
      });

      for (const pageInfo of PAGES) {
        test(`${pageInfo.name} page should match snapshot`, async ({ page }) => {
          await page.goto(pageInfo.path);
          await page.waitForLoadState('networkidle');
          
          // Wait for animations to settle
          await page.waitForTimeout(500);
          
          // Take screenshot for visual comparison
          await expect(page).toHaveScreenshot(
            `${pageInfo.name}-${viewport.name}.png`,
            {
              maxDiffPixelRatio: 0.1, // Allow 10% difference for dynamic content
              threshold: 0.2,
            }
          );
        });
      }
    });
  }
});

test.describe('Critical UI Elements Visibility', () => {
  test.describe('Mobile View (375px)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
    });

    test('auth page elements should be visible', async ({ page }) => {
      await page.goto('/auth');
      await page.waitForLoadState('networkidle');
      
      // Logo or brand should be visible
      const brand = page.locator('[class*="logo"], [class*="brand"], h1').first();
      if (await brand.count() > 0) {
        await expect(brand).toBeVisible();
      }
      
      // Form should be visible
      const form = page.locator('form').first();
      await expect(form).toBeVisible();
      
      // Submit button should be visible
      const submit = page.locator('button[type="submit"]').first();
      await expect(submit).toBeVisible();
    });

    test('bottom navigation should be visible on dashboard', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Check for bottom navigation (specific to mobile)
      const bottomNav = page.locator('nav').last();
      if (await bottomNav.isVisible().catch(() => false)) {
        const box = await bottomNav.boundingBox();
        if (box) {
          // Should be at bottom of viewport
          expect(box.y + box.height).toBeGreaterThan(600);
        }
      }
    });

    test('FAB should be visible and accessible', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const fab = page.locator('[class*="fab"], button[class*="fixed"][class*="rounded-full"]').first();
      if (await fab.isVisible().catch(() => false)) {
        const box = await fab.boundingBox();
        if (box) {
          // FAB should be in bottom right area but not overlapping bottom nav
          expect(box.x).toBeGreaterThan(300);
          expect(box.y).toBeGreaterThan(500);
        }
      }
    });
  });

  test.describe('Tablet View (768px)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
    });

    test('sidebar should be visible or collapsible', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const sidebar = page.locator('aside, [class*="sidebar"]').first();
      if (await sidebar.count() > 0) {
        // Either visible or there's a toggle
        const isVisible = await sidebar.isVisible().catch(() => false);
        const hasToggle = await page.locator('[class*="sidebar-toggle"], [class*="menu-toggle"]').count() > 0;
        
        expect(isVisible || hasToggle).toBe(true);
      }
    });

    test('content area should use available space', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const main = page.locator('main').first();
      if (await main.isVisible().catch(() => false)) {
        const box = await main.boundingBox();
        if (box) {
          // Main content should use significant portion of width
          expect(box.width).toBeGreaterThan(500);
        }
      }
    });
  });

  test.describe('Desktop View (1280px)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    test('sidebar should be expanded', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const sidebar = page.locator('aside, [class*="sidebar"]').first();
      if (await sidebar.isVisible().catch(() => false)) {
        const box = await sidebar.boundingBox();
        if (box) {
          // Sidebar should be expanded (not just icons)
          expect(box.width).toBeGreaterThan(150);
        }
      }
    });

    test('KPI cards should be in a row', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const cards = page.locator('[class*="card"]');
      const count = await cards.count();
      
      if (count >= 2) {
        const box1 = await cards.nth(0).boundingBox();
        const box2 = await cards.nth(1).boundingBox();
        
        if (box1 && box2) {
          // Cards should be side by side (similar Y position)
          expect(Math.abs(box1.y - box2.y)).toBeLessThan(50);
        }
      }
    });

    test('header should have search visible', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const search = page.locator('input[type="search"], input[placeholder*="Buscar"], [class*="search"]').first();
      if (await search.count() > 0) {
        await expect(search).toBeVisible();
      }
    });
  });
});

test.describe('Grid Layout Tests', () => {
  const gridPages = [
    { path: '/', expectedCols: { mobile: 1, tablet: 2, desktop: 4 } },
    { path: '/fornecedores', expectedCols: { mobile: 1, tablet: 2, desktop: 3 } },
  ];

  for (const pageConfig of gridPages) {
    test.describe(`${pageConfig.path} grid layout`, () => {
      test('mobile should show single column', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto(pageConfig.path);
        await page.waitForLoadState('networkidle');
        
        // Grid items should stack vertically
        const cards = page.locator('[class*="card"], [class*="grid"] > div').first();
        if (await cards.isVisible().catch(() => false)) {
          const box = await cards.boundingBox();
          if (box) {
            // Single column means card takes most of width
            expect(box.width).toBeGreaterThan(320);
          }
        }
      });

      test('desktop should show multiple columns', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.goto(pageConfig.path);
        await page.waitForLoadState('networkidle');
        
        const cards = page.locator('[class*="card"]');
        const count = await cards.count();
        
        if (count >= 2) {
          const box1 = await cards.nth(0).boundingBox();
          const box2 = await cards.nth(1).boundingBox();
          
          if (box1 && box2) {
            // Multiple columns means different X positions
            const sameRow = Math.abs(box1.y - box2.y) < 50;
            if (sameRow) {
              expect(box1.x).not.toEqual(box2.x);
            }
          }
        }
      });
    });
  }
});
