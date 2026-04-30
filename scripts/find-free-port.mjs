import net from 'node:net';
import process from 'node:process';

function parseArgs(argv) {
  const options = {
    start: 3010,
    end: 3199,
    count: 1,
    host: '127.0.0.1',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];

    if (!key?.startsWith('--')) {
      continue;
    }

    if (value == null) {
      throw new Error(`Missing value for ${key}`);
    }

    switch (key) {
      case '--start':
        options.start = Number(value);
        index += 1;
        break;
      case '--end':
        options.end = Number(value);
        index += 1;
        break;
      case '--count':
        options.count = Number(value);
        index += 1;
        break;
      case '--host':
        options.host = value;
        index += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${key}`);
    }
  }

  return options;
}

function validateOptions(options) {
  if (
    !Number.isInteger(options.start) ||
    !Number.isInteger(options.end) ||
    !Number.isInteger(options.count)
  ) {
    throw new Error('start, end, and count must be integers');
  }

  if (options.start <= 0 || options.end <= 0 || options.count <= 0) {
    throw new Error('start, end, and count must be positive');
  }

  if (options.start > options.end) {
    throw new Error('start must be less than or equal to end');
  }
}

function canListen(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once('error', () => {
      resolve(false);
    });
    server.listen(port, host, () => {
      server.close(() => resolve(true));
    });
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  validateOptions(options);

  const freePorts = [];

  for (
    let port = options.start;
    port <= options.end && freePorts.length < options.count;
    port += 1
  ) {
     
    if (await canListen(port, options.host)) {
      freePorts.push(port);
    }
  }

  if (freePorts.length !== options.count) {
    throw new Error(
      `Could not find ${options.count} free port(s) in range ${options.start}-${options.end}`,
    );
  }

  process.stdout.write(`${freePorts.join('\n')}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
