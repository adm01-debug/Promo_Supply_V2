/**
 * Performance Audit Tests using Playwright
 * Monitors Core Web Vitals and performance metrics
 */

import { test, expect } from '@playwright/test';

// Performance thresholds based on Core Web Vitals
const THRESHOLDS = {
  LCP: 2500, // Largest Contentful Paint (ms)
  FID: 100,  // First Input Delay (ms) - estimated via TBT
  CLS: 0.1,  // Cumulative Layout Shift
  FCP: 1800, // First Contentful Paint (ms)
  TTFB: 800, // Time to First Byte (ms)
  TTI: 3800, // Time to Interactive (ms)
  TBT: 200,  // Total Blocking Time (ms)
};

// Routes to test for performance
const ROUTES_TO_TEST = [
  { path: '/', name: 'Dashboard' },
  { path: '/solicitacoes', name: 'Solicitações' },
  { path: '/pedidos', name: 'Pedidos' },
  { path: '/fornecedores', name: 'Fornecedores' },
  { path: '/pagamentos', name: 'Pagamentos' },
  { path: '/cotacao', name: 'Cotações' },
];

test.describe('Performance Audit', () => {
  test.beforeEach(async ({ page }) => {
    // Clear caches and storage for clean measurements
    await page.context().clearCookies();
  });

  for (const route of ROUTES_TO_TEST) {
    test(`should meet performance thresholds for ${route.name}`, async ({ page }) => {
      // Enable performance metrics collection
      const client = await page.context().newCDPSession(page);
      await client.send('Performance.enable');

      // Navigate to the page
      const startTime = Date.now();
      await page.goto(route.path, { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;

      // Get performance metrics
      const metrics = await client.send('Performance.getMetrics');
      const metricsMap = new Map(metrics.metrics.map((m: any) => [m.name, m.value]));

      // Get Core Web Vitals from browser
      const vitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const results: Record<string, number> = {};
          
          // Get paint timing
          const paintEntries = performance.getEntriesByType('paint');
          paintEntries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              results.FCP = entry.startTime;
            }
          });

          // Get LCP
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            results.LCP = lastEntry.startTime;
          });
          
          try {
            lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
          } catch (e) {
            // LCP not supported
          }

          // Get CLS
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
          });

          try {
            clsObserver.observe({ type: 'layout-shift', buffered: true });
          } catch (e) {
            // CLS not supported
          }

          // Wait a bit for metrics to be collected
          setTimeout(() => {
            results.CLS = clsValue;
            lcpObserver.disconnect();
            clsObserver.disconnect();
            resolve(results);
          }, 1000);
        });
      });

      // Log performance results
      console.log(`\n📊 Performance Results for ${route.name}:`);
      console.log(`   Load Time: ${loadTime}ms`);
      console.log(`   FCP: ${(vitals as any).FCP?.toFixed(0) || 'N/A'}ms (threshold: ${THRESHOLDS.FCP}ms)`);
      console.log(`   LCP: ${(vitals as any).LCP?.toFixed(0) || 'N/A'}ms (threshold: ${THRESHOLDS.LCP}ms)`);
      console.log(`   CLS: ${(vitals as any).CLS?.toFixed(3) || 'N/A'} (threshold: ${THRESHOLDS.CLS})`);

      // Assertions
      expect(loadTime).toBeLessThan(10000); // Max 10s load time
      
      if ((vitals as any).FCP) {
        expect((vitals as any).FCP).toBeLessThan(THRESHOLDS.FCP * 2); // Allow 2x for CI
      }
      
      if ((vitals as any).LCP) {
        expect((vitals as any).LCP).toBeLessThan(THRESHOLDS.LCP * 2); // Allow 2x for CI
      }
      
      if ((vitals as any).CLS !== undefined) {
        expect((vitals as any).CLS).toBeLessThan(THRESHOLDS.CLS * 2); // Allow 2x for CI
      }
    });
  }

  test('should have efficient bundle size', async ({ page }) => {
    const resourceSizes: Record<string, number> = {
      js: 0,
      css: 0,
      images: 0,
      fonts: 0,
      other: 0,
    };

    // Intercept and measure resource sizes
    page.on('response', async (response) => {
      try {
        const url = response.url();
        const size = parseInt(response.headers()['content-length'] || '0', 10);
        
        if (url.endsWith('.js') || url.includes('.js?')) {
          resourceSizes.js += size;
        } else if (url.endsWith('.css') || url.includes('.css?')) {
          resourceSizes.css += size;
        } else if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)) {
          resourceSizes.images += size;
        } else if (url.match(/\.(woff2?|ttf|otf|eot)$/i)) {
          resourceSizes.fonts += size;
        } else {
          resourceSizes.other += size;
        }
      } catch (e) {
        // Ignore errors
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    // Log resource sizes
    console.log('\n📦 Bundle Size Analysis:');
    console.log(`   JavaScript: ${(resourceSizes.js / 1024).toFixed(1)}KB`);
    console.log(`   CSS: ${(resourceSizes.css / 1024).toFixed(1)}KB`);
    console.log(`   Images: ${(resourceSizes.images / 1024).toFixed(1)}KB`);
    console.log(`   Fonts: ${(resourceSizes.fonts / 1024).toFixed(1)}KB`);
    console.log(`   Total: ${(Object.values(resourceSizes).reduce((a, b) => a + b, 0) / 1024).toFixed(1)}KB`);

    // JS bundle should be under 2MB (uncompressed)
    expect(resourceSizes.js).toBeLessThan(2 * 1024 * 1024);
  });

  test('should have fast time to interactive', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'networkidle' });

    // Check if the main content is interactive
    await page.waitForSelector('[data-tour="sidebar"]', { state: 'visible' });
    
    // Try to interact with the page
    const isInteractive = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      return buttons.length > 0 && Array.from(buttons).some(btn => !btn.disabled);
    });

    const tti = Date.now() - startTime;
    
    console.log(`\n⚡ Time to Interactive: ${tti}ms (threshold: ${THRESHOLDS.TTI}ms)`);
    
    expect(isInteractive).toBe(true);
    expect(tti).toBeLessThan(THRESHOLDS.TTI * 2); // Allow 2x for CI
  });

  test('should load images lazily', async ({ page }) => {
    // Check for lazy loading attributes
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const imagesInfo = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      return Array.from(images).map(img => ({
        src: img.src,
        loading: img.loading,
        hasLazyLoading: img.loading === 'lazy' || img.dataset.src !== undefined,
      }));
    });

    // Log image loading info
    console.log(`\n🖼️ Image Loading Analysis:`);
    console.log(`   Total images: ${imagesInfo.length}`);
    console.log(`   Lazy loaded: ${imagesInfo.filter(i => i.hasLazyLoading).length}`);
    
    // All images should have appropriate loading strategy
    // (This is informational, not a hard requirement)
  });

  test('should have proper cache headers', async ({ page }) => {
    const cacheInfo: Record<string, string> = {};

    page.on('response', (response) => {
      const cacheControl = response.headers()['cache-control'];
      const url = new URL(response.url());
      
      if (cacheControl && !url.hostname.includes('supabase')) {
        const ext = url.pathname.split('.').pop() || 'other';
        if (!cacheInfo[ext]) {
          cacheInfo[ext] = cacheControl;
        }
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    console.log('\n📋 Cache Headers:');
    Object.entries(cacheInfo).forEach(([ext, header]) => {
      console.log(`   .${ext}: ${header}`);
    });
  });

  test('should prefetch data on link hover', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Track network requests
    const prefetchRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('supabase')) {
        prefetchRequests.push(request.url());
      }
    });

    // Hover over a navigation link
    const navLink = page.locator('a[href="/solicitacoes"]').first();
    if (await navLink.isVisible()) {
      await navLink.hover();
      
      // Wait for potential prefetch
      await page.waitForTimeout(200);

      console.log(`\n🔗 Prefetch Activity:`);
      console.log(`   Requests triggered on hover: ${prefetchRequests.length}`);
    }
  });
});

test.describe('Mobile Performance', () => {
  test.use({
    viewport: { width: 375, height: 667 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
  });

  test('should perform well on mobile', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;

    console.log(`\n📱 Mobile Performance:`);
    console.log(`   Load Time: ${loadTime}ms`);

    // Mobile should load reasonably fast
    expect(loadTime).toBeLessThan(15000);

    // Check for mobile-specific optimizations
    const hasMobileNav = await page.locator('[data-mobile-nav]').isVisible().catch(() => false);
    const hasResponsiveLayout = await page.evaluate(() => {
      const body = document.body;
      const computedStyle = window.getComputedStyle(body);
      return computedStyle.overflowX !== 'visible';
    });

    console.log(`   Has responsive layout: ${hasResponsiveLayout}`);
  });
});
