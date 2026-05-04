import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

type LocalPortSelection = {
  devApp: string;
  nextjsExample: string;
  viteSqliteExample: string;
};

type ReuseExistingServerSelection = {
  devApp: boolean;
  nextjsExample: boolean;
  viteSqliteExample: boolean;
};

const DEFAULT_PORTS: LocalPortSelection = {
  devApp: '3000',
  nextjsExample: '3001',
  viteSqliteExample: '3002',
};

const FIND_FREE_PORT_SCRIPT = path.resolve(process.cwd(), 'scripts/find-free-port.mjs');

function leaseLocalPorts(): LocalPortSelection {
  const output = execFileSync(
    process.execPath,
    [
      FIND_FREE_PORT_SCRIPT,
      '--start',
      '3210',
      '--end',
      '3299',
      '--count',
      '3',
      '--host',
      '127.0.0.1',
    ],
    { encoding: 'utf8' },
  );

  const [devApp, nextjsExample, viteSqliteExample] = output.trim().split(/\s+/).filter(Boolean);

  if (!devApp || !nextjsExample || !viteSqliteExample) {
    throw new Error('Could not resolve a full local Playwright port tuple.');
  }

  return {
    devApp,
    nextjsExample,
    viteSqliteExample,
  };
}

function resolvePlaywrightPorts() {
  const explicitPorts: ReuseExistingServerSelection = {
    devApp: Boolean(process.env.SUPERSUBSET_DEV_APP_PORT),
    nextjsExample: Boolean(process.env.SUPERSUBSET_EXAMPLE_NEXTJS_PORT),
    viteSqliteExample: Boolean(process.env.SUPERSUBSET_EXAMPLE_VITE_SQLITE_PORT),
  };
  const ciPorts: ReuseExistingServerSelection = {
    devApp: false,
    nextjsExample: false,
    viteSqliteExample: false,
  };

  // Local Playwright runs should be isolated from long-lived DevEnv tasks unless the caller
  // intentionally pins ports to an already-running server tuple.
  const fallbackPorts = process.env.CI ? DEFAULT_PORTS : leaseLocalPorts();
  const ports: LocalPortSelection = {
    devApp: process.env.SUPERSUBSET_DEV_APP_PORT ?? fallbackPorts.devApp,
    nextjsExample: process.env.SUPERSUBSET_EXAMPLE_NEXTJS_PORT ?? fallbackPorts.nextjsExample,
    viteSqliteExample:
      process.env.SUPERSUBSET_EXAMPLE_VITE_SQLITE_PORT ?? fallbackPorts.viteSqliteExample,
  };

  return {
    ports,
    reuseExistingServer: process.env.CI ? ciPorts : explicitPorts,
  };
}

const { ports, reuseExistingServer } = resolvePlaywrightPorts();

process.env.SUPERSUBSET_DEV_APP_PORT = ports.devApp;
process.env.SUPERSUBSET_EXAMPLE_NEXTJS_PORT = ports.nextjsExample;
process.env.SUPERSUBSET_EXAMPLE_VITE_SQLITE_PORT = ports.viteSqliteExample;

const devAppOrigin = `http://localhost:${ports.devApp}`;
const nextjsExampleOrigin = `http://localhost:${ports.nextjsExample}`;
const viteSqliteExampleOrigin = `http://localhost:${ports.viteSqliteExample}`;

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
      env: { ...process.env, SUPERSUBSET_DEV_APP_PORT: ports.devApp },
      reuseExistingServer: reuseExistingServer.devApp,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @supersubset/example-nextjs-ecommerce dev',
      url: nextjsExampleOrigin,
      env: {
        ...process.env,
        SUPERSUBSET_EXAMPLE_NEXTJS_PORT: ports.nextjsExample,
      },
      reuseExistingServer: reuseExistingServer.nextjsExample,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @supersubset/example-vite-sqlite dev',
      url: viteSqliteExampleOrigin,
      env: {
        ...process.env,
        SUPERSUBSET_EXAMPLE_VITE_SQLITE_PORT: ports.viteSqliteExample,
      },
      reuseExistingServer: reuseExistingServer.viteSqliteExample,
      timeout: 120_000,
    },
  ],
});
