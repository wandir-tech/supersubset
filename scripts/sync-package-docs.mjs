#!/usr/bin/env node
// Copies root LICENSE, NOTICE, and README.md into every publishable package
// so the npm tarball ships complete legal + docs context.
// Called automatically by the root `release` script before publish.
import { copyFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PKG_ROOT = 'packages';
const ROOT_FILES = ['LICENSE', 'NOTICE', 'README.md'];
const SKIP = new Set(['dev-app', 'docs']);

const dirs = readdirSync(PKG_ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !SKIP.has(d.name))
  .map((d) => d.name)
  .filter((name) => existsSync(join(PKG_ROOT, name, 'package.json')));

for (const dir of dirs) {
  for (const f of ROOT_FILES) {
    copyFileSync(f, join(PKG_ROOT, dir, f));
  }
}
