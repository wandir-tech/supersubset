import { defineConfig, devices } from '@playwright/test';

const devAppPort = process.env.SUPERSUBSET_DEV_APP_PORT ?? '3000';
const devAppOrigin = `http://localhost:${devAppPort}`;
const nextjsExamplePort = process.env.SUPERSUBSET_EXAMPLE_NEXTJS_PORT ?? '3001';
const nextjsExampleOrigin = `http://localhost:${nextjsExamplePort}`;
const viteSqliteExamplePort = process.env.SUPERSUBSET_EXAMPLE_VITE_SQLITE_PORT ?? '3002';
const viteSqliteExampleOrigin = `http://localhost:${viteSqliteExamplePort}`;

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
      url: nextjsExampleOrigin,
      env: {
        ...process.env,
        SUPERSUBSET_EXAMPLE_NEXTJS_PORT: nextjsExamplePort,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @supersubset/example-vite-sqlite dev',
      url: viteSqliteExampleOrigin,
      env: {
        ...process.env,
        SUPERSUBSET_EXAMPLE_VITE_SQLITE_PORT: viteSqliteExamplePort,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
