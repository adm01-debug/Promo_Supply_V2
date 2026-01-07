import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Mobile devices
    {
      name: 'Mobile Portrait',
      use: { 
        ...devices['iPhone 14'],
        viewport: { width: 375, height: 667 },
      },
    },
    {
      name: 'Mobile Landscape',
      use: { 
        viewport: { width: 667, height: 375 },
        isMobile: true,
      },
    },
    // Tablet
    {
      name: 'Tablet Portrait',
      use: { 
        ...devices['iPad Mini'],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'Tablet Landscape',
      use: { 
        viewport: { width: 1024, height: 768 },
      },
    },
    // Desktop
    {
      name: 'Desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'Desktop Large',
      use: { 
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
