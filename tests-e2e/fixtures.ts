import { test as base, expect } from '@playwright/test';
import * as fs from 'fs';

/**
 * F-008: Authenticated test fixture.
 *
 * Usage:
 *   import { test, expect } from '../fixtures';
 *   test('protected page', async ({ authedPage }) => { ... });
 *
 * If .auth-state.json does not exist (e.g. no creds in CI) the fixture
 * falls back to unauthenticated context so tests that don't need auth still run.
 */

type AuthFixtures = {
  authedPage: ReturnType<typeof base.extend>['page'] extends Promise<infer T> ? T : never;
};

const AUTH_STATE_PATH = 'tests-e2e/.auth-state.json';

export const test = base.extend<{ authedPage: Parameters<Parameters<typeof base>[1]>[0]['page'] }>({
  authedPage: async ({ browser }, use) => {
    const hasAuthState = fs.existsSync(AUTH_STATE_PATH);

    const context = await browser.newContext(
      hasAuthState ? { storageState: AUTH_STATE_PATH } : {},
    );
    const page = await context.newPage();

    await use(page as any);
    await context.close();
  },
});

export { expect };
