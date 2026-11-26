import { chromium, FullConfig } from '@playwright/test';

/**
 * F-008: Global setup that authenticates a test user and saves the auth state
 * to a file. Subsequent tests load this state via storageState so they start
 * already logged-in without re-running the full auth flow every time.
 *
 * Prerequisites:
 *   - E2E_TEST_EMAIL / E2E_TEST_PASSWORD must be set in env (CI secrets)
 *   - The test user must exist in the Supabase project
 *
 * If the env vars are missing the setup is skipped (tests will run without
 * a pre-authenticated state and will exercise the auth redirect path only).
 */
async function globalSetup(_config: FullConfig) {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;

  if (!email || !password) {
    console.log('[global-setup] E2E_TEST_EMAIL/E2E_TEST_PASSWORD not set — skipping auth state setup');
    return;
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:8080/auth');
    await page.waitForSelector('input[type="email"]', { timeout: 15_000 });

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Wait for redirect away from /auth (signals successful login)
    await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 15_000 });

    // Persist auth cookies + localStorage (Supabase stores the session in localStorage)
    await context.storageState({ path: 'tests-e2e/.auth-state.json' });
    console.log('[global-setup] Auth state saved to tests-e2e/.auth-state.json');
  } catch (err) {
    console.warn('[global-setup] Could not authenticate test user:', err);
  } finally {
    await browser.close();
  }
}

export default globalSetup;
