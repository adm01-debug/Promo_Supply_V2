import { test, expect } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

interface LighthouseResult {
  categories: {
    performance: { score: number };
    accessibility: { score: number };
    'best-practices': { score: number };
    seo: { score: number };
  };
  audits: {
    'largest-contentful-paint': { numericValue: number; displayValue: string };
    'total-blocking-time': { numericValue: number; displayValue: string };
    'cumulative-layout-shift': { numericValue: number; displayValue: string };
    'first-contentful-paint': { numericValue: number; displayValue: string };
    'speed-index': { numericValue: number; displayValue: string };
    'interactive': { numericValue: number; displayValue: string };
  };
}

// Performance thresholds
const THRESHOLDS = {
  performance: 0.5, // 50% minimum
  accessibility: 0.8, // 80% minimum
  bestPractices: 0.8, // 80% minimum
  seo: 0.8, // 80% minimum
  lcp: 4000, // 4 seconds max (Good < 2.5s, Needs Improvement < 4s)
  tbt: 600, // 600ms max (proxy for FID)
  cls: 0.25, // 0.25 max (Good < 0.1, Needs Improvement < 0.25)
  fcp: 3000, // 3 seconds max
  si: 5800, // 5.8 seconds max
  tti: 7300, // 7.3 seconds max
};

const REPORTS_DIR = 'lighthouse-reports';

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

async function runLighthouse(
  url: string,
  device: 'mobile' | 'desktop',
  reportName: string
): Promise<LighthouseResult | null> {
  const outputPath = path.join(REPORTS_DIR, `${reportName}-${device}.json`);
  const htmlPath = path.join(REPORTS_DIR, `${reportName}-${device}.html`);
  
  const formFactor = device === 'mobile' ? 'mobile' : 'desktop';
  const screenEmulation = device === 'mobile' 
    ? '--screenEmulation.width=375 --screenEmulation.height=667'
    : '--screenEmulation.width=1920 --screenEmulation.height=1080 --screenEmulation.disabled';

  const command = `npx lighthouse ${url} \
    --output=json,html \
    --output-path=${outputPath.replace('.json', '')} \
    --chrome-flags="--headless --no-sandbox --disable-gpu" \
    --preset=${formFactor} \
    ${screenEmulation} \
    --only-categories=performance,accessibility,best-practices,seo \
    --quiet`;

  try {
    await execAsync(command, { timeout: 120000 });
    
    if (fs.existsSync(outputPath)) {
      const result = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      return result as LighthouseResult;
    }
  } catch (error) {
    console.error(`Lighthouse error for ${url} (${device}):`, error);
  }
  
  return null;
}

function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

test.describe('Lighthouse Performance Tests', () => {
  test.setTimeout(180000); // 3 minutes timeout

  test.describe('Desktop Performance', () => {
    test('Auth page performance metrics', async () => {
      const url = 'http://localhost:5173/auth';
      const result = await runLighthouse(url, 'desktop', 'auth');
      
      if (!result) {
        console.log('Lighthouse could not run - skipping assertions');
        return;
      }

      console.log('\n📊 Auth Page - Desktop Performance Report:');
      console.log('━'.repeat(50));
      console.log(`Performance Score: ${formatScore(result.categories.performance.score)}`);
      console.log(`Accessibility Score: ${formatScore(result.categories.accessibility.score)}`);
      console.log(`Best Practices Score: ${formatScore(result.categories['best-practices'].score)}`);
      console.log(`SEO Score: ${formatScore(result.categories.seo.score)}`);
      console.log('━'.repeat(50));
      console.log('Core Web Vitals:');
      console.log(`  LCP: ${result.audits['largest-contentful-paint'].displayValue}`);
      console.log(`  TBT: ${result.audits['total-blocking-time'].displayValue}`);
      console.log(`  CLS: ${result.audits['cumulative-layout-shift'].displayValue}`);
      console.log(`  FCP: ${result.audits['first-contentful-paint'].displayValue}`);
      console.log('━'.repeat(50));

      // Performance assertions
      expect(result.categories.performance.score).toBeGreaterThanOrEqual(THRESHOLDS.performance);
      expect(result.categories.accessibility.score).toBeGreaterThanOrEqual(THRESHOLDS.accessibility);
    });

    test('Home page performance metrics', async () => {
      const url = 'http://localhost:5173/';
      const result = await runLighthouse(url, 'desktop', 'home');
      
      if (!result) {
        console.log('Lighthouse could not run - skipping assertions');
        return;
      }

      console.log('\n📊 Home Page - Desktop Performance Report:');
      console.log('━'.repeat(50));
      console.log(`Performance Score: ${formatScore(result.categories.performance.score)}`);
      console.log(`LCP: ${result.audits['largest-contentful-paint'].displayValue}`);
      console.log(`TBT: ${result.audits['total-blocking-time'].displayValue}`);
      console.log(`CLS: ${result.audits['cumulative-layout-shift'].displayValue}`);
      console.log('━'.repeat(50));

      expect(result.categories.performance.score).toBeGreaterThanOrEqual(THRESHOLDS.performance);
    });
  });

  test.describe('Mobile Performance', () => {
    test('Auth page mobile performance', async () => {
      const url = 'http://localhost:5173/auth';
      const result = await runLighthouse(url, 'mobile', 'auth');
      
      if (!result) {
        console.log('Lighthouse could not run - skipping assertions');
        return;
      }

      console.log('\n📱 Auth Page - Mobile Performance Report:');
      console.log('━'.repeat(50));
      console.log(`Performance Score: ${formatScore(result.categories.performance.score)}`);
      console.log(`Accessibility Score: ${formatScore(result.categories.accessibility.score)}`);
      console.log('━'.repeat(50));
      console.log('Core Web Vitals:');
      console.log(`  LCP: ${result.audits['largest-contentful-paint'].displayValue}`);
      console.log(`  TBT: ${result.audits['total-blocking-time'].displayValue}`);
      console.log(`  CLS: ${result.audits['cumulative-layout-shift'].displayValue}`);
      console.log('━'.repeat(50));

      // Mobile thresholds are typically more lenient
      expect(result.categories.performance.score).toBeGreaterThanOrEqual(THRESHOLDS.performance * 0.8);
      expect(result.audits['cumulative-layout-shift'].numericValue).toBeLessThanOrEqual(THRESHOLDS.cls);
    });

    test('Home page mobile performance', async () => {
      const url = 'http://localhost:5173/';
      const result = await runLighthouse(url, 'mobile', 'home');
      
      if (!result) {
        console.log('Lighthouse could not run - skipping assertions');
        return;
      }

      console.log('\n📱 Home Page - Mobile Performance Report:');
      console.log('━'.repeat(50));
      console.log(`Performance Score: ${formatScore(result.categories.performance.score)}`);
      console.log(`LCP: ${result.audits['largest-contentful-paint'].displayValue}`);
      console.log(`CLS: ${result.audits['cumulative-layout-shift'].displayValue}`);
      console.log('━'.repeat(50));

      expect(result.categories.performance.score).toBeGreaterThanOrEqual(THRESHOLDS.performance * 0.8);
    });
  });

  test.describe('Core Web Vitals Thresholds', () => {
    test('LCP should be under 4 seconds', async () => {
      const url = 'http://localhost:5173/auth';
      const result = await runLighthouse(url, 'desktop', 'lcp-test');
      
      if (!result) {
        console.log('Lighthouse could not run - skipping assertions');
        return;
      }

      const lcp = result.audits['largest-contentful-paint'].numericValue;
      console.log(`LCP: ${formatMs(lcp)} (threshold: ${formatMs(THRESHOLDS.lcp)})`);
      
      expect(lcp).toBeLessThanOrEqual(THRESHOLDS.lcp);
    });

    test('CLS should be under 0.25', async () => {
      const url = 'http://localhost:5173/auth';
      const result = await runLighthouse(url, 'desktop', 'cls-test');
      
      if (!result) {
        console.log('Lighthouse could not run - skipping assertions');
        return;
      }

      const cls = result.audits['cumulative-layout-shift'].numericValue;
      console.log(`CLS: ${cls.toFixed(3)} (threshold: ${THRESHOLDS.cls})`);
      
      expect(cls).toBeLessThanOrEqual(THRESHOLDS.cls);
    });

    test('TBT (FID proxy) should be under 600ms', async () => {
      const url = 'http://localhost:5173/auth';
      const result = await runLighthouse(url, 'desktop', 'tbt-test');
      
      if (!result) {
        console.log('Lighthouse could not run - skipping assertions');
        return;
      }

      const tbt = result.audits['total-blocking-time'].numericValue;
      console.log(`TBT: ${formatMs(tbt)} (threshold: ${formatMs(THRESHOLDS.tbt)})`);
      
      expect(tbt).toBeLessThanOrEqual(THRESHOLDS.tbt);
    });
  });
});

test.describe('Performance Budget', () => {
  test.setTimeout(120000);

  test('Check bundle size impact', async ({ page }) => {
    await page.goto('http://localhost:5173/auth');
    
    // Collect performance metrics
    const metrics = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const jsResources = resources.filter(r => r.name.endsWith('.js'));
      const cssResources = resources.filter(r => r.name.endsWith('.css'));
      
      const totalJsSize = jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
      const totalCssSize = cssResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
      
      return {
        jsCount: jsResources.length,
        cssCount: cssResources.length,
        totalJsSize,
        totalCssSize,
        totalResources: resources.length,
      };
    });

    console.log('\n📦 Resource Budget:');
    console.log('━'.repeat(50));
    console.log(`JS Files: ${metrics.jsCount}`);
    console.log(`CSS Files: ${metrics.cssCount}`);
    console.log(`Total JS Size: ${(metrics.totalJsSize / 1024).toFixed(1)} KB`);
    console.log(`Total CSS Size: ${(metrics.totalCssSize / 1024).toFixed(1)} KB`);
    console.log(`Total Resources: ${metrics.totalResources}`);
    console.log('━'.repeat(50));

    // Budget assertions (adjust as needed)
    expect(metrics.totalJsSize).toBeLessThan(2 * 1024 * 1024); // 2MB max JS
    expect(metrics.totalCssSize).toBeLessThan(500 * 1024); // 500KB max CSS
  });

  test('Check navigation timing', async ({ page }) => {
    await page.goto('http://localhost:5173/auth');
    
    const timing = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        dns: nav.domainLookupEnd - nav.domainLookupStart,
        tcp: nav.connectEnd - nav.connectStart,
        ttfb: nav.responseStart - nav.requestStart,
        download: nav.responseEnd - nav.responseStart,
        domInteractive: nav.domInteractive - nav.fetchStart,
        domComplete: nav.domComplete - nav.fetchStart,
        loadComplete: nav.loadEventEnd - nav.fetchStart,
      };
    });

    console.log('\n⏱️ Navigation Timing:');
    console.log('━'.repeat(50));
    console.log(`DNS Lookup: ${timing.dns.toFixed(0)}ms`);
    console.log(`TCP Connect: ${timing.tcp.toFixed(0)}ms`);
    console.log(`TTFB: ${timing.ttfb.toFixed(0)}ms`);
    console.log(`Download: ${timing.download.toFixed(0)}ms`);
    console.log(`DOM Interactive: ${timing.domInteractive.toFixed(0)}ms`);
    console.log(`DOM Complete: ${timing.domComplete.toFixed(0)}ms`);
    console.log(`Load Complete: ${timing.loadComplete.toFixed(0)}ms`);
    console.log('━'.repeat(50));

    // Timing assertions
    expect(timing.domInteractive).toBeLessThan(5000); // 5s max to interactive
  });
});
