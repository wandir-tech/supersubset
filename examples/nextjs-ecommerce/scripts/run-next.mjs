import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import process from 'node:process';

const require = createRequire(import.meta.url);
const nextBin = require.resolve('next/dist/bin/next');
const mode = process.argv[2];
const supportedModes = new Set(['dev', 'start']);

if (!supportedModes.has(mode)) {
  process.stderr.write('Usage: node ./scripts/run-next.mjs <dev|start>\n');
  process.exit(1);
}

const port = process.env.SUPERSUBSET_EXAMPLE_NEXTJS_PORT ?? '3001';

const child = spawn(process.execPath, [nextBin, mode, '-p', port], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: port,
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
