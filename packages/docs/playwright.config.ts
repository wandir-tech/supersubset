/**
 * Playwright screenshot capture harness for Supersubset documentation.
 *
 * This config is purpose-built for documentation screenshots:
 * - Uses only Chromium (consistent screenshots across all docs)
 * - Higher resolution viewport for crisp documentation images
 * - Connects to the dev-app (same as e2e tests)
 * - Outputs to packages/docs/src/assets/screenshots/
 */
import { defineConfig, devices } from '@playwright/test';

const devAppPort = process.env.SUPERSUBSET_DEV_APP_PORT ?? '3000';
const devAppOrigin = `http://localhost:${devAppPort}`;
const reuseExistingServer = Boolean(process.env.SUPERSUBSET_DEV_APP_PORT);

export default defineConfig({
  testDir: './capture',
  fullyParallel: false, // sequential for consistent state between screenshots
  retries: 0,
  workers: 1,
  reporter: 'list',
  timeout: 60_000,
  use: {
    baseURL: devAppOrigin,
    screenshot: 'off', // we capture manually
    trace: 'off',
    video: 'off',
    viewport: { width: 1440, height: 900 },
    ...devices['Desktop Chrome'],
  },
  projects: [
    {
      name: 'screenshots',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  // Reuse running dev-app or start one
  webServer: {
    command: 'pnpm --filter @supersubset/dev-app dev',
    url: devAppOrigin,
    env: { ...process.env, SUPERSUBSET_DEV_APP_PORT: devAppPort },
    reuseExistingServer,
    timeout: 120_000,
  },
});
