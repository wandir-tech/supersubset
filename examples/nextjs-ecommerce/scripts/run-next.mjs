import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import net from 'node:net';
import process from 'node:process';

const require = createRequire(import.meta.url);
const nextBin = require.resolve('next/dist/bin/next');
const mode = process.argv[2];
const supportedModes = new Set(['dev', 'start']);

if (!supportedModes.has(mode)) {
  process.stderr.write('Usage: node ./scripts/run-next.mjs <dev|start>\n');
  process.exit(1);
}

function assertPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', () => {
      reject(
        new Error(
          `Port ${port} is already in use. Choose a different SUPERSUBSET_EXAMPLE_NEXTJS_PORT.`,
        ),
      );
    });
    server.listen(port, () => {
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve(undefined);
      });
    });
  });
}

async function main() {
  const port = Number(process.env.SUPERSUBSET_EXAMPLE_NEXTJS_PORT ?? '3001');

  if (!Number.isInteger(port) || port <= 0) {
    process.stderr.write('SUPERSUBSET_EXAMPLE_NEXTJS_PORT must be a positive integer.\n');
    process.exit(1);
  }

  await assertPortAvailable(port);

  const child = spawn(process.execPath, [nextBin, mode, '-p', String(port)], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: String(port),
    },
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
