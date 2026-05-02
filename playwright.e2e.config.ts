import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const DEFAULT_DEV_APP_PORT = '3006';
const DEVENV_STATE_PATH = path.resolve(process.cwd(), 'tmp/devenv-state.json');

function resolveDevAppPort(): string {
  if (process.env.SUPERSUBSET_DEV_APP_PORT) {
    return process.env.SUPERSUBSET_DEV_APP_PORT;
  }

  if (!existsSync(DEVENV_STATE_PATH)) {
    return DEFAULT_DEV_APP_PORT;
  }

  try {
    const parsed = JSON.parse(readFileSync(DEVENV_STATE_PATH, 'utf8')) as {
      ports?: { devApp?: number };
    };

    if (parsed.ports?.devApp == null) {
      return DEFAULT_DEV_APP_PORT;
    }

    return String(parsed.ports.devApp);
  } catch {
    return DEFAULT_DEV_APP_PORT;
  }
}

const devAppPort = resolveDevAppPort();
const devAppOrigin = `http://localhost:${devAppPort}`;

process.env.SUPERSUBSET_DEV_APP_PORT = devAppPort;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: devAppOrigin,
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // No webServer — assumes dev server already running
});
