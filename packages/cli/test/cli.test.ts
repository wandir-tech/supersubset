import { describe, expect, it } from 'vitest';

import { runCli, type CliIO } from '../src/cli.js';

function createMockIo(initialFiles: Record<string, string> = {}): {
  io: CliIO;
  writes: Map<string, string>;
  stdout: string[];
  stderr: string[];
} {
  const files = new Map(Object.entries(initialFiles));
  const writes = new Map<string, string>();
  const stdout: string[] = [];
  const stderr: string[] = [];

  return {
    io: {
      stdout: (text) => {
        stdout.push(text);
      },
      stderr: (text) => {
        stderr.push(text);
      },
      readText: async (filePath) => {
        const value = files.get(filePath);
        if (value === undefined) {
          throw new Error('ENOENT');
        }
        return value;
      },
      writeText: async (filePath, content) => {
        writes.set(filePath, content);
      },
      resolvePath: (filePath) => `/cwd/${filePath.replace(/^\.\//, '')}`,
    },
    writes,
    stdout,
    stderr,
  };
}

describe('runCli', () => {
  it('writes exported metadata JSON to an output file', async () => {
    const { io, writes, stdout } = createMockIo({
      '/cwd/metadata.json': JSON.stringify([
        {
          id: 'orders',
          label: 'Orders',
          fields: [{ id: 'revenue', dataType: 'number' }],
        },
      ]),
    });

    const exitCode = await runCli(
      [
        'export-metadata',
        '--source-type',
        'json',
        '--source',
        './metadata.json',
        '--out',
        './normalized.json',
      ],
      io,
    );

    expect(exitCode).toBe(0);
    expect(stdout[0]).toContain('Wrote metadata JSON');
    expect(JSON.parse(writes.get('/cwd/normalized.json') ?? '{}')).toEqual({
      datasets: [
        {
          id: 'orders',
          label: 'Orders',
          fields: [
            {
              id: 'revenue',
              label: 'Revenue',
              dataType: 'number',
              role: 'measure',
              defaultAggregation: 'sum',
            },
          ],
        },
      ],
    });
  });

  it('prints help text for missing command', async () => {
    const { io, stdout } = createMockIo();

    const exitCode = await runCli([], io);

    expect(exitCode).toBe(0);
    expect(stdout.join('\n')).toContain('Supersubset CLI');
    expect(stdout.join('\n')).toContain('export-metadata');
  });

  it('returns a non-zero exit code for unknown commands', async () => {
    const { io, stderr } = createMockIo();

    const exitCode = await runCli(['wat'], io);

    expect(exitCode).toBe(1);
    expect(stderr.join('\n')).toContain('Unknown command: wat');
  });
});
