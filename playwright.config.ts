import { defineConfig, devices } from '@playwright/test';

const devAppPort = process.env.SUPERSUBSET_DEV_APP_PORT ?? '3000';
const devAppOrigin = `http://localhost:${devAppPort}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: devAppOrigin,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @supersubset/dev-app dev',
      url: devAppOrigin,
      env: { ...process.env, SUPERSUBSET_DEV_APP_PORT: devAppPort },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @supersubset/example-nextjs-ecommerce dev',
      url: 'http://localhost:3001',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @supersubset/example-vite-sqlite dev',
      url: 'http://localhost:3002',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
