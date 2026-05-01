import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

type LocalPortSelection = {
  devApp: string;
  nextjsExample: string;
  viteSqliteExample: string;
};

const DEFAULT_PORTS: LocalPortSelection = {
  devApp: '3000',
  nextjsExample: '3001',
  viteSqliteExample: '3002',
};

const DEVENV_STATE_PATH = path.resolve(process.cwd(), 'tmp/devenv-state.json');
const FIND_FREE_PORT_SCRIPT = path.resolve(process.cwd(), 'scripts/find-free-port.mjs');

function readPersistedPorts(): LocalPortSelection | null {
  if (!existsSync(DEVENV_STATE_PATH)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(DEVENV_STATE_PATH, 'utf8')) as {
      ports?: { devApp?: number; nextjsExample?: number; viteSqliteExample?: number };
    };

    if (
      parsed.ports?.devApp == null ||
      parsed.ports.nextjsExample == null ||
      parsed.ports.viteSqliteExample == null
    ) {
      return null;
    }

    return {
      devApp: String(parsed.ports.devApp),
      nextjsExample: String(parsed.ports.nextjsExample),
      viteSqliteExample: String(parsed.ports.viteSqliteExample),
    };
  } catch {
    return null;
  }
}

function leaseLocalPorts(): LocalPortSelection {
  const output = execFileSync(
    process.execPath,
    [
      FIND_FREE_PORT_SCRIPT,
      '--start',
      '3110',
      '--end',
      '3199',
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
  const hasExplicitPorts = Boolean(
    process.env.SUPERSUBSET_DEV_APP_PORT ||
    process.env.SUPERSUBSET_EXAMPLE_NEXTJS_PORT ||
    process.env.SUPERSUBSET_EXAMPLE_VITE_SQLITE_PORT,
  );
  const persistedPorts = readPersistedPorts();

  // Local runs should avoid silently reusing arbitrary processes on the shared defaults.
  const fallbackPorts = process.env.CI ? DEFAULT_PORTS : (persistedPorts ?? leaseLocalPorts());
  const ports: LocalPortSelection = {
    devApp: process.env.SUPERSUBSET_DEV_APP_PORT ?? fallbackPorts.devApp,
    nextjsExample: process.env.SUPERSUBSET_EXAMPLE_NEXTJS_PORT ?? fallbackPorts.nextjsExample,
    viteSqliteExample:
      process.env.SUPERSUBSET_EXAMPLE_VITE_SQLITE_PORT ?? fallbackPorts.viteSqliteExample,
  };

  return {
    ports,
    reuseExistingServer: !process.env.CI && (hasExplicitPorts || persistedPorts !== null),
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
      reuseExistingServer,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @supersubset/example-nextjs-ecommerce dev',
      url: nextjsExampleOrigin,
      env: {
        ...process.env,
        SUPERSUBSET_EXAMPLE_NEXTJS_PORT: ports.nextjsExample,
      },
      reuseExistingServer,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @supersubset/example-vite-sqlite dev',
      url: viteSqliteExampleOrigin,
      env: {
        ...process.env,
        SUPERSUBSET_EXAMPLE_VITE_SQLITE_PORT: ports.viteSqliteExample,
      },
      reuseExistingServer,
      timeout: 120_000,
    },
  ],
});
