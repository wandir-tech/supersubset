import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { exportMetadata, createExportMetadataEnvelope } from './export-metadata.js';
import { importSchema } from './import-schema.js';
import type { SupportedSourceType } from './metadata-source.js';

export interface CliIO {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  readText: (filePath: string) => Promise<string>;
  writeText: (filePath: string, content: string) => Promise<void>;
  resolvePath: (filePath: string) => string;
}

const defaultIO: CliIO = {
  stdout: (text) => {
    process.stdout.write(text.endsWith('\n') ? text : `${text}\n`);
  },
  stderr: (text) => {
    process.stderr.write(text.endsWith('\n') ? text : `${text}\n`);
  },
  readText: (filePath) => readFile(filePath, 'utf8'),
  writeText: async (filePath, content) => {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, content, 'utf8');
  },
  resolvePath: (filePath) => resolve(process.cwd(), filePath),
};

function getHelpText(): string {
  return [
    'Supersubset CLI',
    '',
    'Commands:',
    '  supersubset import-schema --source-type <prisma|sql|json|dbt> --source <path-or-string> [--title <title>] [--id <id>] [--out <file>]',
    '  supersubset export-metadata --source-type <prisma|sql|json|dbt> --source <path-or-string> [--out <file>]',
    '',
    'Examples:',
    '  supersubset export-metadata --source-type json --source ./metadata.json --out ./supersubset-metadata.json',
    '  supersubset import-schema --source-type prisma --source ./schema.prisma --title "Orders" --out ./dashboard.json',
  ].join('\n');
}

function parseArgs(argv: string[]): { command?: string; flags: Record<string, string> } {
  const [command, ...rest] = argv;
  const flags: Record<string, string> = {};

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token) {
      continue;
    }

    if (token === '--help' || token === '-h') {
      flags.help = 'true';
      continue;
    }

    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const value = rest[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${token}`);
    }

    flags[token.slice(2)] = value;
    index += 1;
  }

  return { command, flags };
}

function readSourceType(value: string | undefined): SupportedSourceType {
  if (value === 'prisma' || value === 'sql' || value === 'json' || value === 'dbt') {
    return value;
  }

  throw new Error('Expected --source-type to be one of prisma, sql, json, or dbt');
}

async function loadSourceValue(sourceArg: string | undefined, io: CliIO): Promise<string> {
  if (!sourceArg) {
    throw new Error('Missing required flag: --source');
  }

  const resolvedPath = io.resolvePath(sourceArg);
  try {
    return await io.readText(resolvedPath);
  } catch {
    return sourceArg;
  }
}

async function handleImportSchema(flags: Record<string, string>, io: CliIO): Promise<void> {
  const sourceType = readSourceType(flags['source-type']);
  const source = await loadSourceValue(flags.source, io);
  const result = await importSchema({
    sourceType,
    source,
    title: flags.title,
    id: flags.id,
  });
  const output = JSON.stringify(result.dashboard, null, 2);

  if (flags.out) {
    await io.writeText(io.resolvePath(flags.out), output);
    io.stdout(`Wrote dashboard JSON to ${flags.out}`);
    return;
  }

  io.stdout(output);
}

async function handleExportMetadata(flags: Record<string, string>, io: CliIO): Promise<void> {
  const sourceType = readSourceType(flags['source-type']);
  const source = await loadSourceValue(flags.source, io);
  const result = await exportMetadata({
    sourceType,
    source,
  });
  const output = JSON.stringify(createExportMetadataEnvelope(result.datasets), null, 2);

  if (flags.out) {
    await io.writeText(io.resolvePath(flags.out), output);
    io.stdout(`Wrote metadata JSON to ${flags.out}`);
    return;
  }

  io.stdout(output);
}

export async function runCli(argv: string[], io: CliIO = defaultIO): Promise<number> {
  try {
    const { command, flags } = parseArgs(argv);

    if (!command || flags.help) {
      io.stdout(getHelpText());
      return 0;
    }

    if (command === 'import-schema') {
      await handleImportSchema(flags, io);
      return 0;
    }

    if (command === 'export-metadata') {
      await handleExportMetadata(flags, io);
      return 0;
    }

    throw new Error(`Unknown command: ${command}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected CLI error';
    io.stderr(message);
    io.stderr('');
    io.stderr(getHelpText());
    return 1;
  }
}
