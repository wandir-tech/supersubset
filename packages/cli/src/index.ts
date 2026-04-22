#!/usr/bin/env node

export {
  importSchema,
  type ImportSchemaOptions,
  type ImportSchemaResult,
} from './import-schema.js';
export {
  exportMetadata,
  createExportMetadataEnvelope,
  type ExportMetadataOptions,
  type ExportMetadataResult,
  type ExportMetadataEnvelope,
} from './export-metadata.js';
export { runCli, type CliIO } from './cli.js';

import { fileURLToPath } from 'node:url';

import { runCli } from './cli.js';

const entryPath = process.argv[1];
const currentFilePath = fileURLToPath(import.meta.url);

if (entryPath && currentFilePath === entryPath) {
  void runCli(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
