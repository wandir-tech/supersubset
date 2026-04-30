import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { findFreePorts } from './find-free-port.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = dirname(SCRIPT_DIR);
const TMP_DIR = join(ROOT_DIR, 'tmp');
const STATE_PATH = join(TMP_DIR, 'devenv-state.json');

const DEFAULT_PORTS = {
  devApp: 3000,
  nextjsExample: 3001,
  viteSqliteExample: 3002,
  docs: 4321,
};

const PORT_ENV = {
  devApp: 'SUPERSUBSET_DEV_APP_PORT',
  nextjsExample: 'SUPERSUBSET_EXAMPLE_NEXTJS_PORT',
  viteSqliteExample: 'SUPERSUBSET_EXAMPLE_VITE_SQLITE_PORT',
};

const TARGETS = {
  'dev-app': {
    label: 'Supersubset dev app',
    url: (ports) => `http://localhost:${ports.devApp}`,
    args: ['--filter', '@supersubset/dev-app', 'dev'],
  },
  'nextjs-example': {
    label: 'Next.js example',
    url: (ports) => `http://localhost:${ports.nextjsExample}`,
    args: ['--filter', '@supersubset/example-nextjs-ecommerce', 'dev'],
  },
  'vite-sqlite-example': {
    label: 'Vite + SQLite example',
    url: (ports) => `http://localhost:${ports.viteSqliteExample}`,
    args: ['--filter', '@supersubset/example-vite-sqlite', 'dev'],
  },
  docs: {
    label: 'Docs site',
    url: (ports) => `http://localhost:${ports.docs}`,
    args: ['docs:dev'],
  },
};

const DIST_CHECKS = [
  ['packages/schema/dist', '@supersubset/schema'],
  ['packages/theme/dist', '@supersubset/theme'],
  ['packages/runtime/dist', '@supersubset/runtime'],
  ['packages/charts-echarts/dist', '@supersubset/charts-echarts'],
  ['packages/designer/dist', '@supersubset/designer'],
  ['packages/data-model/dist', '@supersubset/data-model'],
  ['packages/query-client/dist', '@supersubset/query-client'],
  ['packages/adapter-json/dist', '@supersubset/adapter-json'],
  ['packages/adapter-sql/dist', '@supersubset/adapter-sql'],
  ['packages/adapter-prisma/dist', '@supersubset/adapter-prisma'],
  ['packages/adapter-dbt/dist', '@supersubset/adapter-dbt'],
];

function usage() {
  return [
    'Usage: node scripts/devenv.mjs <command> [options]',
    '',
    'Commands:',
    '  preflight                     Check required dist outputs for the local dev env',
    '  prepare --profile <name>      Write the current DevEnv port selection to tmp/devenv-state.json',
    '  run <target>                  Start one target with the current or default port state',
    '  print-urls                    Print only the current local URLs for copy/paste handoff',
    '  status                        Print the current DevEnv URLs and state file',
    '  clear                         Remove tmp/devenv-state.json',
    '',
    'Targets:',
    '  dev-app | nextjs-example | vite-sqlite-example | docs',
    '',
    'Profiles:',
    '  default                       Use the shared defaults (3000/3001/3002)',
    '  leased                        Lease a fresh tuple from a configurable range (default 3110-3199)',
    '',
    'Options for prepare:',
    '  --profile <default|leased>',
    '  --start <port>                Start of the leased range (default 3110)',
    '  --end <port>                  End of the leased range (default 3199)',
  ].join('\n');
}

function parseKeyValueArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];

    if (!key?.startsWith('--')) {
      continue;
    }

    if (value == null) {
      throw new Error(`Missing value for ${key}`);
    }

    options[key.slice(2)] = value;
    index += 1;
  }

  return options;
}

function ensureTmpDir() {
  mkdirSync(TMP_DIR, { recursive: true });
}

function readState() {
  if (!existsSync(STATE_PATH)) {
    return null;
  }

  return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
}

function writeState(state) {
  ensureTmpDir();
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function getCurrentState() {
  const state = readState();

  if (state) {
    return state;
  }

  return {
    profile: 'default',
    ports: DEFAULT_PORTS,
    persisted: false,
  };
}

function getPorts() {
  return getCurrentState().ports;
}

function formatUrls(state) {
  return [
    `- Dev app: http://localhost:${state.ports.devApp}`,
    `- Next.js example: http://localhost:${state.ports.nextjsExample}`,
    `- Next.js workbench: http://localhost:${state.ports.nextjsExample}/workbench`,
    `- Vite + SQLite example: http://localhost:${state.ports.viteSqliteExample}`,
    `- Docs: http://localhost:${state.ports.docs}`,
  ].join('\n');
}

function formatStatus(state) {
  const persisted = state.persisted !== false;
  const lines = [
    `Profile: ${state.profile}`,
    `State file: ${persisted ? STATE_PATH : 'not written (defaults in effect)'}`,
    'URLs:',
    ...formatUrls(state).split('\n'),
  ];

  if (persisted && state.updatedAt) {
    lines.push(`Updated: ${state.updatedAt}`);
  }

  return `${lines.join('\n')}\n`;
}

function buildEnv(ports) {
  return {
    ...process.env,
    [PORT_ENV.devApp]: String(ports.devApp),
    [PORT_ENV.nextjsExample]: String(ports.nextjsExample),
    [PORT_ENV.viteSqliteExample]: String(ports.viteSqliteExample),
  };
}

function getPnpmCommand() {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

function runTarget(targetName) {
  const target = TARGETS[targetName];

  if (!target) {
    throw new Error(`Unknown target: ${targetName}`);
  }

  const ports = getPorts();
  process.stdout.write(`Starting ${target.label} at ${target.url(ports)}\n`);

  const child = spawn(getPnpmCommand(), target.args, {
    cwd: ROOT_DIR,
    env: buildEnv(ports),
    stdio: 'inherit',
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

function preflight() {
  const missing = DIST_CHECKS.filter(([path]) => !existsSync(join(ROOT_DIR, path)));

  if (missing.length > 0) {
    const lines = [
      'DevEnv preflight failed. Missing build outputs for:',
      ...missing.map(([, label]) => `- ${label}`),
      '',
      'Run `pnpm build` or the `Build Workspace` task before starting the local DevEnv.',
    ];
    process.stderr.write(`${lines.join('\n')}\n`);
    process.exit(1);
  }

  process.stdout.write('DevEnv preflight passed. Required dist outputs are present.\n');
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);

  switch (command) {
    case 'preflight':
      preflight();
      return;
    case 'prepare': {
      const options = parseKeyValueArgs(rest);
      const profile = options.profile ?? 'default';
      const rangeStart = Number(options.start ?? 3110);
      const rangeEnd = Number(options.end ?? 3199);

      if (!Number.isInteger(rangeStart) || !Number.isInteger(rangeEnd)) {
        throw new Error('start and end must be integers');
      }

      const ports =
        profile === 'leased'
          ? await findFreePorts({ start: rangeStart, end: rangeEnd, count: 3, host: '127.0.0.1' })
          : null;

      const portSelection =
        profile === 'leased'
          ? {
              devApp: ports[0],
              nextjsExample: ports[1],
              viteSqliteExample: ports[2],
              docs: DEFAULT_PORTS.docs,
            }
          : DEFAULT_PORTS;

      const state = {
        profile,
        ports: portSelection,
        updatedAt: new Date().toISOString(),
      };

      writeState(state);
      process.stdout.write(formatStatus(state));
      return;
    }
    case 'run': {
      const [targetName] = rest;
      if (!targetName) {
        throw new Error('Missing target name for run');
      }

      runTarget(targetName);
      return;
    }
    case 'status':
      process.stdout.write(formatStatus(getCurrentState()));
      return;
    case 'print-urls':
      process.stdout.write(`${formatUrls(getCurrentState())}\n`);
      return;
    case 'clear':
      rmSync(STATE_PATH, { force: true });
      process.stdout.write(`Cleared ${STATE_PATH}\n`);
      return;
    case undefined:
      process.stdout.write(`${usage()}\n`);
      return;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
